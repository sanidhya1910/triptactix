import type { ItineraryRequest } from '@/types/itinerary';
import { jsonrepair } from 'jsonrepair';
import { toISODate } from '@/lib/dates';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface EnhancedItineraryRequest extends ItineraryRequest {
  includeFlight: boolean;
  flightSource?: string;
  flightBudget?: {
    outbound: number;
    return: number;
  };
  hotelBudget?: {
    budget: number;
    midRange: number;
    luxury: number;
  };
  specificInterests?: string[];
  groupType?: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  fitnessLevel?: 'low' | 'moderate' | 'high';
  dietaryRestrictions?: string[];
}

export interface GeneratedItinerary {
  destination: string;
  duration: number;
  overview: string;
  highlights: string[];
  days: Array<{
    day: number;
    date: string;
    theme: string;
    activities: Array<{
      time: string;
      title: string;
      description: string;
      location: string;
      duration: string;
      estimatedCost: number;
      category: 'sightseeing' | 'food' | 'activity' | 'transport' | 'accommodation' | 'shopping' | 'culture' | 'adventure';
      tips: string[];
    }>;
    meals: Array<{
      time: string;
      restaurant: string;
      cuisine: string;
      estimatedCost: number;
      speciality: string;
    }>;
    estimatedDailyCost: number;
  }>;
  transportation: {
    flights?: {
      outbound: {
        estimatedCost: number;
        tips: string[];
      };
      return: {
        estimatedCost: number;
        tips: string[];
      };
    };
    local: {
      recommendations: string[];
      estimatedDailyCost: number;
    };
  };
  accommodation: {
    type: string;
    recommendations: Array<{
      name: string;
      area: string;
      estimatedCostPerNight: number;
      pricePerNight?: number;
      totalPrice?: number;
      rating?: number;
      amenities: string[];
      reason: string;
    }>;
  };
  budgetBreakdown: {
    flights?: number;
    accommodation: number;
    activities: number;
    food: number;
    transportation: number;
    miscellaneous: number;
    total: number;
  };
  tips: {
    general: string[];
    budgetSaving: string[];
    cultural: string[];
    safety: string[];
  };
  bestTimeToVisit: {
    weather: string;
    crowds: string;
    prices: string;
  };
  isFallback?: boolean;
  fallbackReason?: string;
  debugRawResponse?: string;
}

type BudgetKey = 'budget' | 'mid-range' | 'luxury';

interface BudgetGuide {
  key: BudgetKey;
  label: string;
  descriptorNames: [string, string, string];
  reasonPhrases: [string, string, string];
  signatureAmenities: [string, string, string];
  nightlyMin: number;
  nightlyMax: number;
  nightlyStep: number;
  defaultNightly: number;
}

type AccommodationRecommendation = GeneratedItinerary['accommodation']['recommendations'][number];
type AccommodationRecommendationInput = Partial<AccommodationRecommendation>;
type GeneratedDay = GeneratedItinerary['days'][number];
type GeneratedActivity = GeneratedDay['activities'][number];
type GeneratedMeal = GeneratedDay['meals'][number];
type ItineraryDraft = Partial<GeneratedItinerary> & {
  destination: string;
  days: GeneratedDay[];
};
type TransportationInfo = GeneratedItinerary['transportation'];
type BudgetBreakdown = GeneratedItinerary['budgetBreakdown'];
type PerplexityConversationTurn = { role: 'user' | 'assistant'; content: string };
type PerplexityMessagePart = string | { type?: string; text?: string | string[]; content?: string };
type PerplexityMessageContent = string | PerplexityMessagePart[] | { text?: string | string[]; content?: string };

const ACTIVITY_CATEGORIES: GeneratedActivity['category'][] = [
  'sightseeing',
  'food',
  'activity',
  'transport',
  'accommodation',
  'shopping',
  'culture',
  'adventure'
];

interface PerplexityResponse {
  choices?: Array<{
    message?: {
      content?: PerplexityMessageContent;
    };
  }>;
}

/**
 * Why an itinerary could not be generated. The route turns these into honest states
 * for the page; nothing here substitutes a template itinerary any more.
 */
