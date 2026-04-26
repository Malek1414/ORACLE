import { NextRequest, NextResponse } from 'next/server';
import { processClaim } from '@/lib/claim-processor';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const photosJson = formData.get('photos') as string | null;
    const photoBlobs = formData.getAll('photo') as Blob[];

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 });
    }

    // Convert photos to base64
    const photoBase64: string[] = [];
    if (photoBlobs.length > 0) {
      for (const blob of photoBlobs) {
        const buffer = await blob.arrayBuffer();
        const b64 = Buffer.from(buffer).toString('base64');
        const mimeType = blob.type || 'image/jpeg';
        photoBase64.push(`data:${mimeType};base64,${b64}`);
      }
    } else if (photosJson) {
      const parsed = JSON.parse(photosJson);
      photoBase64.push(...parsed);
    }

    // Update claim with photo count
    const db = createServerClient();
    await db.from('claims').update({
      photos: {
        urls: [],
        count: photoBase64.length,
        captured_at: new Date().toISOString(),
      },
      processing_steps: {
        audio_received: true,
        audio_enhanced: false,
        transcript_ready: false,
        photos_analyzed: false,
        weather_fetched: false,
        pricing_fetched: false,
        fraud_scored: false,
        report_delivered: false,
      },
    }).eq('id', id);

    // Return immediately — process in background
    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          await processClaim(id, audioFile, photoBase64, (event) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          });
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ step: 'error', status: 'failed', data: { error: String(err) } })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });

  } catch (err) {
    console.error('Process claim error:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
