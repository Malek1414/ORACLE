// ─── ORACLE Claim Processing Orchestrator ────────────────────────────────────────
// Coordinates all API integrations in the correct order.
// Gemini + Tavily fire in parallel once transcript is available.
// Pioneer scores last with the complete assembled claim.

import { ClaimObject, ClaimStatus } from '@/types/claim';
import { transcribeAudio } from './integrations/gradium';
import { enhanceAudio } from './integrations/ai-coustics';
import { analyseClaimWithGemini } from './integrations/gemini';
import { fetchEnvironmentalData, fetchMarketPricingData } from './integrations/tavily';
import { scoreClaim } from './integrations/pioneer';
import { escalateClaim } from './integrations/github-issues';
import { createServerClient } from './supabase';
import { CONFIDENCE_THRESHOLD } from './utils';

export type ProcessingEvent = {
  step: string;
  status: 'started' | 'completed' | 'failed';
  data?: Record<string, unknown>;
  claimUpdate?: Partial<ClaimObject>;
};

export async function processClaim(
  claimId: string,
  audioBlob: Blob,
  photoBase64Images: string[],
  onEvent: (event: ProcessingEvent) => void
): Promise<void> {
  const db = createServerClient();

  async function updateClaim(partial: Partial<ClaimObject>) {
    await db.from('claims').update({ ...partial, updated_at: new Date().toISOString() }).eq('id', claimId);
    onEvent({ step: 'db_update', status: 'completed', claimUpdate: partial });
  }

  try {
    // ─── STEP 1: Enhance audio (ai-coustics) ───────────────────────────────
    onEvent({ step: 'audio_enhancement', status: 'started' });
    await updateClaim({ status: 'enhancing' as ClaimStatus });

    const acousticData = await enhanceAudio(audioBlob);
    onEvent({ step: 'audio_enhancement', status: 'completed', data: acousticData as unknown as Record<string, unknown> });
    await updateClaim({
      status: 'transcribing' as ClaimStatus,
      processing_steps: { audio_received: true, audio_enhanced: true, transcript_ready: false, photos_analyzed: false, weather_fetched: false, pricing_fetched: false, fraud_scored: false, report_delivered: false },
    });

    // ─── STEP 2: Transcribe audio (Gradium) ────────────────────────────────
    onEvent({ step: 'transcription', status: 'started' });

    const transcriptData = await transcribeAudio(audioBlob, undefined, (chunk) => {
      onEvent({ step: 'transcript_chunk', status: 'completed', data: { chunk } });
    });

    onEvent({ step: 'transcription', status: 'completed', data: transcriptData as unknown as Record<string, unknown> });

    await updateClaim({
      voice: {
        recording_url: '',
        enhanced_audio_url: acousticData.enhanced_audio_url,
        transcript: transcriptData.transcript,
        stress_score: acousticData.stress_score,
        acoustic_sentiment: acousticData.acoustic_sentiment,
        duration_seconds: transcriptData.duration,
        audio_quality_score: acousticData.audio_quality_score,
      },
      processing_steps: { audio_received: true, audio_enhanced: true, transcript_ready: true, photos_analyzed: false, weather_fetched: false, pricing_fetched: false, fraud_scored: false, report_delivered: false },
      status: 'analyzing' as ClaimStatus,
    });

    // Get current claim for location
    const { data: currentClaim } = await db.from('claims').select('*').eq('id', claimId).single();
    const location = currentClaim?.incident?.location?.address || 'Unknown location';
    const incidentTime = currentClaim?.incident?.timestamp || new Date().toISOString();

    // ─── STEP 3: Parallel — Gemini analysis + Tavily intelligence ────────────
    onEvent({ step: 'parallel_analysis', status: 'started' });
    await updateClaim({ status: 'fetching_context' as ClaimStatus });

    const [geminiResult, weatherResult, pricingResult] = await Promise.allSettled([
      analyseClaimWithGemini(transcriptData.transcript, photoBase64Images),
      fetchEnvironmentalData(location, incidentTime),
      fetchMarketPricingData(
        currentClaim?.incident?.incident_type || 'vehicle damage',
        location
      ),
    ]);

    const damageAnalysis = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
    const environmental = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const marketData = pricingResult.status === 'fulfilled' ? pricingResult.value : null;

    await updateClaim({
      damage_analysis: damageAnalysis ? { ...damageAnalysis, gemini_raw: JSON.stringify(damageAnalysis) } : null,
      environmental,
      market_data: marketData,
      processing_steps: { audio_received: true, audio_enhanced: true, transcript_ready: true, photos_analyzed: !!damageAnalysis, weather_fetched: !!environmental, pricing_fetched: !!marketData, fraud_scored: false, report_delivered: false },
      status: 'scoring' as ClaimStatus,
    });

    onEvent({ step: 'parallel_analysis', status: 'completed', data: { damageAnalysis, environmental, marketData } as Record<string, unknown> });

    // ─── STEP 4: Pioneer fraud scoring ─────────────────────────────────
    onEvent({ step: 'fraud_scoring', status: 'started' });

    const { data: preScoringClaim } = await db.from('claims').select('*').eq('id', claimId).single();
    const pioneerResult = await scoreClaim(preScoringClaim);

    await updateClaim({
      fraud_assessment: pioneerResult,
      processing_steps: { audio_received: true, audio_enhanced: true, transcript_ready: true, photos_analyzed: !!damageAnalysis, weather_fetched: !!environmental, pricing_fetched: !!marketData, fraud_scored: true, report_delivered: false },
    });

    onEvent({ step: 'fraud_scoring', status: 'completed', data: pioneerResult as unknown as Record<string, unknown> });

    // ─── STEP 5: Decision + resolution ─────────────────────────────────
    const startTime = new Date(currentClaim?.created_at || Date.now()).getTime();
    const resolutionTimeSeconds = Math.round((Date.now() - startTime) / 1000);

    if (pioneerResult.confidence_score >= CONFIDENCE_THRESHOLD) {
      // AUTO-APPROVE
      await updateClaim({
        status: 'approved' as ClaimStatus,
        resolution: {
          decision: 'approved',
          decided_at: new Date().toISOString(),
          resolution_time_seconds: resolutionTimeSeconds,
          fnol_delivered: true,
          fnol_delivered_at: new Date().toISOString(),
          entire_task_id: null,
          entire_task_url: null,
          adjuster_notes: null,
        },
        processing_steps: { audio_received: true, audio_enhanced: true, transcript_ready: true, photos_analyzed: !!damageAnalysis, weather_fetched: !!environmental, pricing_fetched: !!marketData, fraud_scored: true, report_delivered: true },
      });
      onEvent({ step: 'decision', status: 'completed', data: { decision: 'approved', confidence: pioneerResult.confidence_score } });
    } else {
      // ESCALATE to GitHub Issues
      // Wrap in its own try/catch: a GitHub API failure must not flip the
      // decision to 'rejected'. The claim is below threshold regardless.
      onEvent({ step: 'escalation', status: 'started' });
      let ghResult = {
        task_id: 'N/A',
        task_url: '',
        status: 'open',
        created_at: new Date().toISOString(),
      };
      try {
        const { data: claimForEscalation } = await db.from('claims').select('*').eq('id', claimId).single();
        ghResult = await escalateClaim(claimForEscalation as ClaimObject);
      } catch (escErr) {
        console.error('[processClaim] GitHub escalation failed (claim still escalated):', escErr);
      }

      await updateClaim({
        status: 'escalated' as ClaimStatus,
        resolution: {
          decision: 'escalated',
          decided_at: new Date().toISOString(),
          resolution_time_seconds: resolutionTimeSeconds,
          fnol_delivered: false,
          fnol_delivered_at: null,
          entire_task_id: ghResult.task_id,
          entire_task_url: ghResult.task_url,
          adjuster_notes: null,
        },
      });
      onEvent({ step: 'escalation', status: 'completed', data: ghResult as unknown as Record<string, unknown> });
    }

  } catch (error) {
    console.error('Claim processing error:', error);
    await updateClaim({ status: 'rejected' as ClaimStatus });
    onEvent({ step: 'error', status: 'failed', data: { error: String(error) } });
    throw error;
  }
}