export class ItineraryError extends Error {
  constructor(
    public code: 'ai_unavailable' | 'ai_busy' | 'ai_timeout' | 'ai_failed',
    message: string,
  ) {
    super(message);
    this.name = 'ItineraryError';
  }
}

/** Read per call: on Workers the environment is filled in per request, not at import. */
export const isAIConfigured = () => Boolean(process.env.PERPLEXITY_API_KEY?.trim());

export class PerplexityItineraryService {
  // Rate limiting tracking
  private static lastRequestTime = 0;
  private static requestCount = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  private static readonly MAX_REQUESTS_PER_MINUTE = 30; // Perplexity safe default
  // One attempt with a hard cap. Two 90-second attempts plus a reformat call could keep
  // a request open for over three minutes, long past when anyone is still waiting.
  private static readonly MAX_PERPLEXITY_ATTEMPTS = 1;
  private static readonly DEFAULT_TIMEOUT_MS = 50000;

  async generateEnhancedItinerary(request: EnhancedItineraryRequest): Promise<GeneratedItinerary> {
    if (!isAIConfigured()) {
      throw new ItineraryError('ai_unavailable', 'AI itineraries aren’t connected yet.');
    }
    if (!this.canMakeRequest()) {
      throw new ItineraryError('ai_busy', 'Too many itineraries were requested just now. Try again in a minute.');
    }

    const prompt = this.buildEnhancedPrompt(request);
    this.updateRequestCounters();
    const tripDays = this.calculateTripDays(request.startDate, request.endDate);
    // Each day needs roughly 600 to 800 tokens, plus about 500 for the rest.
    const maxTokens = Math.min(4000, 1000 + tripDays * 700);

    let responseText: string;
    try {
      responseText = await this.callPerplexity(prompt, 1, undefined, { maxTokens, temperature: 0.3, topP: 0.9 });
    } catch (error) {
      if (this.isRateLimitError(error)) {
        throw new ItineraryError('ai_busy', 'The AI service is busy right now. Try again in a minute.');
      }
      if (error instanceof Error && /abort|timed? ?out/i.test(`${error.name} ${error.message}`)) {
        throw new ItineraryError('ai_timeout', 'The AI took too long to answer. Try again, or plan fewer days.');
      }
      throw new ItineraryError('ai_failed', 'The AI service didn’t respond. Try again in a moment.');
    }

    let itineraryData: unknown;
    try {
      itineraryData = JSON.parse(responseText);
    } catch {
      try {
        itineraryData = this.extractAndCleanJSON(responseText);
      } catch {
        throw new ItineraryError('ai_failed', 'The AI returned an itinerary we could not read. Try again.');
      }
    }
    return this.validateAndProcessEnhancedItinerary(itineraryData, request, responseText);
  }

  private getBudgetGuidelines(budget: string): BudgetGuide {
    const guides: Record<BudgetKey, BudgetGuide> = {
      budget: {
        key: 'budget',
        label: 'budget-friendly',
        descriptorNames: ['Comfortable', 'Smart Value', 'Boutique Budget'],
        reasonPhrases: ['Affordable comfort', 'Value-focused stay', 'Smart base camp'],
        signatureAmenities: ['Complimentary breakfast', 'Rooftop lounge', 'Airport shuttle'],
        nightlyMin: 2500,
        nightlyMax: 6000,
        nightlyStep: 800,
        defaultNightly: 4200
      },
      'mid-range': {
        key: 'mid-range',
        label: 'mid-range premium',
        descriptorNames: ['Stylish', 'Business-Friendly', 'Boutique Premium'],
        reasonPhrases: ['Stylish comfort with great reviews', 'Balanced amenities for business and leisure', 'Premium touches without breaking the bank'],
        signatureAmenities: ['Rooftop pool', 'Executive lounge access', 'Wellness spa'],
        nightlyMin: 6500,
        nightlyMax: 12500,
        nightlyStep: 1500,
        defaultNightly: 9000
      },
      luxury: {
        key: 'luxury',
        label: 'luxury and premium',
        descriptorNames: ['Five-Star Luxury', 'Boutique Luxury', 'Palatial Luxury'],
        reasonPhrases: ['Ultra-luxury suite experience', 'Premium boutique indulgence', 'Palatial high-end escape'],
        signatureAmenities: ['Butler service', 'Infinity pool', 'Private spa'],
        nightlyMin: 12000,
        nightlyMax: 25000,
        nightlyStep: 3000,
        defaultNightly: 16000
      }
    };

    const normalized = (['budget', 'mid-range', 'luxury'].includes(budget)
      ? (budget as BudgetKey)
      : 'mid-range');

    return guides[normalized];
  }


