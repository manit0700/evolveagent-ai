import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Github,
  ListChecks,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { RiskBadge } from '../components/shared/RiskBadge';
import {
  ChiefFollowup,
  ChiefOfStaffDashboard,
  ChiefOfStaffStatus,
  createChiefFollowup,
  fetchChiefFollowups,
  fetchChiefOfStaffDashboard,
  fetchChiefOfStaffStatus,
  generateChiefDailyPlan,
  generateChiefWeeklyPlan,
  updateChiefFollowupStatus,
} from '../data/api';

const priorityTone = (priority: string): 'low' | 'medium' | 'high' => {
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
};

export const ChiefOfStaffPage: React.FC = () => {
  const { showToast } = useApp();
  const [status, setStatus] = useState<ChiefOfStaffStatus | null>(null);
  const [dashboard, setDashboard] = useState<ChiefOfStaffDashboard | null>(null);
  const [followups, setFollowups] = useState<ChiefFollowup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  const refreshAll = async () => {
    const [s, d, f] = await Promise.all([
      fetchChiefOfStaffStatus(),
      fetchChiefOfStaffDashboard(),
      fetchChiefFollowups(),
    ]);
    setStatus(s);
    setDashboard(d);
    setFollowups(f?.followups ?? null);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDailyPlan = async () => {
    setBusy(true);
    try {
      const plan = await generateChiefDailyPlan();
      if (!plan) {
        showToast('Daily-plan endpoint unavailable', 'warning');
        return;
      }
      showToast('Daily plan generated.', 'success');
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const handleWeeklyPlan = async () => {
    setBusy(true);
    try {
      const plan = await generateChiefWeeklyPlan();
      if (!plan) {
        showToast('Weekly-plan endpoint unavailable', 'warning');
        return;
      }
      showToast('Weekly plan generated.', 'success');
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const handleAddFollowup = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const created = await createChiefFollowup(newTitle.trim(), newDue, newPriority);
      if (!created) {
        showToast('Could not create follow-up', 'warning');
        return;
      }
      setNewTitle('');
      setNewDue('');
      setNewPriority('medium');
      showToast('Follow-up added.', 'success');
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkDone = async (followupId: string) => {
    setBusy(true);
    try {
      const ok = await updateChiefFollowupStatus(followupId, 'done');
      if (!ok) {
        showToast('Could not update follow-up', 'warning');
        return;
      }
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const openFollowups = (followups || []).filter((f) => f.status === 'open');

  return (
    <div className="space-y-5 pb-8">
      <div className="ea-hero">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] border border-[var(--ea-line)] font-semibold uppercase tracking-wider">
                v180 Personal Chief of Staff
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold ea-ink tracking-tight">Chief of Staff</h1>
            <p className="text-xs sm:text-sm ea-soft leading-relaxed">
              Real priority ranking across goals, tasks, leads, risks, approvals, follow-ups — and open GitHub
              PRs/issues when configured.
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

      <GlassCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 ea-soft" />
          <h2 className="text-sm font-bold ea-ink">GitHub signal</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-mono ea-faint">Wired</div>
            <StatusBadge status={status?.githubWired ? 'connected' : 'disconnected'} size="sm" />
          </div>
          <div className="p-3 rounded-2xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-mono ea-faint">Repos configured</div>
            <div className="text-xs ea-ink font-mono">
              {status?.githubReposConfigured.length ? status.githubReposConfigured.join(', ') : `none — set ${status?.githubReposEnv || 'CHIEF_OF_STAFF_GITHUB_REPOS'}`}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-mono ea-faint">Items folded into priorities</div>
            <div className="text-xl font-semibold ea-ink">{dashboard?.githubItemsCount ?? 0}</div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-wider ea-faint">Open follow-ups</div>
          <div className="text-2xl font-semibold ea-ink">{dashboard?.openFollowups ?? '—'}</div>
        </GlassCard>
        <GlassCard className="space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-wider ea-faint">Overdue</div>
          <div className="text-2xl font-semibold text-amber-400">{dashboard?.overdueFollowups ?? '—'}</div>
        </GlassCard>
        <GlassCard className="space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-wider ea-faint">Blocked items</div>
          <div className="text-2xl font-semibold text-rose-400">{dashboard?.blockedItems ?? '—'}</div>
        </GlassCard>
        <GlassCard className="space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-wider ea-faint">Open risks</div>
          <div className="text-2xl font-semibold ea-ink">{dashboard?.riskSummary.openRiskCount ?? '—'}</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--ea-accent)]" />
                <h2 className="text-sm font-bold ea-ink">Today's plan</h2>
              </div>
              <button
                onClick={handleDailyPlan}
                disabled={busy}
                className="px-3 py-2 rounded-xl bg-[var(--ea-accent-soft)] hover:bg-cyan-500/25 border border-[var(--ea-line)] text-[var(--ea-accent)] font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate daily plan
              </button>
            </div>
            {dashboard?.dailyPlan ? (
              <>
                <p className="text-xs ea-soft">{dashboard.dailyPlan.summary}</p>
                <div className="space-y-2">
                  {dashboard.dailyPlan.topPriorities.map((item) => (
                    <div key={item.itemId} className="p-3 rounded-2xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--ea-surface-3)] ea-muted uppercase">{item.itemType}</span>
                          <span className="text-xs font-bold ea-ink truncate">{item.title}</span>
                        </div>
                        <p className="text-[11px] ea-faint">{item.reason}</p>
                        <p className="text-[11px] text-[var(--ea-accent)] mt-0.5">{item.recommendedAction}</p>
                      </div>
                      <span className="text-xs font-mono ea-muted shrink-0">{item.priorityScore}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs ea-faint font-mono">No daily plan yet — generate one.</div>
            )}
          </GlassCard>

          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold ea-ink">This week</h2>
              </div>
              <button
                onClick={handleWeeklyPlan}
                disabled={busy}
                className="px-3 py-2 rounded-xl bg-[var(--ea-surface-3)] hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] ea-soft font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                Generate weekly plan
              </button>
            </div>
            {dashboard?.weeklyPlan ? (
              <>
                <p className="text-xs ea-soft">{dashboard.weeklyPlan.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {dashboard.weeklyPlan.priorityThemes.map((t) => (
                    <span key={t.theme} className="text-[11px] font-mono px-2 py-1 rounded-lg bg-[var(--ea-surface-2)] border border-[var(--ea-line)] ea-soft">
                      {t.theme}: {t.count}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs ea-faint font-mono">No weekly plan yet — generate one.</div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="space-y-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold ea-ink">Follow-ups</h3>
            </div>
            <div className="flex gap-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New follow-up..."
                className="flex-1 min-w-0 rounded-xl bg-[var(--ea-surface-3)] border border-[var(--ea-line)] px-3 py-2 text-xs ea-ink placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleAddFollowup}
                disabled={busy || !newTitle.trim()}
                className="px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {openFollowups.length === 0 && (
                <div className="text-[11px] ea-faint font-mono py-2 text-center">No open follow-ups.</div>
              )}
              {openFollowups.map((f) => (
                <div key={f.followupId} className="flex items-center justify-between gap-2 p-2.5 rounded-xl ea-surface-3 border border-[var(--ea-line)]">
                  <div className="min-w-0">
                    <div className="text-xs ea-ink truncate">{f.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RiskBadge level={priorityTone(f.priority)} size="sm" />
                      {f.dueDate && <span className="text-[10px] font-mono ea-faint">{f.dueDate}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkDone(f.followupId)}
                    disabled={busy}
                    className="p-1.5 rounded-lg bg-[var(--ea-surface-3)] hover:bg-emerald-500/20 border border-[var(--ea-line)] ea-soft hover:text-emerald-300 transition-colors shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>

          {dashboard?.recommendedNextAction && (
            <GlassCard className="space-y-2 border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Recommended next action</h3>
              </div>
              <p className="text-xs ea-ink">{dashboard.recommendedNextAction}</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
