'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronRight, Loader2 } from 'lucide-react';
import { useClaimStore } from '@/store/claim-store';

import { ClaimIncident } from '@/types/claim';

interface Props {
  audioBlob: Blob;
  photos: string[];
  extractedIncident?: Partial<ClaimIncident> | null;
  onDone: () => void;
}

export function PolicyStep({ audioBlob, photos, extractedIncident, onDone }: Props) {
  const { savedUser, setSavedUser, setActiveClaim, setLiveTranscript } = useClaimStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: savedUser?.name || '',
    email: savedUser?.email || '',
    policy_number: savedUser?.policy_number || '',
    insurer: savedUser?.insurer || '',
  });

  // Get geolocation
  const [location, setLocation] = useState({ lat: 40.7128, lng: -74.006, address: 'Detecting location...' });
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          // Reverse geocode
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

  const handleSubmit = async () => {
    if (!form.name || !form.policy_number || !form.insurer) return;
    setSubmitting(true);
    setSubmitError(null);
    setSavedUser(form);
    setLiveTranscript('');

    try {
      // Create claim record
      const claimRes = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: crypto.randomUUID(), ...form },
          incident: {
            description:        extractedIncident?.description     ?? '',
            location:           extractedIncident?.location
              ? { ...extractedIncident.location, lat: location.lat, lng: location.lng, country: 'US' }
              : { ...location, city: '', country: 'US' },
            timestamp:          extractedIncident?.timestamp        ?? new Date().toISOString(),
            vehicles_involved:  extractedIncident?.vehicles_involved ?? [],
            incident_type:      extractedIncident?.incident_type    ?? 'vehicle_collision',
          },
        }),
      });

      const claimBody = await claimRes.json();

      if (!claimRes.ok || !claimBody.claim?.id) {
        throw new Error(
          claimBody.error ||
          `Server error ${claimRes.status}. Check that your Supabase connection is configured.`
        );
      }

      const { claim } = claimBody;
      setActiveClaim(claim);

      // Build FormData and fire processing (fire-and-forget — results come via Supabase realtime)
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

      onDone();
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px max(env(safe-area-inset-bottom,0px),24px)', background: 'var(--bg)' }}>
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--ink-2)' }}>ORACLE CLAIMS</span>
        </div>
        <h1 className="text-2xl font-semibold">Policy details</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>Saved after first submission</p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {[
          { key: 'name', label: 'Full name', placeholder: 'Jane Smith', type: 'text' },
          { key: 'email', label: 'Email address', placeholder: 'jane@email.com', type: 'email' },
          { key: 'policy_number', label: 'Policy number', placeholder: 'POL-12345678', type: 'text' },
          { key: 'insurer', label: 'Insurance provider', placeholder: 'State Farm', type: 'text' },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ink-2)' }}>{label}</label>
            <input
              type={type}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-8 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <div className="w-2 h-2 rounded-full animate-live-pulse" style={{ background: 'var(--green)', flexShrink: 0 }} />
        <span className="text-xs truncate" style={{ color: 'var(--ink-2)' }}>{location.address}</span>
      </div>

      <div className="flex-1" />

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
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-semibold text-lg disabled:opacity-50"
        style={{ background: 'var(--accent)', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}
      >
        {submitting ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
        {submitting ? 'Submitting…' : 'Submit Claim'}
      </motion.button>
    </div>
  );
}