  private sleep(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  private isItineraryDraft(value: unknown): value is ItineraryDraft {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<GeneratedItinerary>;
    return typeof candidate.destination === 'string' && Array.isArray(candidate.days);
  }

  private normalizeStringArray(source: unknown, fallback: string[], minLength = 0): string[] {
    if (Array.isArray(source)) {
      const cleaned = source
        .map((item) => (typeof item === 'string' ? item : String(item ?? '')).trim())
        .filter((item) => item.length > 0);

      if (cleaned.length >= minLength) {
        return cleaned;
      }
    }

    const cleanedFallback = fallback
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (cleanedFallback.length >= minLength || fallback.length > 0) {
      return cleanedFallback;
    }

    return Array.isArray(source)
      ? source
          .map((item) => (typeof item === 'string' ? item : String(item ?? '')).trim())
          .filter((item) => item.length > 0)
      : [];
  }

  private getValidActivityCategory(
    category: unknown,
    fallback: GeneratedActivity['category']
  ): GeneratedActivity['category'] {
    if (typeof category === 'string') {
      const normalized = category.toLowerCase() as GeneratedActivity['category'];
      if (ACTIVITY_CATEGORIES.includes(normalized)) {
        return normalized;
      }
    }

    return fallback;
  }


  /**
   * Day N is the start date plus N, as a local calendar date. The model's own date is
   * ignored: it can only agree with this or be wrong. This used toISOString, which turns
   * local midnight into the previous day in India, so every day was dated a day early.
   */
  private normalizeDayDate(_rawDate: unknown, sequentialDate: Date): string {
    return toISODate(sequentialDate);
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - PerplexityItineraryService.lastRequestTime;
    
    // Reset minute counter if a minute has passed
    if (timeSinceLastRequest > 60000) { // 1 minute
      PerplexityItineraryService.requestCount = 0;
    }
    
    // Check if we've exceeded limits
    if (PerplexityItineraryService.requestCount >= PerplexityItineraryService.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    if (timeSinceLastRequest < PerplexityItineraryService.MIN_REQUEST_INTERVAL) {
      return false;
    }
    
    return true;
  }
  
  private updateRequestCounters(): void {
    PerplexityItineraryService.lastRequestTime = Date.now();
    PerplexityItineraryService.requestCount += 1;
  }
  
  private isRateLimitError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    const status = typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: number }).status
      : undefined;

    if (status === 429) {
      return true;
    }

    const message = typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : '';

    if (!message) {
      return false;
    }

