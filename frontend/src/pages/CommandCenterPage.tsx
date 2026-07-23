import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Circle,
  FileText,
  Gauge,
  History,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import {
  CommandCenterDashboard,
  CommandCenterReport,
  CommandCenterSnapshot,
  createCommandCenterSnapshot,
  fetchCommandCenterDashboard,
  fetchCommandCenterSnapshots,
  generateCommandCenterReport,
} from '../data/api';

const gradeTone = (grade: string) => {
  if (grade === 'A') return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (grade === 'B') return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  if (grade === 'C') return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
};

export const CommandCenterPage: React.FC = () => {
  const { showToast } = useApp();
  const [dashboard, setDashboard] = useState<CommandCenterDashboard | null>(null);
  const [snapshots, setSnapshots] = useState<CommandCenterSnapshot[] | null>(null);
  const [report, setReport] = useState<CommandCenterReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});

  const refreshAll = async () => {
    const [dash, snaps] = await Promise.all([fetchCommandCenterDashboard(), fetchCommandCenterSnapshots()]);
    setDashboard(dash);
    setSnapshots(snaps);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDomain = (domain: string) => {
    setOpenDomains((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  const handleSnapshot = async () => {
    setBusy(true);
    try {
      const snap = await createCommandCenterSnapshot();
      if (!snap) {
        showToast('Snapshot endpoint unavailable', 'warning');
        return;
      }
      showToast(`Snapshot created — grade ${snap.overallGrade}, ${snap.activeSystems}/${snap.totalSystems} systems active.`, 'success');
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const handleReport = async () => {
    setBusy(true);
    try {
      const rep = await generateCommandCenterReport();
      if (!rep) {
        showToast('Report endpoint unavailable', 'warning');
        return;
      }
      setReport(rep);
      showToast('Final platform report generated.', 'success');
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="ea-hero">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] border border-[var(--ea-line)] font-semibold uppercase tracking-wider">
                {dashboard?.version || 'v200.0'} Capstone
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold ea-ink tracking-tight">Command Center</h1>
            <p className="text-xs sm:text-sm ea-soft leading-relaxed">
              A live capability directory across every system this platform has built — which ones are wired to
              real data right now, and which are still dormant. {dashboard?.disclaimer}
            </p>
          </div>
          <button
            onClick={refreshAll}
            className="px-4 py-2.5 rounded-xl bg-[var(--ea-surface-3)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] text-xs ea-soft flex items-center justify-center gap-2 transition-colors self-start lg:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="space-y-1">
          <div className="flex items-center gap-2 ea-muted"><Layers className="w-4 h-4" /><span className="text-[10px] uppercase font-mono tracking-wider">Systems active</span></div>
          <div className="text-2xl font-semibold ea-ink">{dashboard?.activeSystems ?? '—'}<span className="text-sm ea-faint">/{dashboard?.totalSystems ?? '—'}</span></div>
        </GlassCard>
        <GlassCard className="space-y-1">
          <div className="flex items-center gap-2 ea-muted"><Gauge className="w-4 h-4" /><span className="text-[10px] uppercase font-mono tracking-wider">Coverage</span></div>
          <div className="text-2xl font-semibold ea-ink">{dashboard?.coveragePct ?? '—'}%</div>
        </GlassCard>
        <GlassCard className="space-y-1">
          <div className="flex items-center gap-2 ea-muted"><Sparkles className="w-4 h-4" /><span className="text-[10px] uppercase font-mono tracking-wider">Overall grade</span></div>
          <div className={`inline-flex text-2xl font-semibold px-2 rounded-lg border ${gradeTone(dashboard?.overallGrade || '')}`}>
            {dashboard?.overallGrade || '—'}
          </div>
        </GlassCard>
        <GlassCard className="space-y-1">
          <div className="flex items-center gap-2 ea-muted"><Activity className="w-4 h-4" /><span className="text-[10px] uppercase font-mono tracking-wider">Health</span></div>
          <StatusBadge status={dashboard?.healthStatus || 'unknown'} size="sm" />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {!dashboard ? (
            <GlassCard><div className="text-xs ea-faint font-mono py-8 text-center">Loading command center...</div></GlassCard>
          ) : dashboard.domains.map((d) => (
            <GlassCard key={d.domain} className="space-y-0" padding="none">
              <button
                onClick={() => toggleDomain(d.domain)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--ea-surface-2)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold ea-ink">{d.domain}</span>
                  <span className="text-[11px] font-mono ea-faint">{d.activeCount}/{d.systemCount} active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-[var(--ea-surface-3)] overflow-hidden">
                    <div
                      className={`h-full ${d.activeCount === d.systemCount ? 'bg-emerald-400' : d.activeCount === 0 ? 'bg-rose-400' : 'bg-amber-400'}`}
                      style={{ width: `${d.systemCount ? (d.activeCount / d.systemCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </button>
              {openDomains[d.domain] !== false && (
                <div className="px-4 pb-4 space-y-1.5 border-t border-[var(--ea-line)] pt-3">
                  {d.systems.map((s) => (
                    <div key={s.route + s.label} className="flex items-center justify-between gap-2 p-2 rounded-xl ea-surface-3 border border-[var(--ea-line)]">
                      <div className="flex items-center gap-2 min-w-0">
                        {s.active ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                        <span className="text-xs ea-ink truncate">{s.label}</span>
                        <span className="text-[10px] font-mono ea-faint truncate hidden sm:inline">{s.route}</span>
                      </div>
                      <span className="text-[11px] font-mono ea-muted shrink-0">{s.recordCount.toLocaleString()} rec.</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          ))}
        </div>

        <div className="space-y-6">
          <GlassCard className="space-y-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[var(--ea-accent)]" />
              <h3 className="text-sm font-bold ea-ink">Scorecard dimensions</h3>
            </div>
            <div className="space-y-2">
              {(dashboard?.scoreDimensions || []).map((dim) => (
                <div key={dim.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="ea-muted capitalize">{dim.name.replace(/_/g, ' ')}</span>
                    <span className={`px-1.5 rounded ${gradeTone(dim.grade)}`}>{dim.grade} · {dim.score}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--ea-surface-3)] overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${dim.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold ea-ink">Safety boundaries</h3>
            </div>
            <ul className="space-y-1.5">
              {(dashboard?.safetyBoundaries || []).map((b) => (
                <li key={b} className="text-[11px] ea-muted leading-relaxed flex gap-1.5">
                  <span className="text-emerald-400">•</span><span>{b}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold ea-ink">Snapshots</h3>
              <span className="text-[11px] font-mono ea-faint">{snapshots?.length ?? 0}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSnapshot}
                disabled={busy}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--ea-accent-soft)] hover:bg-cyan-500/25 border border-[var(--ea-line)] text-[var(--ea-accent)] font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                Create snapshot
              </button>
              <button
                onClick={handleReport}
                disabled={busy}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--ea-surface-3)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] ea-soft font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate report
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {(snapshots || []).slice(0, 10).map((s) => (
                <div key={s.snapshotId} className="flex items-center justify-between text-[11px] font-mono p-2 rounded-lg ea-surface-3 border border-[var(--ea-line)]">
                  <span className="ea-muted">{s.createdAt ? s.createdAt.slice(0, 16).replace('T', ' ') : '—'}</span>
                  <span className={`px-1.5 rounded ${gradeTone(s.overallGrade)}`}>{s.overallGrade} · {s.coveragePct}%</span>
                </div>
              ))}
              {snapshots && snapshots.length === 0 && (
                <div className="text-[11px] ea-faint font-mono py-2 text-center">No snapshots yet.</div>
              )}
            </div>
          </GlassCard>

          {report && (
            <GlassCard className="space-y-2 border-emerald-500/20">
              <div className="text-[10px] uppercase tracking-wider font-mono text-emerald-300">Latest report</div>
              <p className="text-xs ea-ink leading-relaxed">{report.headline}</p>
              <p className="text-[11px] ea-faint italic">{report.disclaimer}</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
