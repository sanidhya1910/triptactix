interface Env {
  DB: any; // D1Database
}

export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { searchParams } = body;

    // Mock price prediction data
    const currentPrice = parseFloat(searchParams.currentPrice) || 5000;
    const predictionData = {
      searchId: `pred_${Date.now()}`,
      currentPrice: currentPrice,
      predictedPrice: currentPrice * (0.85 + Math.random() * 0.3), // Random variation
      confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
      trend: Math.random() > 0.5 ? 'down' : 'up',
      recommendation: Math.random() > 0.6 ? 'book_now' : 'wait',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      factors: [
        'Historical price trends',
        'Seasonal demand patterns',
        'Booking window analysis',
        'Route popularity',
        'Market competition'
      ],
      chartData: generatePriceChart(currentPrice)
    };

    return new Response(JSON.stringify({ 
      success: true, 
      prediction: predictionData 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Prediction error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Prediction failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function generatePriceChart(basePrice: number) {
  const data = [];
  const days = 30;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Generate some realistic price variation
    const variation = 0.8 + Math.random() * 0.4; // 80% to 120% of base price
    const price = Math.round(basePrice * variation);
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: price
    });
  }
  
  return data;
}
