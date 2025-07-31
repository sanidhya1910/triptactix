import { NextRequest, NextResponse } from 'next/server';
import { ItineraryRequestSchema } from '@/types/itinerary';
import { geminiItineraryService } from '@/lib/gemini-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request data
    const validation = ItineraryRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.issues
      }, { status: 400 });
    }

    const itineraryRequest = validation.data;
    
    // Generate itinerary using Gemini AI
    const response = await geminiItineraryService.generateItinerary(itineraryRequest);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Itinerary generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate itinerary. Please try again.',
    }, { status: 500 });
  }
}