    const normalized = message.toLowerCase();
    return normalized.includes('429') ||
      normalized.includes('too many requests') ||
      normalized.includes('rate limit') ||
      normalized.includes('rate_limit_exceeded');
  }

  private containsLikelyJSON(content: string): boolean {
    if (!content) {
      return false;
    }

    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.includes('}')) || (trimmed.startsWith('[') && trimmed.includes(']'))) {
      return true;
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    return firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
  }

  private sanitizePerplexityContent(content: string): string {
    if (!content) {
      return content;
    }

    let sanitized = content
      // Remove <think>...</think> and similar diagnostic tags
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```thought[\s\S]*?```/gi, '')
      // Trim leading explanatory prose before JSON braces
      .replace(/^[^\[{]*(?=[\[{])/, '')
      // Remove zero-width and BOM characters that break JSON parsing
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    const closingIndex = Math.max(sanitized.lastIndexOf('}'), sanitized.lastIndexOf(']'));
    if (closingIndex >= 0) {
      sanitized = sanitized.slice(0, closingIndex + 1);
    }

    return sanitized.trim();
  }

  private getTextFromMessagePart(part: PerplexityMessagePart | undefined): string {
    if (typeof part === 'string') {
      return part;
    }

    if (!part) {
      return '';
    }

    if (typeof part.text === 'string') {
      return part.text;
    }

    if (Array.isArray(part.text)) {
      return part.text.filter((segment) => typeof segment === 'string').join('\n');
    }

    if (typeof part.content === 'string') {
      return part.content;
    }

    return '';
  }

  private async callPerplexity(
    prompt: string,
    attempt = 1,
    conversation?: PerplexityConversationTurn[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    }
  ): Promise<string> {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const timeoutEnv = Number(process.env.PERPLEXITY_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(timeoutEnv) && timeoutEnv > 1000
      ? Math.min(Math.max(timeoutEnv, 15000), 180000)
      : PerplexityItineraryService.DEFAULT_TIMEOUT_MS;

    const systemPrompt = 'You are an expert travel planner. Reply with a single valid JSON object only. No markdown, no commentary, no code fences.';

    const model = (process.env.PERPLEXITY_MODEL?.trim() || 'sonar-pro');
    const maxTokens = options?.maxTokens ?? 3000;
    const temperature = options?.temperature ?? 0.3;
    const topP = options?.topP ?? 0.9;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...(conversation ?? []),
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          frequency_penalty: 0.1,
          presence_penalty: 0.0,
          response_format: {
            type: 'text'
          },
          return_related_questions: false,
          return_citations: false,
          return_thoughts: false
        }),
        signal: controller.signal
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        if (attempt < PerplexityItineraryService.MAX_PERPLEXITY_ATTEMPTS) {
          const backoff = 2000 * attempt;
          await this.sleep(backoff);
          return this.callPerplexity(prompt, attempt + 1, conversation, options);
        }
        throw new Error(`Perplexity request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorBody}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as PerplexityResponse;
    const messageContent = data?.choices?.[0]?.message?.content;
    if (process.env.NODE_ENV !== 'production') {
      try {
      } catch {
      }
    }

    if (!messageContent) {
      throw new Error('Perplexity API returned empty response');
    }

    if (Array.isArray(messageContent)) {
      const combined = messageContent
        .map((part) => this.getTextFromMessagePart(part))
        .filter((segment) => segment.length > 0)
        .join('\n');

      return this.sanitizePerplexityContent(combined);
    }

    if (typeof messageContent === 'string') {
      return this.sanitizePerplexityContent(messageContent);
    }

    const extracted = this.getTextFromMessagePart(messageContent as PerplexityMessagePart);
    if (extracted.length > 0) {
      return this.sanitizePerplexityContent(extracted);
    }

    return this.sanitizePerplexityContent(JSON.stringify(messageContent));
  }

  private extractAndCleanJSON(responseText: string): unknown {
    const sanitizedResponse = this.sanitizePerplexityContent(responseText);
    const workingText = sanitizedResponse && sanitizedResponse.length > 0 ? sanitizedResponse : responseText;

    // Step 1: Try extracting JSON from markdown code blocks
    let jsonText = '';
    
    // Look for JSON in markdown code blocks
    const codeBlockMatch = workingText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = this.extractBalancedJsonStructure(codeBlockMatch[1]) ?? codeBlockMatch[1];
    } else {
      // Look for JSON object pattern
      const balanced = this.extractBalancedJsonStructure(workingText);
      if (balanced) {
        jsonText = balanced;
      } else {
        if (process.env.NODE_ENV !== 'production') {
        }
        jsonText = workingText;
      }
    }

    // Step 2: Clean the JSON text
    jsonText = this.cleanJSONString(jsonText);

    if (process.env.NODE_ENV !== 'production') {
      const preview = jsonText.slice(0, 200);
      const charCodes = preview.split('').map((char) => char.charCodeAt(0));
    }

    // Step 3: Attempt to parse with progressively more aggressive fixes
    const singleQuotedKeys = jsonText
      // Handles both straight and smart single quotes that survived normalization
      .replace(/(['\u2018\u2019])([A-Za-z0-9_]+)\1\s*:/g, '"$2":');
    const singleQuotedValues = singleQuotedKeys
      .replace(/:\s*'([^'\n\r]*?)'/g, ':"$1"');

    const parseAttempts = [
      // Original cleaned text
      jsonText,
      // Fix common trailing comma issues
      jsonText.replace(/,(\s*[}\]])/g, '$1'),
      // Fix missing quotes around keys without altering quoted names
      jsonText.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'),
      // Replace lingering single-quoted keys and safe values
      singleQuotedKeys,
      singleQuotedValues,
      // Fix single quotes to double quotes for any remaining cases
      jsonText.replace(/'/g, '"'),
      // Remove comments
      jsonText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
    ];

    for (let i = 0; i < parseAttempts.length; i++) {
      try {
        return JSON.parse(parseAttempts[i]);
      } catch (error) {
        if (i === parseAttempts.length - 1) {
          const repairSources = [jsonText, singleQuotedValues, workingText];
          for (const source of repairSources) {
            try {
              const repaired = jsonrepair(source);
              return JSON.parse(repaired);
            } catch (repairError) {
            }
          }
          return this.tryAggressiveJSONExtraction(workingText);
        }
      }
    }

    throw new Error('All JSON parsing attempts failed');
  }

  private cleanJSONString(jsonText: string): string {
    const normalized = jsonText
      // Normalize smart quotes to straight quotes before other cleanup
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      .replace(/[\uFEFF\u200B-\u200D\u00AD]/g, '')
      .trim()
      // Remove any leading/trailing non-JSON characters
      .replace(/^[^{[]*/, '')
      .replace(/[^}\]]*$/, '');

    return this.escapeControlCharactersInStrings(normalized);
  }

  private escapeControlCharactersInStrings(json: string): string {
    let result = '';
    let inString = false;
    let escaping = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escaping) {
        result += char;
        escaping = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escaping = true;
        continue;
      }

      if (char === '"') {
        result += char;
        inString = !inString;
        continue;
      }

      if (inString) {
        if (char === '\n') {
          result += '\\n';
          continue;
        }
        if (char === '\r') {
          result += '\\r';
          continue;
        }
        if (char === '\t') {
          result += '\\t';
          continue;
        }
      }

      result += char;
    }

    return result;
  }

  private extractBalancedJsonStructure(source: string): string | null {
    if (!source) {
      return null;
    }

    const pairs: Record<string, string> = {
      '{': '}',
      '[': ']'
    };

    const openers = new Set(Object.keys(pairs));
    const closers = new Set(Object.values(pairs));

    let startIndex = -1;
    const stack: string[] = [];
    let inString = false;
    let escaping = false;

    for (let i = 0; i < source.length; i++) {
      const char = source[i];

      if (startIndex === -1) {
        if (openers.has(char)) {
          startIndex = i;
          stack.push(char);
          continue;
        }
        continue;
      }

      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === '\\') {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (openers.has(char)) {
        stack.push(char);
        continue;
      }

      if (closers.has(char)) {
        const lastOpener = stack.pop();
        if (!lastOpener || pairs[lastOpener] !== char) {
          // Mismatched braces; abort and return null to trigger other strategies
          return null;
        }

        if (stack.length === 0) {
          return source.slice(startIndex, i + 1);
        }
      }
    }

    return null;
  }

  private tryAggressiveJSONExtraction(responseText: string): unknown {
    const sanitized = this.sanitizePerplexityContent(responseText);
    const sourceText = sanitized && sanitized.length > 0 ? sanitized : responseText;
    
    try {
      // Try to find and parse just the structure we need
      const structureMatch = sourceText.match(/\{[\s\S]*"days"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
      if (structureMatch) {
        let extracted = structureMatch[0];
        
        // Clean up the extracted JSON more aggressively
        extracted = extracted
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote keys
          .replace(/:\s*'([^']*?)'/g, ': "$1"') // Single to double quotes for values
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
          .replace(/\/\/.*$/gm, ''); // Remove line comments
        
        return JSON.parse(extracted);
      }
    } catch (error) {
    }
    
    // Final fallback: create minimal valid structure
    throw new Error('Could not extract valid JSON structure from response');
  }

  private buildEnhancedPrompt(request: EnhancedItineraryRequest): string {
    // Validate and calculate duration safely
    const startDateObj = new Date(request.startDate);
    const endDateObj = new Date(request.endDate);
    
    // Check if dates are valid
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error(`Invalid date format - startDate: ${request.startDate}, endDate: ${request.endDate}`);
    }
    
    // Calculate inclusive days (e.g., Oct 24-27 = 4 days including both start and end)
    const duration = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Ensure duration is positive
    if (duration < 1) {
      throw new Error(`Invalid duration: end date is before start date - startDate: ${request.startDate}, endDate: ${request.endDate}`);
    }
    
    const budgetGuide = this.getBudgetGuidelines(request.budget);
    const budgetKey = request.budget === 'mid-range' ? 'midRange' : request.budget;
    const nightlyBudget = request.hotelBudget?.[budgetKey as keyof NonNullable<typeof request.hotelBudget>] ?? budgetGuide.defaultNightly;

    return `Create a complete ${duration}-day travel itinerary for ${request.destination}. Return ONLY valid JSON, no markdown, no code blocks.

**Trip Details:**
- Duration: ${duration} days (${request.startDate} to ${request.endDate})
- Travelers: ${request.travelers} ${request.groupType || 'travelers'}
- Budget: ${request.budget} (hotel budget around ₹${nightlyBudget}/night)
- Accommodation: ${request.accommodationType || 'hotel'}
- Interests: ${request.interests?.join(', ') || 'general sightseeing'}
- Travel Style: ${request.travelStyle || 'cultural'}
${request.includeFlight ? `- Include flights from ${request.flightSource || 'major city'}` : ''}

**Required JSON Structure:**
\`\`\`json
{
  "destination": "${request.destination}",
  "duration": ${duration},
  "overview": "Brief trip overview (2-3 sentences)",
  "highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4"],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Detailed description",
          "location": "Specific location",
          "duration": "2 hours",
          "estimatedCost": 1500,
          "category": "sightseeing",
          "tips": ["tip 1", "tip 2"]
        }
      ],
      "meals": [
        {
          "time": "13:00",
          "restaurant": "Restaurant name",
          "cuisine": "Cuisine type",
          "estimatedCost": 800,
          "speciality": "Signature dish"
        }
      ],
      "estimatedDailyCost": 5000
    }
  ],
  "transportation": {
    "local": {
      "recommendations": ["option 1", "option 2", "option 3"],
      "estimatedDailyCost": 500
    }${request.includeFlight ? `,
    "flights": {
      "outbound": {"estimatedCost": 8000, "tips": ["tip1", "tip2", "tip3"]},
      "return": {"estimatedCost": 7000, "tips": ["tip1", "tip2", "tip3"]}
    }` : ''}
  },
  "accommodation": {
    "type": "${request.accommodationType || 'hotel'}",
    "recommendations": [
      {
        "name": "Hotel name",
        "area": "Location area",
        "estimatedCostPerNight": ${nightlyBudget},
        "pricePerNight": ${nightlyBudget},
        "totalPrice": ${nightlyBudget * Math.max(0, duration - 1)},
        "rating": 4.5,
        "amenities": ["WiFi", "Breakfast", "Pool", "Gym"],
        "reason": "Why this hotel"
      }
    ]
  },
  "budgetBreakdown": {
    ${request.includeFlight ? '"flights": 15000,' : ''}
    "accommodation": ${nightlyBudget * Math.max(0, duration - 1)},
    "activities": 10000,
    "food": 5000,
    "transportation": 2000,
    "miscellaneous": 2000,
    "total": ${request.includeFlight ? '34000' : '19000'}
  },
  "tips": {
    "general": ["tip1", "tip2", "tip3"],
    "budgetSaving": ["tip1", "tip2", "tip3"],
    "cultural": ["tip1", "tip2", "tip3"],
    "safety": ["tip1", "tip2", "tip3"]
  },
  "bestTimeToVisit": {
    "weather": "Weather info",
    "crowds": "Crowd info",
    "prices": "Price info"
  }
}
\`\`\`

**CRITICAL REQUIREMENTS:**
1. Generate ALL ${duration} days - do not skip any days
2. Each day must have 3-5 activities with realistic times (morning to evening)
3. Include 2-3 meals per day (lunch and dinner minimum)
4. Provide 3 real hotel recommendations with actual names and areas in ${request.destination}
5. All costs in INR for ${request.travelers} traveler(s)
6. Use real places, restaurants, and attractions in ${request.destination}
7. Activities must match interests: ${request.interests?.join(', ') || 'general'}
8. Hotel budget range: ₹${budgetGuide.nightlyMin}-₹${budgetGuide.nightlyMax} per night
9. Return ONLY the JSON object, no explanations or markdown
`;
  }

  /**
   * Turns the model's JSON into a GeneratedItinerary using only what the model said.
   *
   * This used to pad thin answers with template activities, meals and hotels ("Local
   * Lunch Spot", "Comfortable stay in X"), clamp hotel prices into a budget band, raise
   * every rating to at least 3.8, and still mark the result as not a fallback. Now a
   * missing value stays missing (or zero, for a cost), and an answer with no usable days
   * is an error rather than something to fill in.
   */
  private validateAndProcessEnhancedItinerary(
    itineraryInput: unknown,
    request: EnhancedItineraryRequest,
    rawResponse?: string
  ): GeneratedItinerary {
    if (!this.isItineraryDraft(itineraryInput)) {
      throw new ItineraryError('ai_failed', 'The AI returned an itinerary we could not read.');
    }
    const draft = itineraryInput as ItineraryDraft;
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
    const cost = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0);

    const parsedStart = new Date(`${request.startDate}T00:00:00`);
    const startDate = Number.isNaN(parsedStart.getTime()) ? new Date() : parsedStart;

    const days: GeneratedDay[] = draft.days
      .map((dayDraft, index): GeneratedDay | null => {
        const activities: GeneratedActivity[] = (Array.isArray(dayDraft.activities) ? dayDraft.activities : [])
          .map((raw) => raw as Partial<GeneratedActivity>)
          .filter((a) => text(a.title))
          .slice(0, 8)
          .map((a) => ({
            time: text(a.time),
            title: text(a.title),
            description: text(a.description),
            location: text(a.location),
            duration: typeof a.duration === 'number' ? `${a.duration} min` : text(a.duration),
            estimatedCost: cost(a.estimatedCost),
            category: this.getValidActivityCategory(a.category, 'activity'),
            tips: this.normalizeStringArray(a.tips, [], 0),
          }));
        const meals: GeneratedMeal[] = (Array.isArray(dayDraft.meals) ? dayDraft.meals : [])
          .map((raw) => raw as Partial<GeneratedMeal>)
          .filter((m) => text(m.restaurant))
          .slice(0, 4)
          .map((m) => ({
            time: text(m.time),
            restaurant: text(m.restaurant),
            cuisine: text(m.cuisine),
            estimatedCost: cost(m.estimatedCost),
            speciality: text(m.speciality),
          }));
        if (activities.length === 0 && meals.length === 0) return null;
        const itemsTotal = [...activities, ...meals].reduce((s, x) => s + x.estimatedCost, 0);
        const sequential = new Date(startDate);
        sequential.setDate(sequential.getDate() + index);
        return {
          day: index + 1,
          date: this.normalizeDayDate(dayDraft.date, sequential),
          theme: text(dayDraft.theme) || `Day ${index + 1}`,
          activities,
          meals,
          // The day's own items are the reliable figure; the model's daily total often isn't.
          estimatedDailyCost: itemsTotal || cost(dayDraft.estimatedDailyCost),
        };
      })
      .filter((d): d is GeneratedDay => d !== null);

    if (days.length === 0) {
      throw new ItineraryError('ai_failed', 'The AI returned an itinerary with no usable days.');
    }

    // Nights, not days: a three-day trip is two nights.
    const nights = Math.max(0, days.length - 1);
    const recommendations: AccommodationRecommendation[] = (
      Array.isArray(draft.accommodation?.recommendations) ? draft.accommodation.recommendations : []
    )
      .map((raw) => raw as AccommodationRecommendationInput)
      .filter((r) => text(r.name))
      .slice(0, 3)
      .map((r) => {
        const nightly = cost(r.pricePerNight) || cost(r.estimatedCostPerNight);
        const rating = typeof r.rating === 'number' && r.rating > 0 && r.rating <= 5 ? r.rating : undefined;
        return {
          name: text(r.name),
          area: text(r.area),
          estimatedCostPerNight: nightly,
          pricePerNight: nightly,
          totalPrice: nightly * nights,
          rating,
          amenities: Array.isArray(r.amenities) ? r.amenities.filter((x): x is string => typeof x === 'string').slice(0, 6) : [],
          reason: text(r.reason),
        };
      });
    const accommodation = { type: text(draft.accommodation?.type) || (request.accommodationType ?? 'hotel'), recommendations };

    const t = draft.transportation;
    const transportation: TransportationInfo = {
      local: {
        recommendations: this.normalizeStringArray(t?.local?.recommendations, [], 0),
        estimatedDailyCost: cost(t?.local?.estimatedDailyCost),
      },
    };
    // Flights come from the fare model when it is connected (request.flightBudget), and
    // otherwise from the model's own estimate, if it gave one.
    const out = request.flightBudget?.outbound ?? cost(t?.flights?.outbound?.estimatedCost);
    const back = request.flightBudget?.return ?? cost(t?.flights?.return?.estimatedCost);
    if (request.includeFlight && (out || back)) {
      transportation.flights = {
        outbound: { estimatedCost: out, tips: this.normalizeStringArray(t?.flights?.outbound?.tips, [], 0) },
        return: { estimatedCost: back, tips: this.normalizeStringArray(t?.flights?.return?.tips, [], 0) },
      };
    }

    const sumOf = (pick: (d: GeneratedDay) => number) => days.reduce((s, d) => s + pick(d), 0);
    const budgetBreakdown: BudgetBreakdown = {
      flights: transportation.flights ? out + back || undefined : undefined,
      accommodation: (recommendations[0]?.pricePerNight ?? 0) * nights,
      activities: sumOf((d) => d.activities.reduce((s, a) => s + a.estimatedCost, 0)),
      food: sumOf((d) => d.meals.reduce((s, m) => s + m.estimatedCost, 0)),
      transportation: transportation.local.estimatedDailyCost * days.length,
      miscellaneous: cost(draft.budgetBreakdown?.miscellaneous),
      total: 0,
    };
    budgetBreakdown.total =
      (budgetBreakdown.flights ?? 0) +
      budgetBreakdown.accommodation +
      budgetBreakdown.activities +
      budgetBreakdown.food +
      budgetBreakdown.transportation +
      budgetBreakdown.miscellaneous;

    const tips = draft.tips;
    return {
      destination: text(draft.destination) || request.destination,
      duration: days.length,
      overview: text(draft.overview),
      highlights: this.normalizeStringArray(draft.highlights, [], 0),
      days,
      transportation,
      accommodation,
      budgetBreakdown,
      tips: {
        general: this.normalizeStringArray(tips?.general, [], 0),
        budgetSaving: this.normalizeStringArray(tips?.budgetSaving, [], 0),
        cultural: this.normalizeStringArray(tips?.cultural, [], 0),
        safety: this.normalizeStringArray(tips?.safety, [], 0),
      },
      bestTimeToVisit: {
        weather: text(draft.bestTimeToVisit?.weather),
        crowds: text(draft.bestTimeToVisit?.crowds),
        prices: text(draft.bestTimeToVisit?.prices),
      },
      isFallback: false,
      debugRawResponse: process.env.NODE_ENV !== 'production' ? rawResponse : undefined,
    };
  }

  /** Days in the trip, counting both the first and the last day. Same-day trips are 1. */
  private calculateTripDays(startDate: string, endDate: string): number {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  }
}

export const perplexityItineraryService = new PerplexityItineraryService();
