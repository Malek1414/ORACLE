// ─── Tavily Live Web Intelligence ────────────────────────────────────────────
// Fires two parallel searches:
//   1. Weather & road conditions at incident location + time
//   2. Average repair costs for the damage type in that market

import { TavilyResponse, EnvironmentalData, MarketData } from '@/types/claim';

const TAVILY_API_URL = 'https://api.tavily.com/search';

async function tavilySearch(query: string, topic: 'general' | 'news' = 'general'): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 600));
    const isWeather = topic === 'news' || query.includes('weather');
    return {
      answer: isWeather
        ? 'Clear skies with dry road conditions. Temperature 14°C. Visibility good. Wind 18 km/h from the northwest. No precipitation. Normal daytime traffic conditions.'
        : 'Average front bumper replacement and repair in New Jersey ranges from $2,100 to $4,400. Typical collision repair for moderate damage costs $2,800 on average at local body shops.',
      results: [],
    };
  }

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      topic,
      search_depth: 'advanced',
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily error ${response.status}: ${err}`);
  }

  return response.json();
}

export async function fetchEnvironmentalData(
  location: string,
  incidentTime: string
): Promise<EnvironmentalData> {
  const query = `weather conditions road conditions ${location} ${incidentTime} accident visibility`;
  const result = await tavilySearch(query, 'news');

  // Parse the answer from Tavily into structured data
  const answer = result.answer || '';

  // Extract structured data from the answer using pattern matching
  return {
    weather_condition: extractWeatherCondition(answer),
    temperature_celsius: extractTemperature(answer),
    visibility: extractVisibility(answer),
    precipitation: extractPrecipitation(answer),
    wind_speed_kmh: extractWindSpeed(answer),
    road_conditions: extractRoadConditions(answer, result.results),
    contributing_factors: extractContributingFactors(answer),
    data_timestamp: new Date().toISOString(),
  };
}

export async function fetchMarketPricingData(
  damageType: string,
  location: string
): Promise<MarketData> {
  const query = `average car repair cost ${damageType} ${location} 2024 2025 body shop estimate`;
  const result = await tavilySearch(query);

  const answer = result.answer || '';

  return {
    average_repair_cost_usd: extractAverageCost(answer),
    cost_range: extractCostRange(answer),
    market_location: location,
    data_sources: result.results.slice(0, 3).map((r) => r.url),
    retrieved_at: new Date().toISOString(),
  };
}

// ─── Parsers ─────────────────────────────────────────────────────────────

function extractWeatherCondition(text: string): string {
  const conditions = ['clear', 'sunny', 'cloudy', 'overcast', 'rainy', 'rain', 'foggy', 'fog', 'snowy', 'snow', 'stormy', 'windy'];
  const lower = text.toLowerCase();
  return conditions.find((c) => lower.includes(c)) || 'clear';
}

function extractTemperature(text: string): number {
  const match = text.match(/(\d+)\s*°?[CF]/i);
  if (!match) return 18;
  const val = parseInt(match[1]);
  // Convert F to C if needed
  if (text.includes('F') || val > 50) return Math.round((val - 32) * 5 / 9);
  return val;
}

function extractVisibility(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('low visibility') || lower.includes('poor visibility')) return 'Poor (< 100m)';
  if (lower.includes('fog') || lower.includes('mist')) return 'Reduced (< 500m)';
  return 'Good (> 1km)';
}

function extractPrecipitation(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('heavy rain') || lower.includes('downpour')) return 'Heavy rain';
  if (lower.includes('rain') || lower.includes('drizzle')) return 'Light rain';
  if (lower.includes('snow')) return 'Snow';
  return 'None';
}

function extractWindSpeed(text: string): number {
  const match = text.match(/(\d+)\s*(?:km\/h|mph|knots)/i);
  if (!match) return 15;
  return parseInt(match[1]);
}

function extractRoadConditions(text: string, results: TavilyResponse['results']): string {
  const combined = text + ' ' + results.map((r) => r.content).join(' ');
  const lower = combined.toLowerCase();
  if (lower.includes('icy') || lower.includes('ice')) return 'Icy';
  if (lower.includes('wet') || lower.includes('slippery')) return 'Wet / Slippery';
  if (lower.includes('construction') || lower.includes('roadwork')) return 'Construction zone';
  return 'Dry / Normal';
}

function extractContributingFactors(text: string): string[] {
  const factors: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('fog') || lower.includes('poor visibility')) factors.push('Reduced visibility');
  if (lower.includes('rain') || lower.includes('wet')) factors.push('Wet road surface');
  if (lower.includes('icy') || lower.includes('ice')) factors.push('Icy conditions');
  if (lower.includes('dark') || lower.includes('night')) factors.push('Low light conditions');
  if (lower.includes('traffic') || lower.includes('congestion')) factors.push('Heavy traffic');
  return factors.length ? factors : ['No adverse conditions identified'];
}

function extractAverageCost(text: string): number {
  const match = text.match(/\$(\d[\d,]*)/g);
  if (!match) return 2500;
  const amounts = match.map((m) => parseInt(m.replace(/[$,]/g, '')));
  return Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
}

function extractCostRange(text: string): { min: number; max: number } {
  const avg = extractAverageCost(text);
  return { min: Math.round(avg * 0.7), max: Math.round(avg * 1.4) };
}
