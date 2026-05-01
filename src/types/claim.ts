// ─── ORACLE Core Claim Object ───────────────────────────────────────────────

export type ClaimStatus =
  | 'idle'
  | 'recording'
  | 'enhancing'
  | 'transcribing'
  | 'analyzing'
  | 'fetching_context'
  | 'scoring'
  | 'approved'
  | 'escalated'
  | 'rejected';

export type FraudRisk = 'low' | 'medium' | 'high';
export type DamageSeverity = 'minor' | 'moderate' | 'severe' | 'total_loss';
export type DecisionType = 'approved' | 'escalated' | 'rejected';

export interface ClaimUser {
  id: string;
  name: string;
  email: string;
  policy_number: string;
  insurer: string;
}

export interface ClaimLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
}

export interface ClaimIncident {
  description: string;
  location: ClaimLocation;
  timestamp: string;
  vehicles_involved: string[];
  incident_type: string;
}

export interface ClaimVoice {
  recording_url: string;
  enhanced_audio_url: string;
  transcript: string;
  stress_score: number;       // 0–1 from ai-coustics
  acoustic_sentiment: string; // 'calm' | 'stressed' | 'distressed'
  duration_seconds: number;
  audio_quality_score: number;
}

export interface ClaimPhotos {
  urls: string[];
  count: number;
  captured_at: string;
}

export interface DamageAnalysis {
  damage_location: string;
  severity: DamageSeverity;
  estimated_repair_cost: { min: number; max: number; currency: string };
  damage_consistent_with_description: boolean;
  damage_details: string[];
  affected_parts: string[];
  gemini_raw: string;
}

export interface EnvironmentalData {
  weather_condition: string;
  temperature_celsius: number;
  visibility: string;
  precipitation: string;
  wind_speed_kmh: number;
  road_conditions: string;
  contributing_factors: string[];
  data_timestamp: string;
}

export interface MarketData {
  average_repair_cost_usd: number;
  cost_range: { min: number; max: number };
  market_location: string;
  data_sources: string[];
  retrieved_at: string;
}

export interface FraudAssessment {
  confidence_score: number;   // 0–100
  fraud_risk: FraudRisk;
  reasoning: string[];
  model_version: string;
  claims_trained_on: number;
  processing_time_ms: number;
  flags: string[];
}

export interface ProcessingSteps {
  audio_received: boolean;
  audio_enhanced: boolean;
  transcript_ready: boolean;
  photos_analyzed: boolean;
  weather_fetched: boolean;
  pricing_fetched: boolean;
  fraud_scored: boolean;
  report_delivered: boolean;
}

export interface ClaimResolution {
  decision: DecisionType;
  decided_at: string;
  resolution_time_seconds: number;
  fnol_delivered: boolean;
  fnol_delivered_at: string | null;
  entire_task_id: string | null;
  entire_task_url: string | null;
  adjuster_notes: string | null;
}

// ─── FNOL Supplementary Types ─────────────────────────────────────────────

export interface OtherDriver {
  name: string;
  licence: string;
  insurer: string;
  policy_number: string;
  phone: string;
  vehicle: string;
}

export interface Witness {
  name: string;
  phone: string;
  statement: string;
}

export interface PoliceReport {
  filed: boolean;
  report_number: string;
  officer_name: string;
  station: string;
}

export interface ClaimObject {
  id: string;
  created_at: string;
  updated_at: string;

  // Identity
  user: ClaimUser;

  // Incident
  incident: ClaimIncident | null;

  // Voice / Audio
  voice: ClaimVoice | null;

  // Photos
  photos: ClaimPhotos | null;

  // Multimodal analysis (Gemini)
  damage_analysis: DamageAnalysis | null;

  // Environmental (Tavily)
  environmental: EnvironmentalData | null;

  // Market pricing (Tavily)
  market_data: MarketData | null;

  // Fraud / confidence (Pioneer)
  fraud_assessment: FraudAssessment | null;

  // Processing state
  status: ClaimStatus;
  processing_steps: ProcessingSteps;

  // Resolution
  resolution: ClaimResolution | null;

  // ─── Personal / Vehicle (Roadside) ────────────────────────────────────
  dob?: string;
  address?: string;
  phone?: string;
  licence_plate?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;

  // ─── FNOL state ───────────────────────────────────────────────────────
  photos_pending?: boolean;
  fnol_submitted?: boolean;
  fnol_pdf_url?: string | null;
  fnol_submitted_at?: string | null;
  fnol_status?: 'not_started' | 'generating' | 'review' | 'submitted' | 'failed';
  fnol_field_map_version?: string | null;

  // ─── Extended AI extraction fields ───────────────────────────────────────
  damage_zones_a?: string[] | null;
  damage_zones_b?: string[] | null;
  vehicle_a_heading?: string | null;
  vehicle_b_heading?: string | null;
  incident_road_type?: 'straight' | 'junction' | 'roundabout' | 'driveway' | 'other' | null;
  incident_circumstances?: number[] | null;

  // ─── FNOL supplementary data ──────────────────────────────────────────
  other_driver?: OtherDriver | null;
  witnesses?: Witness[];
  police_report?: PoliceReport | null;
  signature_data_url?: string;
}

// ─── API Response Types ────────────────────────────────────────────────────

export interface GradiumTranscriptResponse {
  transcript: string;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
  language: string;
  duration: number;
}

export interface AiCousticsResponse {
  enhanced_audio_url: string;
  stress_score: number;
  acoustic_sentiment: string;
  audio_quality_score: number;
  processing_time_ms: number;
}

export interface GeminiDamageResponse {
  damage_location: string;
  severity: DamageSeverity;
  estimated_repair_cost: { min: number; max: number; currency: string };
  damage_consistent_with_description: boolean;
  damage_details: string[];
  affected_parts: string[];
  // Extended fields (optional — populated when photos + transcript both present)
  damage_zones?: string[];
  incident_circumstances?: number[];
  vehicle_a_heading?: string;
  vehicle_b_heading?: string;
  incident_road_type?: 'straight' | 'junction' | 'roundabout' | 'driveway' | 'other';
  injuries_mentioned?: boolean;
  other_property_damage?: boolean;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  results: TavilySearchResult[];
  answer: string;
}

export interface PioneerResponse {
  confidence_score: number;
  fraud_risk: FraudRisk;
  reasoning: string[];
  model_version: string;
  claims_trained_on: number;
  processing_time_ms: number;
  flags: string[];
}

export interface EntireTaskResponse {
  task_id: string;
  task_url: string;
  status: string;
  created_at: string;
}
