// ─── Demo seed — creates a realistic completed claim for dashboard demo
// Run: npx ts-node src/lib/demo-seed.ts
// Or call POST /api/demo/seed

import { createServerClient } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { ClaimObject } from '@/types/claim';

export async function seedDemoClaim(): Promise<ClaimObject> {
  const db = createServerClient();
  const id = uuidv4();
  const now = new Date().toISOString();

  const claim: ClaimObject = {
    id,
    created_at: now,
    updated_at: now,
    user: {
      id: uuidv4(),
      name: 'Sarah Chen',
      email: 'sarah.chen@email.com',
      policy_number: 'POL-88821047',
      insurer: 'Nationwide',
    },
    incident: {
      description: 'I was driving southbound on Route 9 when the vehicle in front braked suddenly. I was unable to stop in time and my front bumper made contact with their rear. The other driver and I have exchanged information. My airbags did not deploy. The damage appears to be to the front bumper and hood.',
      location: { lat: 40.7128, lng: -74.006, address: '47 Route 9 South, Woodbridge, NJ 07095', city: 'Woodbridge', country: 'US' },
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      vehicles_involved: ['2021 Honda Accord', '2019 Toyota Camry'],
      incident_type: 'vehicle_collision',
    },
    voice: {
      recording_url: '',
      enhanced_audio_url: 'https://cdn.ai-coustics.com/enhanced/demo.mp3',
      transcript: 'I was driving southbound on Route 9 when the vehicle in front braked suddenly. I was unable to stop in time and my front bumper made contact with their rear. The other driver and I have exchanged information. My airbags did not deploy. The damage appears to be to the front bumper and hood.',
      stress_score: 0.61,
      acoustic_sentiment: 'stressed',
      duration_seconds: 24,
      audio_quality_score: 0.94,
    },
    photos: { urls: [], count: 4, captured_at: now },
    damage_analysis: {
      damage_location: 'front bumper, hood, grille',
      severity: 'moderate',
      estimated_repair_cost: { min: 2400, max: 4200, currency: 'USD' },
      damage_consistent_with_description: true,
      damage_details: [
        'Front bumper cover cracked along lower edge, approximately 60cm split',
        'Hood panel shows impact crease consistent with frontal collision force',
        'Grille assembly partially displaced, clips broken',
        'No frame damage detected in submitted photos',
        'Headlight assembly appears intact with no lens fracture',
      ],
      affected_parts: ['front bumper cover', 'hood panel', 'grille assembly', 'upper radiator support'],
      gemini_raw: '{}',
    },
    environmental: {
      weather_condition: 'clear',
      temperature_celsius: 14,
      visibility: 'Good (> 1km)',
      precipitation: 'None',
      wind_speed_kmh: 18,
      road_conditions: 'Dry / Normal',
      contributing_factors: ['No adverse conditions identified'],
      data_timestamp: now,
    },
    market_data: {
      average_repair_cost_usd: 3100,
      cost_range: { min: 2100, max: 4400 },
      market_location: 'Woodbridge, NJ',
      data_sources: ['https://www.repairsmith.com', 'https://www.cargurus.com'],
      retrieved_at: now,
    },
    fraud_assessment: {
      confidence_score: 87,
      fraud_risk: 'low',
      reasoning: [
        'Damage pattern is geometrically consistent with described rear-end collision mechanics',
        'Claimant stress score (0.61) aligns with genuine post-accident emotional state',
        'Estimated repair cost falls within market range for Woodbridge, NJ auto body shops',
        'No prior claims filed under this policy number in the last 24 months',
        'Environmental conditions (dry road, good visibility) are consistent with sudden braking scenario',
        'Vehicle age and value ratio supports claim plausibility',
      ],
      model_version: '2.4.1',
      claims_trained_on: 847293,
      processing_time_ms: 1840,
      flags: [],
    },
    status: 'approved',
    processing_steps: {
      audio_received: true,
      audio_enhanced: true,
      transcript_ready: true,
      photos_analyzed: true,
      weather_fetched: true,
      pricing_fetched: true,
      fraud_scored: true,
      report_delivered: true,
    },
    resolution: {
      decision: 'approved',
      decided_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      resolution_time_seconds: 142,
      fnol_delivered: true,
      fnol_delivered_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      entire_task_id: null,
      entire_task_url: null,
      adjuster_notes: null,
    },
  };

  await db.from('claims').insert(claim);
  return claim;
}

