import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getResend } from '@/lib/integrations/resend';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase();
  if (!username)
    return NextResponse.json({ error: 'username required' }, { status: 400 });

  const db = createServerClient();
  const { data, error } = await db
    .from('profiles')
    .select('id,username,name,email,phone,dob,address,policy_number,insurer,licence_plate,vehicle_make,vehicle_model,vehicle_year')
    .eq('username', username)
    .single();

  if (error || !data)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Notify the found user by email (best-effort, non-blocking)
  const callerUsername = req.nextUrl.searchParams.get('caller') ?? 'Another driver';
  if (data.email) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: 'ORACLE Claims <onboarding@resend.dev>',
        to: data.email,
        subject: `ORACLE — You have been added to a claim`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0060bf">ORACLE Claims — Notice</h2>
            <p>Hi <strong>${data.name}</strong>,</p>
            <p><strong>${callerUsername}</strong> has filed a claim that references you as the other driver involved in an incident.</p>
            <p>Your policy details have been automatically included in the report.</p>
            <p>If you believe this is an error, please contact your insurer directly.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
            <p style="font-size:12px;color:#999">ORACLE Claims Platform</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn('[lookup] email notification failed (non-fatal):', emailErr);
    }
  }

  return NextResponse.json({ profile: data });
}
