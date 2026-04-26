import { NextResponse } from 'next/server';
import { seedDemoClaim, seedEscalatedClaim } from '@/lib/demo-seed';

export async function POST() {
  try {
    const [approved, escalated] = await Promise.all([
      seedDemoClaim(),
      seedEscalatedClaim(),
    ]);
    return NextResponse.json({ approved: approved.id, escalated: escalated.id });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