export async function seedEscalatedClaim(): Promise<ClaimObject> {
  const db = createServerClient();
  const id = uuidv4();
  const now = new Date().toISOString();

  const claim: ClaimObject = {
    id,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: now,
    user: {
      id: uuidv4(),
      name: 'Marcus Williams',
      email: 'marcus.w@email.com',
      policy_number: 'POL-44102983',
      insurer: 'Progressive',
    },
    incident: {
      description: 'Vehicle was parked outside my residence overnight. Woke up to find significant damage to the passenger side doors. No witnesses. No CCTV in the area.',
      location: { lat: 40.6892, lng: -74.0445, address: '221 Bay Street, Staten Island, NY 10301', city: 'Staten Island', country: 'US' },
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      vehicles_involved: ['2022 BMW 5 Series'],
      incident_type: 'parked_vehicle_damage',
    },
    voice: {
      recording_url: '',
      enhanced_audio_url: '',
      transcript: 'Vehicle was parked outside my residence overnight. Woke up to find significant damage to the passenger side doors. No witnesses. No CCTV in the area.',
      stress_score: 0.21,
      acoustic_sentiment: 'calm',
      duration_seconds: 14,
      audio_quality_score: 0.89,
    },
    photos: { urls: [], count: 2, captured_at: now },
    damage_analysis: {
      damage_location: 'passenger side doors, quarter panel',
      severity: 'severe',
      estimated_repair_cost: { min: 6800, max: 11200, currency: 'USD' },
      damage_consistent_with_description: false,
      damage_details: [
        'Door panel damage shows linear scoring inconsistent with typical parking impact',
        'Impact pattern suggests sustained directional force rather than single collision event',
        'Quarter panel deformation extends beyond typical hit-and-run damage profile',
        'Photo metadata shows images captured 6 hours after claimed discovery time',
      ],
      affected_parts: ['front passenger door', 'rear passenger door', 'quarter panel', 'rocker panel'],
      gemini_raw: '{}',
    },
    environmental: {
      weather_condition: 'clear',
      temperature_celsius: 9,
      visibility: 'Good (> 1km)',
      precipitation: 'None',
      wind_speed_kmh: 8,
      road_conditions: 'Dry / Normal',
      contributing_factors: ['No adverse conditions identified'],
      data_timestamp: now,
    },
    market_data: {
      average_repair_cost_usd: 7400,
      cost_range: { min: 5200, max: 12000 },
      market_location: 'Staten Island, NY',
      data_sources: [],
      retrieved_at: now,
    },
    fraud_assessment: {
      confidence_score: 54,
      fraud_risk: 'high',
      reasoning: [
        'Stress score (0.21) is atypically low for a claimant reporting significant vehicle damage',
        'Damage pattern identified by Gemini is geometrically inconsistent with hit-and-run mechanics',
        'Photo metadata timestamp does not align with reported discovery time (6-hour discrepancy)',
        'Claim value ($6,800–$11,200) is in the 94th percentile for this policy tier',
        'No corroborating evidence — no witnesses, no CCTV, no other vehicle identified',
      ],
      model_version: '2.4.1',
      claims_trained_on: 847293,
      processing_time_ms: 2210,
      flags: ['LOW_STRESS_ANOMALY', 'DAMAGE_INCONSISTENCY', 'METADATA_MISMATCH', 'HIGH_VALUE_OUTLIER'],
    },
    status: 'escalated',
    processing_steps: {
      audio_received: true,
      audio_enhanced: true,
      transcript_ready: true,
      photos_analyzed: true,
      weather_fetched: true,
      pricing_fetched: true,
      fraud_scored: true,
      report_delivered: false,
    },
    resolution: {
      decision: 'escalated',
      decided_at: now,
      resolution_time_seconds: 186,
      fnol_delivered: false,
      fnol_delivered_at: null,
      entire_task_id: 'GH-' + id.slice(0, 4).toUpperCase(),
      entire_task_url: 'https://github.com/oracle-demo/escalations/issues/1',
      adjuster_notes: null,
    },
  };

  await db.from('claims').insert(claim);
  return claim;
}
