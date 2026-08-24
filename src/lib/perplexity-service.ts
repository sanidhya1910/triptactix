import { 
  ItineraryRequest, 
  AIItineraryResponse, 
  Itinerary, 
  ItineraryDay 
} from '@/types/itinerary';
import { jsonrepair } from 'jsonrepair';

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
type LegacyActivityCategory = ItineraryDay['activities'][number]['category'];
type LegacyTimeSlot = ItineraryDay['activities'][number]['timeSlot'];
type LegacyMealType = ItineraryDay['meals'][number]['mealType'];
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

export class PerplexityItineraryService {
  // Rate limiting tracking
  private static lastRequestTime = 0;
  private static requestCount = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  private static readonly MAX_REQUESTS_PER_MINUTE = 30; // Perplexity safe default
  private static readonly MAX_PERPLEXITY_ATTEMPTS = 2;
  private static readonly DEFAULT_TIMEOUT_MS = 90000;

  async generateEnhancedItinerary(request: EnhancedItineraryRequest): Promise<GeneratedItinerary> {
    let rawResponse: string | undefined;
    try {
      // Check rate limiting
      if (!this.canMakeRequest()) {
        console.log('Rate limit reached, generating fallback itinerary...');
        return this.generateFallbackItinerary(request, 'Rate limit reached, serving curated template instead.');
      }

      const prompt = this.buildEnhancedPrompt(request);
      console.log('Generating enhanced itinerary with Perplexity...');
      
      // Update rate limiting counters
      this.updateRequestCounters();

  const tripDays = Math.max(1, this.calculateTripDays(request.startDate, request.endDate));
  // Significantly increase token limit to ensure all days are generated
  // Each day needs ~600-800 tokens, plus ~500 for metadata
  const maxTokens = Math.min(4000, 1000 + tripDays * 700);

  let responseText = await this.callPerplexity(prompt, 1, undefined, { maxTokens, temperature: 0.3, topP: 0.9 });
  rawResponse = responseText;
      console.log('Raw Perplexity response length:', responseText.length);

      if (!this.containsLikelyJSON(responseText)) {
        console.log('Perplexity response missing JSON structure, requesting reformat...');
        const followUpPrompt = 'Your previous response did not follow the JSON-only instruction. Respond again with the same itinerary as a single valid JSON object matching the requested schema. Do NOT include any explanations, bullet points, or commentary.';
        const reformatted = await this.callPerplexity(
          followUpPrompt,
          1,
          [
            { role: 'user', content: prompt },
            { role: 'assistant', content: responseText }
          ],
          { maxTokens: Math.max(maxTokens, 2000), temperature: 0.25, topP: 0.85 }
        );
        if (reformatted && reformatted.trim().length > 0) {
          responseText = reformatted;
          rawResponse = reformatted;
          console.log('Reformat attempt response length:', reformatted.length);
        }
      }
      
      // Parse the JSON response with enhanced error handling
      let itineraryData: unknown;
      try {
        // Try parsing direct JSON first
        itineraryData = JSON.parse(responseText);
      } catch (parseError) {
        console.log('Direct JSON parsing failed, attempting advanced extraction...', parseError);
        
        try {
          // Enhanced JSON extraction and cleaning
          itineraryData = this.extractAndCleanJSON(responseText);
        } catch (extractError) {
          console.error('Failed to extract valid JSON:', extractError);
          console.log('Raw response (first 1000 chars):', responseText.substring(0, 1000));
          console.log('Raw response (around position 5000):', responseText.substring(4900, 5100));
          throw new Error(`Failed to parse Perplexity response: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
        }
      }
      
      return this.validateAndProcessEnhancedItinerary(itineraryData, request, rawResponse);
      
    } catch (error) {
      console.error('Error generating enhanced itinerary with Perplexity:', error);
      
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        console.log('Rate limit error detected, generating fallback itinerary...');
        return this.generateFallbackItinerary(request, 'Perplexity rate limit exceeded, serving curated template instead.', rawResponse);
      }
      
      // For other errors, also provide fallback
      console.log('Perplexity error occurred, generating fallback itinerary...');
      return this.generateFallbackItinerary(
        request,
        error instanceof Error ? error.message : 'Perplexity error occurred, using smart template.',
        rawResponse
      );
    }
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

  private clampNightlyRate(rate: number, guide: BudgetGuide): number {
    const numeric = Number.isFinite(rate) ? Number(rate) : guide.defaultNightly;
    const rounded = Math.round(numeric);
    return Math.min(Math.max(rounded, guide.nightlyMin), guide.nightlyMax);
  }

  private normalizeAccommodationRecommendations(
    recommendations: AccommodationRecommendationInput[] | undefined,
    request: EnhancedItineraryRequest,
    guide: BudgetGuide,
    nights: number
  ): AccommodationRecommendation[] {
    const safeNights = Math.max(1, nights);
    const sourceList = Array.isArray(recommendations) ? recommendations : [];
    const totalRecommendations = Math.max(sourceList.length, 3);
    const normalized: AccommodationRecommendation[] = [];

    for (let index = 0; index < totalRecommendations; index++) {
      const source = sourceList[index];
      const descriptorIndex = index % guide.descriptorNames.length;
      const nightlyRate = this.clampNightlyRate(
        Number(source?.estimatedCostPerNight ?? source?.pricePerNight ?? guide.defaultNightly),
        guide
      );
      const totalPrice = Number(source?.totalPrice) > 0
        ? Math.round(Number(source.totalPrice))
        : nightlyRate * safeNights;
      const ratingRaw = Number(source?.rating);
      const rating = Number.isFinite(ratingRaw) && ratingRaw > 0
        ? Math.min(Math.max(ratingRaw, 3.8), 5)
        : guide.key === 'luxury' ? 4.7 : 4.3;
      const amenities = Array.isArray(source?.amenities) && source.amenities.length
        ? source.amenities.slice(0, 6)
        : ['WiFi', 'Breakfast', guide.signatureAmenities[descriptorIndex], 'City view'];

      let reason = typeof source?.reason === 'string' && source.reason.trim().length > 0
        ? source.reason.trim()
        : `${guide.reasonPhrases[descriptorIndex]} in ${request.destination}`;

      if (guide.key === 'luxury' && !reason.toLowerCase().includes('luxury')) {
        reason = `Luxury experience • ${reason}`;
      }

      const normalizedRecommendation: AccommodationRecommendation = {
        name: typeof source?.name === 'string' && source.name.trim().length > 0
          ? source.name.trim()
          : `${guide.descriptorNames[descriptorIndex]} stay in ${request.destination}`,
        area: typeof source?.area === 'string' && source.area.trim().length > 0
          ? source.area.trim()
          : `Prime area of ${request.destination}`,
        estimatedCostPerNight: nightlyRate,
        pricePerNight: nightlyRate,
        totalPrice,
        rating,
        amenities,
        reason
      };

      normalized.push(normalizedRecommendation);
    }

    return normalized.slice(0, 3);
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

  private mapToLegacyActivityCategory(category: GeneratedActivity['category']): LegacyActivityCategory {
    switch (category) {
      case 'sightseeing':
        return 'sightseeing';
      case 'adventure':
        return 'adventure';
      case 'culture':
        return 'cultural';
      case 'shopping':
        return 'shopping';
      case 'transport':
      case 'accommodation':
        return 'relaxation';
      case 'food':
      case 'activity':
      default:
        return 'entertainment';
    }
  }

  private getLegacyTimeSlot(index: number): LegacyTimeSlot {
    if (index === 0) {
      return 'morning';
    }

    if (index === 1) {
      return 'afternoon';
    }

    return 'evening';
  }

  private getLegacyMealType(index: number): LegacyMealType {
    if (index === 0) {
      return 'lunch';
    }

    if (index === 1) {
      return 'dinner';
    }

    return 'snack';
  }

  private normalizeDayDate(rawDate: unknown, sequentialDate: Date): string {
    const expected = sequentialDate.toISOString().split('T')[0];

    if (typeof rawDate !== 'string' || rawDate.trim().length === 0) {
      return expected;
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return expected;
    }

    const parsedISO = parsed.toISOString().split('T')[0];

    const timeDrift = Math.abs(parsed.getTime() - sequentialDate.getTime());
    const dayInMs = 24 * 60 * 60 * 1000;

    if (timeDrift > dayInMs) {
      return expected;
    }

    return parsedISO;
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
          console.log(`Perplexity timed out after ${timeoutMs}ms (attempt ${attempt}). Retrying in ${backoff}ms...`);
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
        console.log('Perplexity message content preview:', JSON.stringify(messageContent)?.slice(0, 500));
      } catch {
        console.log('Perplexity message content (non-serializable)');
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
          console.log('Failed to locate balanced JSON structure. Preview:', workingText.slice(0, 200));
        }
        jsonText = workingText;
      }
    }

    // Step 2: Clean the JSON text
    jsonText = this.cleanJSONString(jsonText);

    if (process.env.NODE_ENV !== 'production') {
      const preview = jsonText.slice(0, 200);
      const charCodes = preview.split('').map((char) => char.charCodeAt(0));
      console.log('Cleaned JSON candidate preview:', preview);
      console.log('Cleaned JSON char codes:', charCodes);
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
        console.log(`Parse attempt ${i + 1} failed:`, error instanceof Error ? error.message : error);
        if (i === parseAttempts.length - 1) {
          const repairSources = [jsonText, singleQuotedValues, workingText];
          for (const source of repairSources) {
            try {
              const repaired = jsonrepair(source);
              return JSON.parse(repaired);
            } catch (repairError) {
              console.log('jsonrepair failed:', repairError instanceof Error ? repairError.message : repairError);
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
    console.log('Attempting aggressive JSON extraction...');
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
      console.error('Aggressive extraction also failed:', error);
    }
    
    // Final fallback: create minimal valid structure
    console.log('Creating minimal fallback structure...');
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
    if (duration <= 1) {
      throw new Error(`Invalid duration: end date must be after start date - startDate: ${request.startDate}, endDate: ${request.endDate}`);
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
        "totalPrice": ${nightlyBudget * duration},
        "rating": 4.5,
        "amenities": ["WiFi", "Breakfast", "Pool", "Gym"],
        "reason": "Why this hotel"
      }
    ]
  },
  "budgetBreakdown": {
    ${request.includeFlight ? '"flights": 15000,' : ''}
    "accommodation": ${nightlyBudget * duration},
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

  private validateAndProcessEnhancedItinerary(
    itineraryInput: unknown,
    request: EnhancedItineraryRequest,
    rawResponse?: string
  ): GeneratedItinerary {
    if (!this.isItineraryDraft(itineraryInput)) {
      console.log('Invalid itinerary format, using fallback');
      return this.generateFallbackItinerary(
        request,
        'Perplexity returned incomplete itinerary, using curated backup plan.',
        rawResponse
      );
    }

    const itineraryDraft = itineraryInput as ItineraryDraft;
    const parsedStartDate = new Date(request.startDate);
    const startDate = Number.isNaN(parsedStartDate.getTime()) ? new Date() : parsedStartDate;
    const totalDaysCandidate = itineraryDraft.days.length || this.calculateTripDays(request.startDate, request.endDate);
    const totalDays = Math.max(totalDaysCandidate, 1);
    const fallbackDailyBudget = this.calculateDailyBudget(request.budget || 'mid-range', totalDays);
    const fallbackTemplateDays = this.generateFallbackDays(request, totalDays, fallbackDailyBudget);
    const fallbackDayDefault = fallbackTemplateDays[0];
    const fallbackAccommodation = this.generateFallbackAccommodationInfo(request, totalDays);
    const fallbackTransportation = this.generateFallbackTransportationInfo(
      request,
      fallbackDailyBudget * totalDays
    );
    const budgetGuide = this.getBudgetGuidelines(request.budget || 'mid-range');

    const normalizedDays: GeneratedDay[] = itineraryDraft.days.map((dayDraft, index) => {
      const fallbackDay = fallbackTemplateDays[index] ?? fallbackDayDefault;
      const sequentialDate = new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000);
      const computedDate = this.normalizeDayDate(dayDraft.date, sequentialDate);

      const providedActivities: Partial<GeneratedActivity>[] = Array.isArray(dayDraft.activities)
        ? dayDraft.activities.map((activity) => activity as Partial<GeneratedActivity>)
        : [];
      const fallbackActivities = fallbackDay?.activities ?? [];
      const mergedActivities: Partial<GeneratedActivity>[] = [...providedActivities];

      if (mergedActivities.length < 4) {
        for (const fallbackActivity of fallbackActivities) {
          if (mergedActivities.length >= 4) {
            break;
          }
          mergedActivities.push(fallbackActivity);
        }
      }

      const normalizedActivities: GeneratedActivity[] = mergedActivities.slice(0, 6).map((activity, activityIndex) => {
        const fallbackActivity = fallbackActivities[activityIndex];
        const fallbackCategory = fallbackActivity?.category ?? 'activity';
        const time = typeof activity.time === 'string'
          ? activity.time
          : fallbackActivity?.time ?? (activityIndex === 0 ? '09:00' : '13:00');
        const duration = typeof activity.duration === 'string'
          ? activity.duration
          : typeof activity.duration === 'number'
            ? `${activity.duration} min`
            : fallbackActivity?.duration ?? '2 hours';
        return {
          time,
          title: activity.title ?? fallbackActivity?.title ?? `Activity ${activityIndex + 1}`,
          description:
            activity.description ??
            fallbackActivity?.description ??
            `Signature experience in ${request.destination}`,
          location: activity.location ?? fallbackActivity?.location ?? request.destination,
          duration,
          estimatedCost:
            typeof activity.estimatedCost === 'number'
              ? activity.estimatedCost
              : fallbackActivity?.estimatedCost ?? Math.round(fallbackDailyBudget / 4),
          category: this.getValidActivityCategory(activity.category, fallbackCategory),
          tips: this.normalizeStringArray(activity.tips, fallbackActivity?.tips ?? [], 0)
        };
      });

      const providedMeals: Partial<GeneratedMeal>[] = Array.isArray(dayDraft.meals)
        ? dayDraft.meals.map((meal) => meal as Partial<GeneratedMeal>)
        : [];
      const fallbackMeals = fallbackDay?.meals ?? [];

      while (providedMeals.length < 2 && fallbackMeals[providedMeals.length]) {
        providedMeals.push(fallbackMeals[providedMeals.length]);
      }

      const normalizedMeals: GeneratedMeal[] = providedMeals.slice(0, 3).map((meal, mealIndex) => {
        const fallbackMeal = fallbackMeals[mealIndex];
        const mealBudgetMultiplier = mealIndex === 0 ? 0.18 : 0.25;
        return {
          time: meal.time ?? fallbackMeal?.time ?? (mealIndex === 0 ? '13:00' : '20:30'),
          restaurant: meal.restaurant ?? fallbackMeal?.restaurant ?? 'Local Restaurant',
          cuisine: meal.cuisine ?? fallbackMeal?.cuisine ?? 'Local',
          estimatedCost:
            typeof meal.estimatedCost === 'number'
              ? meal.estimatedCost
              : fallbackMeal?.estimatedCost ?? Math.round(fallbackDailyBudget * mealBudgetMultiplier),
          speciality: meal.speciality ?? fallbackMeal?.speciality ?? 'Signature dish'
        };
      });

      return {
        day: typeof dayDraft.day === 'number' && dayDraft.day > 0 ? dayDraft.day : index + 1,
        date: computedDate,
        theme: dayDraft.theme ?? fallbackDay?.theme ?? this.getDayTheme(index + 1, request.travelStyle || 'cultural'),
        activities: normalizedActivities,
        meals: normalizedMeals,
        estimatedDailyCost:
          typeof dayDraft.estimatedDailyCost === 'number'
            ? dayDraft.estimatedDailyCost
            : fallbackDay?.estimatedDailyCost ?? fallbackDailyBudget
      };
    });

    const accommodationInputs: AccommodationRecommendationInput[] = Array.isArray(
      itineraryDraft.accommodation?.recommendations
    )
      ? itineraryDraft.accommodation.recommendations.map((rec) => rec as AccommodationRecommendationInput)
      : [];

    const normalizedAccommodationRecommendations = this.normalizeAccommodationRecommendations(
      accommodationInputs.length > 0 ? accommodationInputs : fallbackAccommodation.recommendations,
      request,
      budgetGuide,
      totalDays
    );

    const accommodation = {
      type: itineraryDraft.accommodation?.type ?? fallbackAccommodation.type,
      recommendations: normalizedAccommodationRecommendations
    };

    const draftTransportation = itineraryDraft.transportation;
    const needsFlights = request.includeFlight || Boolean(draftTransportation?.flights);

    const transportation: TransportationInfo = {
      local: {
        recommendations: this.normalizeStringArray(
          draftTransportation?.local?.recommendations,
          fallbackTransportation.local.recommendations,
          1
        ),
        estimatedDailyCost:
          typeof draftTransportation?.local?.estimatedDailyCost === 'number'
            ? draftTransportation.local.estimatedDailyCost
            : fallbackTransportation.local.estimatedDailyCost
      }
    };

    if (needsFlights && (draftTransportation?.flights || fallbackTransportation.flights)) {
      const outbound = draftTransportation?.flights?.outbound ?? fallbackTransportation.flights?.outbound;
      const returnFlight = draftTransportation?.flights?.return ?? fallbackTransportation.flights?.return;

      if (outbound || returnFlight) {
        transportation.flights = {
          outbound: {
            estimatedCost:
              typeof outbound?.estimatedCost === 'number'
                ? outbound.estimatedCost
                : fallbackTransportation.flights?.outbound.estimatedCost ?? 0,
            tips: this.normalizeStringArray(
              outbound?.tips,
              fallbackTransportation.flights?.outbound.tips ?? [],
              1
            )
          },
          return: {
            estimatedCost:
              typeof returnFlight?.estimatedCost === 'number'
                ? returnFlight.estimatedCost
                : fallbackTransportation.flights?.return?.estimatedCost ?? 0,
            tips: this.normalizeStringArray(
              returnFlight?.tips,
              fallbackTransportation.flights?.return?.tips ?? [],
              1
            )
          }
        };
      }
    }

    const activitiesTotal = normalizedDays.reduce(
      (sum, day) => sum + day.activities.reduce((innerSum, activity) => innerSum + activity.estimatedCost, 0),
      0
    );
    const foodTotal = normalizedDays.reduce(
      (sum, day) => sum + day.meals.reduce((innerSum, meal) => innerSum + meal.estimatedCost, 0),
      0
    );
    const accommodationPerNight =
      accommodation.recommendations[0]?.estimatedCostPerNight ?? budgetGuide.defaultNightly;
    const accommodationTotal = accommodationPerNight * totalDays;
    const transportationTotal =
      typeof itineraryDraft.budgetBreakdown?.transportation === 'number'
        ? itineraryDraft.budgetBreakdown.transportation
        : Math.round(transportation.local.estimatedDailyCost * totalDays);
    const miscellaneousTotal =
      typeof itineraryDraft.budgetBreakdown?.miscellaneous === 'number'
        ? itineraryDraft.budgetBreakdown.miscellaneous
        : Math.round((activitiesTotal + foodTotal) * 0.1);
    const flightsCost =
      typeof itineraryDraft.budgetBreakdown?.flights === 'number'
        ? itineraryDraft.budgetBreakdown.flights
        : transportation.flights
          ? transportation.flights.outbound.estimatedCost + transportation.flights.return.estimatedCost
          : 0;

    const budgetBreakdown: BudgetBreakdown = {
      flights: flightsCost || undefined,
      accommodation: accommodationTotal,
      activities: activitiesTotal,
      food: foodTotal,
      transportation: transportationTotal,
      miscellaneous: miscellaneousTotal,
      total: 0
    };

    budgetBreakdown.total =
      (budgetBreakdown.flights ?? 0) +
      budgetBreakdown.accommodation +
      budgetBreakdown.activities +
      budgetBreakdown.food +
      budgetBreakdown.transportation +
      budgetBreakdown.miscellaneous;

    const defaultHighlights = [
      `Experience the best of ${request.destination}`,
      `Enjoy ${request.travelStyle || 'balanced'} days tailored to ${request.groupType || 'travelers'}`,
      `Stay in curated ${accommodation.type} options`
    ];

    const tipsDraft = itineraryDraft.tips;
    const normalizedTips = {
      general: this.normalizeStringArray(
        tipsDraft?.general,
        [
          `Best times to explore ${request.destination}`,
          'Carry local currency for small purchases',
          'Plan buffer time between activities'
        ],
        3
      ),
      budgetSaving: this.normalizeStringArray(
        tipsDraft?.budgetSaving,
        [
          'Use public transport or shared rides',
          'Look for attraction combo tickets',
          'Dine where locals eat for authentic value'
        ],
        3
      ),
      cultural: this.normalizeStringArray(
        tipsDraft?.cultural,
        [
          'Learn basic greetings in the local language',
          'Respect local dress codes and customs',
          'Always ask before photographing people'
        ],
        3
      ),
      safety: this.normalizeStringArray(
        tipsDraft?.safety,
        [
          'Keep valuables secure in crowded areas',
          'Share travel plans with a trusted contact',
          'Use registered transport providers at night'
        ],
        3
      )
    };

    const bestTimeToVisit = {
      weather:
        itineraryDraft.bestTimeToVisit?.weather ??
        'Check seasonal weather trends for comfortable conditions.',
      crowds:
        itineraryDraft.bestTimeToVisit?.crowds ?? 'Target shoulder seasons for manageable crowds.',
      prices:
        itineraryDraft.bestTimeToVisit?.prices ?? 'Book accommodations and transport early to lock in rates.'
    };

    const overview =
      typeof itineraryDraft.overview === 'string' && itineraryDraft.overview.trim().length > 0
        ? itineraryDraft.overview.trim()
        : `A ${totalDays}-day ${request.travelStyle || 'balanced'} trip to ${request.destination} with curated experiences, dining, and stays.`;

    const highlights = this.normalizeStringArray(itineraryDraft.highlights, defaultHighlights, 3);

    return {
      destination: itineraryDraft.destination,
      duration:
        typeof itineraryDraft.duration === 'number' && itineraryDraft.duration > 0
          ? itineraryDraft.duration
          : totalDays,
      overview,
      highlights,
      days: normalizedDays,
      transportation,
      accommodation,
      budgetBreakdown,
      tips: normalizedTips,
      bestTimeToVisit,
      isFallback: false,
      fallbackReason: undefined,
      debugRawResponse:
        process.env.NODE_ENV !== 'production' ? rawResponse ?? itineraryDraft.debugRawResponse : undefined
    };
  }

  private generateFallbackItinerary(
    request: EnhancedItineraryRequest,
    reason?: string,
    debugRawResponse?: string
  ): GeneratedItinerary {
    console.log('Generating fallback itinerary with template...');
    
    const days = this.calculateTripDays(request.startDate, request.endDate);
    const dailyBudget = this.calculateDailyBudget(request.budget || 'mid-range', days);
    const totalBudget = dailyBudget * days;
    
    return {
      destination: request.destination,
      duration: days,
      overview: `A ${days}-day ${request.travelStyle || 'cultural'} trip to ${request.destination} designed for ${request.travelers} travelers. This itinerary offers a perfect blend of sightseeing, cultural experiences, and relaxation within your ${request.budget || 'mid-range'} budget.`,
      highlights: [
        `Experience the best of ${request.destination}`,
        `Authentic local cuisine and cultural immersion`,
        `Comfortable ${request.accommodationType || 'hotel'} accommodation`,
        `Flexible itinerary suitable for ${request.groupType || 'travelers'}`
      ],
      days: this.generateFallbackDays(request, days, dailyBudget),
      transportation: this.generateFallbackTransportationInfo(request, totalBudget),
      accommodation: this.generateFallbackAccommodationInfo(request, days),
      budgetBreakdown: this.generateBudgetBreakdown(request, totalBudget, days),
      tips: {
        general: [
          `Best time to visit ${request.destination} varies by season`,
          `Book accommodations and flights in advance for better rates`,
          `Learn basic local phrases to enhance your experience`,
          `Keep digital and physical copies of important documents`
        ],
        budgetSaving: [
          'Use public transportation when possible',
          'Eat at local restaurants rather than tourist spots',
          'Look for free walking tours and activities',
          'Book combo tickets for multiple attractions'
        ],
        cultural: [
          'Respect local customs and dress codes',
          'Try traditional foods and local specialties',
          'Visit during local festivals for authentic experiences',
          'Engage with locals to learn about their culture'
        ],
        safety: [
          'Register with your embassy if traveling internationally',
          'Keep emergency contacts readily available',
          'Stay aware of your surroundings in crowded areas',
          'Consider travel insurance for peace of mind'
        ]
      },
      bestTimeToVisit: {
        weather: 'Check seasonal weather patterns for optimal travel conditions',
        crowds: 'Consider shoulder seasons for fewer crowds and better prices',
        prices: 'Monitor flight and accommodation prices for the best deals'
      },
      isFallback: true,
      fallbackReason: reason ?? 'Perplexity response unavailable, using smart template instead.',
      debugRawResponse: process.env.NODE_ENV !== 'production' ? debugRawResponse : undefined
    };
  }

  // All the helper methods remain the same as in Gemini service
  private generateFallbackDays(
    request: EnhancedItineraryRequest,
    days: number,
    dailyBudget: number
  ): GeneratedDay[] {
    const dayPlans: GeneratedDay[] = [];

    for (let day = 1; day <= days; day++) {
      const date = this.addDays(new Date(request.startDate), day - 1);
      const isoDate = date.toISOString().split('T')[0];

      const activities: GeneratedActivity[] = [
        {
          time: '08:30',
          title: `Morning Exploration in ${request.destination}`,
          description: `Start the day with a guided walk covering ${request.destination}'s signature sights.`,
          location: `Central ${request.destination}`,
          duration: '2.5 hours',
          estimatedCost: Math.round(dailyBudget * 0.2),
          category: 'sightseeing',
          tips: ['Arrive early to avoid crowds', 'Wear comfortable footwear', 'Carry water']
        },
        {
          time: '11:30',
          title: 'Immersive Workshop',
          description: 'Join a hands-on workshop or tasting session that reflects local culture.',
          location: `Creative quarter, ${request.destination}`,
          duration: '1.5 hours',
          estimatedCost: Math.round(dailyBudget * 0.15),
          category: 'activity',
          tips: ['Book ahead to secure a spot', 'Arrive 10 minutes early']
        },
        {
          time: '15:00',
          title: 'Afternoon Signature Experience',
          description: 'Discover a marquee attraction or outdoor adventure tailored to the group.',
          location: `Highlight district, ${request.destination}`,
          duration: '3 hours',
          estimatedCost: Math.round(dailyBudget * 0.3),
          category: 'activity',
          tips: ['Check weather conditions', 'Carry identification', 'Plan transport back']
        },
        {
          time: '19:30',
          title: 'Evening Cultural Showcase',
          description: 'Wind down with a cultural performance, sunset cruise, or night market tour.',
          location: `Evening hotspot, ${request.destination}`,
          duration: '2.5 hours',
          estimatedCost: Math.round(dailyBudget * 0.2),
          category: 'activity',
          tips: ['Smart casual attire', 'Carry cash for souvenirs', 'Keep belongings secure']
        }
      ];

      const meals: GeneratedMeal[] = [
        {
          time: '13:00',
          restaurant: 'Local Lunch Spot',
          cuisine: 'Regional',
          estimatedCost: Math.round(dailyBudget * 0.15),
          speciality: "Chef's specialty platter"
        },
        {
          time: '20:30',
          restaurant: 'Signature Dinner Venue',
          cuisine: 'Local',
          estimatedCost: Math.round(dailyBudget * 0.25),
          speciality: 'Seasonal tasting menu'
        }
      ];

      dayPlans.push({
        day,
        date: isoDate,
        theme: this.getDayTheme(day, request.travelStyle || 'cultural'),
        activities,
        meals,
        estimatedDailyCost: dailyBudget
      });
    }

    return dayPlans;
  }
  
  private generateFallbackTransportationInfo(
    request: EnhancedItineraryRequest,
    totalBudget: number
  ): TransportationInfo {
    const tripDays = Math.max(1, this.calculateTripDays(request.startDate, request.endDate));
    const localRecommendations = [
      'Use official taxi services or reputable ride-sharing apps',
      'Consider daily/weekly public transport passes for savings',
      'Walk when possible to experience the city authentically'
    ];

    const local: TransportationInfo['local'] = {
      recommendations: localRecommendations,
      estimatedDailyCost: Math.round((totalBudget * 0.1) / tripDays)
    };

    if (!request.includeFlight) {
      return { local };
    }

    const flightCost = request.flightBudget
      ? request.flightBudget.outbound + request.flightBudget.return
      : this.estimateFlightCost(request);

    const outboundCost = Math.round(flightCost / 2);
    const returnCost = Math.max(flightCost - outboundCost, 0);

    return {
      local,
      flights: {
        outbound: {
          estimatedCost: outboundCost,
          tips: [
            'Book in advance for better rates',
            'Check baggage allowances',
            'Arrive at airport 2-3 hours early for international flights'
          ]
        },
        return: {
          estimatedCost: returnCost,
          tips: [
            'Confirm return flight 24 hours before departure',
            'Check visa/passport validity',
            'Leave time for airport shopping'
          ]
        }
      }
    };
  }
  
  private generateFallbackAccommodationInfo(request: EnhancedItineraryRequest, days: number) {
    const guide = this.getBudgetGuidelines(request.budget || 'mid-range');
    const seedRecommendations = Array.from({ length: 3 }, (_, index) => ({
      name: `${guide.descriptorNames[index]} stay in ${request.destination}`,
      area: `Prime area of ${request.destination}`,
      estimatedCostPerNight: guide.defaultNightly + index * guide.nightlyStep,
      totalPrice: (guide.defaultNightly + index * guide.nightlyStep) * Math.max(1, days),
      rating: guide.key === 'luxury' ? 4.8 - index * 0.05 : 4.4 - index * 0.05,
      amenities: ['WiFi', 'Breakfast', guide.signatureAmenities[index], 'City view'],
      reason: guide.reasonPhrases[index]
    }));

    return {
      type: request.accommodationType || 'hotel',
      recommendations: this.normalizeAccommodationRecommendations(
        seedRecommendations,
        request,
        guide,
        Math.max(1, days)
      )
    };
  }
  
  private generateBudgetBreakdown(
    request: EnhancedItineraryRequest,
    totalBudget: number,
    days: number
  ): BudgetBreakdown {
  const safeDays = Math.max(days, 1);
  const accommodation = Math.round(totalBudget * 0.35);
  const food = Math.round(totalBudget * 0.25);
  const activities = Math.round(totalBudget * 0.2);
  const transportation = Math.round((totalBudget * 0.1) / safeDays) * safeDays;
  const miscellaneous = Math.round(Math.max(totalBudget * 0.1, safeDays * 400));
    const flights = request.includeFlight
      ? request.flightBudget
        ? request.flightBudget.outbound + request.flightBudget.return
        : this.estimateFlightCost(request)
      : 0;

    const breakdown: BudgetBreakdown = {
      flights: flights || undefined,
      accommodation,
      activities,
      food,
      transportation,
      miscellaneous,
      total: accommodation + activities + food + transportation + miscellaneous + flights
    };

    return breakdown;
  }

  // Helper methods
  private getDayTheme(day: number, style: string): string {
    const themes = {
      cultural: ['Cultural Exploration', 'Historical Sites', 'Art & Museums', 'Local Heritage'],
      adventure: ['Adventure Activities', 'Outdoor Exploration', 'Nature & Wildlife', 'Sports & Recreation'],
      relaxed: ['Leisure & Relaxation', 'Scenic Views', 'Wellness Activities', 'Gentle Exploration'],
      family: ['Family Fun', 'Kid-Friendly Activities', 'Educational Experiences', 'Entertainment'],
      business: ['Business Meetings', 'Networking', 'Professional Tours', 'Corporate Activities']
    };
    
    const styleThemes = themes[style as keyof typeof themes] || themes.cultural;
    return styleThemes[(day - 1) % styleThemes.length];
  }
  
  private calculateTripDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    // Add 1 to include both start and end dates (e.g., Oct 24-27 = 4 days, not 3)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  
  private calculateDailyBudget(budgetType: string, days: number): number {
    const totalBudget = this.calculateTotalBudget(budgetType, days);
    return Math.round(totalBudget / days);
  }
  
  private calculateTotalBudget(budgetType: string, days: number): number {
    const baseBudgets = {
      budget: 3000,
      'mid-range': 6000,
      luxury: 12000
    };
    
    return (baseBudgets[budgetType as keyof typeof baseBudgets] || baseBudgets['mid-range']) * days;
  }
  
  private getBaseCostForAccommodation(budget: string, type: string): number {
    const costs = {
      budget: { hostel: 800, hotel: 1500, apartment: 1200, resort: 2000 },
      'mid-range': { hostel: 1500, hotel: 3000, apartment: 2500, resort: 4000 },
      luxury: { hostel: 2500, hotel: 6000, apartment: 5000, resort: 8000 }
    };
    
    return costs[budget as keyof typeof costs]?.[type as keyof typeof costs.budget] || 2500;
  }
  
  private estimateFlightCost(request: EnhancedItineraryRequest): number {
    return request.budget === 'luxury' ? 25000 : request.budget === 'mid-range' ? 15000 : 8000;
  }
  
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Legacy method for backward compatibility
  async generateItinerary(request: ItineraryRequest): Promise<AIItineraryResponse> {
    try {
      const enhancedRequest: EnhancedItineraryRequest = {
        ...request,
        includeFlight: false,
        groupType: 'friends',
        fitnessLevel: 'moderate',
        dietaryRestrictions: []
      };

  const enhancedItinerary = await this.generateEnhancedItinerary(enhancedRequest);

  const primaryHotel = enhancedItinerary.accommodation.recommendations?.[0];
  const nightlyRate = primaryHotel?.estimatedCostPerNight || 3000;
  const durationNights = Math.max(enhancedItinerary.duration || this.calculateTripDays(request.startDate, request.endDate), 1);
  const totalHotelPrice = primaryHotel?.totalPrice || nightlyRate * durationNights;

  // Convert to legacy format
  const legacyItinerary: Itinerary = {
        id: `itinerary-${Date.now()}`,
        destination: enhancedItinerary.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        duration: enhancedItinerary.duration,
        totalCost: enhancedItinerary.budgetBreakdown.total,
        days: enhancedItinerary.days.map((day, index) => ({
          day: day.day,
          date: day.date,
          activities: day.activities.map((activity, actIndex) => ({
            id: `activity-${index}-${actIndex}`,
            name: activity.title,
            description: activity.description,
            location: activity.location,
            duration: activity.duration,
            cost: activity.estimatedCost,
            category: this.mapToLegacyActivityCategory(activity.category),
            timeSlot: this.getLegacyTimeSlot(actIndex),
            tips: activity.tips
          })),
          meals: day.meals.map((meal, mealIndex) => ({
            id: `meal-${index}-${mealIndex}`,
            name: meal.speciality,
            restaurant: meal.restaurant,
            cuisine: meal.cuisine,
            location: meal.restaurant,
            cost: meal.estimatedCost,
            mealType: this.getLegacyMealType(mealIndex)
          })),
          accommodation: {
            id: `accommodation-${index}`,
            name: enhancedItinerary.accommodation.recommendations[0]?.name || 'Hotel',
            type: enhancedItinerary.accommodation.type,
            location: enhancedItinerary.accommodation.recommendations[0]?.area || request.destination,
            checkIn: day.date,
            checkOut: day.date,
            cost: nightlyRate,
            nightlyRate,
            totalPrice: totalHotelPrice,
            nights: durationNights,
            rating: primaryHotel?.rating ?? 4.0,
            amenities: primaryHotel?.amenities || ['WiFi']
          },
          transportation: [{
            id: `transport-${index}`,
            type: 'taxi',
            from: request.destination,
            to: request.destination,
            departure: '09:00',
            arrival: '18:00',
            cost: enhancedItinerary.transportation.local.estimatedDailyCost,
            duration: '9 hours',
            provider: 'Local Transport'
          }],
          estimatedCost: day.estimatedDailyCost
        })) as ItineraryDay[],
        summary: {
          highlights: enhancedItinerary.highlights,
          totalActivities: enhancedItinerary.days.reduce((sum, day) => sum + day.activities.length, 0),
          totalMeals: enhancedItinerary.days.reduce((sum, day) => sum + day.meals.length, 0),
          avgDailyCost: Math.round(enhancedItinerary.budgetBreakdown.total / enhancedItinerary.duration),
          weatherInfo: {
            temperature: '25-30°C',
            conditions: 'Pleasant',
            recommendation: 'Light clothes'
          }
        },
        tips: enhancedItinerary.tips.general,
        emergencyInfo: {
          hospitals: ['City General Hospital', 'District Medical Center'],
          emergencyNumbers: ['100 (Police)', '101 (Fire)', '108 (Ambulance)']
        }
      };

      return {
        success: true,
        itinerary: legacyItinerary
      };
    } catch (error) {
      console.error('Perplexity API error:', error);
      return {
        success: false,
        error: 'Failed to generate itinerary with Perplexity',
        suggestions: ['Please try again or contact support']
      };
    }
  }
}

export const perplexityItineraryService = new PerplexityItineraryService();
