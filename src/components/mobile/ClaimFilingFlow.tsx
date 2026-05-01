'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { ConversationStep } from './ConversationStep';
import { ClaimIncident } from '@/types/claim';
import { CameraStep } from './CameraStep';
import { PersonalInfoStep } from './PersonalInfoStep';
import { ProcessingView } from './ProcessingView';
import { RoadsideResultScreen } from './RoadsideResultScreen';
import { ConfidenceResultScreen } from './ConfidenceResultScreen';

export type FilingStep = 'record' | 'camera' | 'personal_info' | 'processing' | 'confidence_result' | 'roadside_result';

function StepIndicator({ current }: { current: FilingStep }) {
  const steps = [
    { key: 'record', label: '1' },
    { key: 'camera', label: '2' },
    { key: 'personal_info', label: '3' },
  ] as const;
  const order = ['record', 'camera', 'personal_info', 'processing', 'roadside_result'];
  const curIdx = order.indexOf(current);
  if (curIdx >= 3) return null; // hide during processing / result

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map(({ key, label }, i) => {
        const done = i < curIdx;
        const active = key === current;
        return (
          <div key={key} className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full text-xs font-mono"
              style={{
                width: 28,
                height: 28,
                background: done ? 'var(--bg-soft)' : active ? 'var(--ink)' : 'var(--bg-elev)',
                border: `1px solid ${done || active ? 'var(--line)' : 'var(--line)'}`,
                color: active ? 'var(--bg)' : done ? 'var(--ink-3)' : 'var(--ink-4)',
                opacity: done ? 0.7 : 1,
                transition: 'all 0.25s',
              }}
            >
              {done ? '✓' : label}
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: i < curIdx ? 'var(--ink-4)' : 'var(--line)',
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ClaimFilingFlow() {
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [step, setStep] = useState<FilingStep>('record');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosPending, setPhotosPending] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [extractedIncident, setExtractedIncident] = useState<Partial<ClaimIncident> | null>(null);

  const handleConversationDone = useCallback((blob: Blob, incident?: Partial<ClaimIncident>) => {
    setAudioBlob(blob);
    setExtractedIncident(incident ?? null);
    setStep('camera');
  }, []);

  const handlePhotosDone = useCallback((capturedPhotos: string[], pending = false) => {
    setPhotos(capturedPhotos);
    setPhotosPending(pending);
    setStep('personal_info');
  }, []);

  const handlePersonalInfoDone = useCallback((id: string) => {
    setClaimId(id);
    setStep('processing');
  }, []);

  const handleProcessingDone = useCallback(() => setStep('confidence_result'), []);
  const handleConfidenceDone  = useCallback(() => setStep('roadside_result'), []);

  const handleViewClaims = useCallback(() => router.push('/my-claims'), [router]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <StepIndicator current={step} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {step === 'record'          && <ConversationStep onDone={handleConversationDone} apiRoute="/api/claims/gemini-converse" />}
        {step === 'camera'          && <CameraStep onDone={handlePhotosDone} />}
        {step === 'personal_info'   && (
          <PersonalInfoStep
            audioBlob={audioBlob!}
            photos={photos}
            photosPending={photosPending}
            extractedIncident={extractedIncident}
            onDone={handlePersonalInfoDone}
            profile={profile}
          />
        )}
        {step === 'processing'        && <ProcessingView onDone={handleProcessingDone} />}
        {step === 'confidence_result'  && <ConfidenceResultScreen onContinue={handleConfidenceDone} />}
        {step === 'roadside_result' && (
          <RoadsideResultScreen
            claimId={claimId!}
            photosPending={photosPending}
            onViewClaims={handleViewClaims}
          />
        )}
      </div>
    </div>
  );
}
