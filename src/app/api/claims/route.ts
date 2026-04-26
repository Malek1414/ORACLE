import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ClaimObject, ClaimStatus, ProcessingSteps } from '@/types/claim';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { user, incident } = body;

  if (!user?.policy_number || !user?.insurer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const claimId = uuidv4();
  const now = new Date().toISOString();

  try {
    const db = createServerClient();

    const processingSteps: ProcessingSteps = {
      audio_received: false,
      audio_enhanced: false,
      transcript_ready: false,
      photos_analyzed: false,
      weather_fetched: false,
      pricing_fetched: false,
      fraud_scored: false,
      report_delivered: false,
    };

    const newClaim: Partial<ClaimObject> = {
      id: claimId,
      created_at: now,
      updated_at: now,
      user,
      incident,
      voice: null,
      photos: null,
      damage_analysis: null,
      environmental: null,
      market_data: null,
      fraud_assessment: null,
      status: 'recording' as ClaimStatus,
      processing_steps: processingSteps,
      resolution: null,
    };

    const { data, error } = await db.from('claims').insert(newClaim).select().single();

    if (error) {
      console.error('DB insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ claim: data }, { status: 201 });
  } catch (err) {
    const msg = String(err);
    // Demo / no-Supabase mode: return a mock claim so the mobile flow completes
    if (msg.includes('env vars not configured') || msg.includes('supabaseUrl') || msg.includes('Invalid URL')) {
      const demoClaim: Partial<ClaimObject> = {
        id: claimId,
        created_at: now,
        updated_at: now,
        user,
        incident,
        voice: null,
        photos: null,
        damage_analysis: null,
        environmental: null,
        market_data: null,
        fraud_assessment: null,
        status: 'recording' as ClaimStatus,
        processing_steps: {
          audio_received: false, audio_enhanced: false, transcript_ready: false,
          photos_analyzed: false, weather_fetched: false, pricing_fetched: false,
          fraud_scored: false, report_delivered: false,
        },
        resolution: null,
      };
      return NextResponse.json({ claim: demoClaim, demo: true }, { status: 201 });
    }
    console.error('Create claim error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = createServerClient();
    const { data, error } = await db
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ claims: data });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('env vars not configured')) {
      // Demo mode — no Supabase connected
      return NextResponse.json({ claims: [], demo: true });
    }
    console.error('List claims error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
