'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronRight, Loader2 } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';
import { ClaimIncident } from '@/types/claim';
import { supabase } from '@/lib/supabase';

interface Props {
  audioBlob: Blob;
  photos: string[];
  photosPending: boolean;
  extractedIncident?: Partial<ClaimIncident> | null;
  onDone: (claimId: string) => void;
}

export function PersonalInfoStep({ audioBlob, photos, photosPending, extractedIncident, onDone }: Props) {
  const { savedUser, setSavedUser, setActiveClaim, setLiveTranscript } = useClaimStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: savedUser?.name || '',
    email: savedUser?.email || '',
    policy_number: savedUser?.policy_number || '',
    insurer: savedUser?.insurer || '',
    dob: '',
    address: '',
    phone: '',
    licence_plate: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
  });

  const [location, setLocation] = useState({ lat: 40.7128, lng: -74.006, address: 'Detecting location...' });
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            setLocation({ lat, lng, address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          } catch {
            setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          }
        },
        () => setLocation({ lat: 40.7128, lng: -74.006, address: 'New York, NY' })
      );
    }
  }, []);

  const field = (key: keyof typeof form, label: string, placeholder: string, type = 'text') => (
    <div key={key}>
      <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: 'var(--ink-3)' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14,
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
          fontFamily: 'var(--font-sans)', transition: 'border-color 0.2s',
        }}
      />
    </div>
  );

  const handleSubmit = async () => {
    if (!form.name || !form.policy_number || !form.insurer) return;
    setSubmitting(true);
    setSubmitError(null);
    setSavedUser({ name: form.name, email: form.email, policy_number: form.policy_number, insurer: form.insurer });
    setLiveTranscript('');

    try {
      const claimRes = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: crypto.randomUUID(), name: form.name, email: form.email, policy_number: form.policy_number, insurer: form.insurer },
          incident: {
            description:       extractedIncident?.description     ?? '',
            location:          extractedIncident?.location
              ? { ...extractedIncident.location, lat: location.lat, lng: location.lng, country: 'US' }
              : { ...location, city: '', country: 'US' },
            timestamp:         extractedIncident?.timestamp        ?? new Date().toISOString(),
            vehicles_involved: extractedIncident?.vehicles_involved ?? [],
            incident_type:     extractedIncident?.incident_type    ?? 'vehicle_collision',
          },
        }),
      });

      const claimBody = await claimRes.json();
      if (!claimRes.ok || !claimBody.claim?.id) {
        throw new Error(claimBody.error || `Server error ${claimRes.status}.`);
      }

      const { claim } = claimBody;
      setActiveClaim(claim);

      // Save extended personal / vehicle fields
      await supabase.from('claims').update({
        dob:           form.dob           || null,
        address:       form.address       || null,
        phone:         form.phone         || null,
        licence_plate: form.licence_plate || null,
        vehicle_make:  form.vehicle_make  || null,
        vehicle_model: form.vehicle_model || null,
        vehicle_year:  form.vehicle_year  || null,
        photos_pending: photosPending,
      }).eq('id', claim.id);

      // Fire processing in background
      const fd = new FormData();
      fd.append('audio', audioBlob, 'recording.webm');
      photos.forEach((p) => {
        const arr = p.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
        const bstr = atob(arr[1]);
        const bytes = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
        fd.append('photo', new Blob([bytes], { type: mime }));
      });
      fetch(`/api/claims/${claim.id}/process`, { method: 'POST', body: fd });

      onDone(claim.id);
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px max(env(safe-area-inset-bottom,0px),24px)', background: 'var(--bg)', overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div className="animate-live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live-dot)' }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Oracle Claims</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Your details</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>Policy &amp; vehicle information</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', margin: 0 }}>Policy</p>
        {field('name',          'Full name',           'Jane Smith')}
        {field('email',         'Email address',       'jane@email.com', 'email')}
        {field('policy_number', 'Policy number',       'POL-12345678')}
        {field('insurer',       'Insurance provider',  'Allianz')}
        {field('dob',           'Date of birth',       'DD/MM/YYYY', 'text')}
        {field('phone',         'Phone number',        '+1 555 000 0000', 'tel')}
        {field('address',       'Home address',        '123 Main St, City, State')}

        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', margin: '8px 0 0' }}>Vehicle</p>
        {field('licence_plate', 'Licence plate',       'ABC-1234')}
        {field('vehicle_make',  'Vehicle make',        'Toyota')}
        {field('vehicle_model', 'Vehicle model',       'Camry')}
        {field('vehicle_year',  'Vehicle year',        '2021')}
      </div>

      {/* Location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <div className="animate-live-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#2A7E4A', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location.address}</span>
      </div>

      {submitError && (
        <div style={{
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 12,
          padding: '12px 16px',
          fontSize: 13,
          color: '#fca5a5',
          marginBottom: 12,
          lineHeight: 1.5,
        }}>
          {submitError}
        </div>
      )}

      <motion.button
        onClick={handleSubmit}
        disabled={submitting || !form.name || !form.policy_number || !form.insurer}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 22px', borderRadius: 999,
          background: submitting || !form.name || !form.policy_number || !form.insurer ? 'var(--bg-elev)' : 'var(--ink)',
          color: submitting || !form.name || !form.policy_number || !form.insurer ? 'var(--ink-4)' : 'var(--bg)',
          border: '1px solid var(--line)', fontSize: 14, fontWeight: 400, cursor: 'pointer',
          fontFamily: 'var(--font-sans)', transition: 'background 0.2s, color 0.2s',
        }}
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
        {submitting ? 'Submitting…' : 'Submit Claim'}
      </motion.button>
    </div>
  );
}
