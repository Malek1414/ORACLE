'use client';

import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useClaimStore } from '@/store/claim-store';
import { formatDuration } from '@/lib/utils';

export function AnalyticsPanel() {
  const { claims } = useClaimStore();

  const stats = useMemo(() => {
    const total = claims.length;
    const approved = claims.filter((c) => c.status === 'approved').length;
    const escalated = claims.filter((c) => c.status === 'escalated').length;
    const resolved = claims.filter((c) => c.resolution?.resolution_time_seconds);
    const avgResolution = resolved.length
      ? Math.round(resolved.reduce((sum, c) => sum + (c.resolution?.resolution_time_seconds || 0), 0) / resolved.length)
      : 0;
    const escalationRate = total ? Math.round((escalated / total) * 100) : 0;
    const approvalRate = total ? Math.round((approved / total) * 100) : 0;

    // Accuracy trend (Pioneer confidence over last 10 claims)
    const withScores = claims
      .filter((c) => c.fraud_assessment)
      .slice(0, 10)
      .reverse()
      .map((c, i) => ({ i: i + 1, score: c.fraud_assessment!.confidence_score }));

    return { total, approved, escalated, avgResolution, escalationRate, approvalRate, accuracyTrend: withScores };
  }, [claims]);

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ink-3)' }}>Analytics</span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Claims', value: stats.total, color: 'var(--ink)' },
          { label: 'Auto-Approved', value: `${stats.approvalRate}%`, color: 'var(--green)' },
          { label: 'Avg Resolution', value: stats.avgResolution ? formatDuration(stats.avgResolution) : '—', color: 'var(--ink)' },
          { label: 'Escalation Rate', value: `${stats.escalationRate}%`, color: stats.escalationRate > 20 ? 'var(--amber)' : 'var(--ink)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--ink-3)' }}>{label}</p>
            <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Confidence trend chart */}
      {stats.accuracyTrend.length > 1 && (
        <div>
          <p className="text-xs font-mono mb-2" style={{ color: 'var(--ink-3)' }}>Pioneer Confidence Trend</p>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={stats.accuracyTrend}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="i" hide />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v}`, 'Confidence']}
              />
              <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
