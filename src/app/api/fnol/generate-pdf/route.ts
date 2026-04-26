import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateFnolPdf } from '@/lib/pdf/generate-fnol-pdf';
import { ClaimObject } from '@/types/claim';

export async function POST(req: NextRequest) {
  try {
    const { claimId, signatureDataUrl } = await req.json();
    if (!claimId) return NextResponse.json({ error: 'claimId required' }, { status: 400 });

    const { data, error } = await supabase.from('claims').select('*').eq('id', claimId).single();
    if (error || !data) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    const pdfBytes = await generateFnolPdf(data as ClaimObject, signatureDataUrl ?? null);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="fnol-${claimId.substring(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error('generate-pdf error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
