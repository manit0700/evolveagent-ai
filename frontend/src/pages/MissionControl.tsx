import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fetchWorkflowRuns, startDurableRun, LiveWorkflowRun } from '../data/api';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { RiskBadge } from '../components/shared/RiskBadge';
import { PageHero } from '../components/shared/PageHero';
import {
  CheckSquare,
  Sparkles,
  Check,
  Activity,
  Layers,
} from 'lucide-react';
import { TaskStatus } from '../types';

export const MissionControl: React.FC = () => {
  const { mission, tasks, agents, approvals, runMockWorkflowStep, showToast } = useApp();
  const [liveRuns, setLiveRuns] = useState<LiveWorkflowRun[] | null>(null);
  const [starting, setStarting] = useState(false);

  const loadRuns = () => fetchWorkflowRuns().then(setLiveRuns);
  useEffect(() => {
    loadRuns();
  }, []);

  const handleStartRun = async () => {
    setStarting(true);
    try {
      const ok = await startDurableRun('Mission Control run', [
        { name: 'Collect mission context' },
        { name: 'Summarize progress' },
        {
          name: 'Notify on completion',
          action_type: 'notify',
          action_params: { message: 'Mission Control workflow complete' },
        },
      ]);
      showToast(
        ok
          ? 'Started a real durable workflow — the notify step is held for approval.'
          : 'Backend offline — could not start a real run.',
        ok ? 'success' : 'warning'
      );
      if (ok) await loadRuns();
    } finally {
      setStarting(false);
    }
  };

  const handleApproveNext = () => {
    runMockWorkflowStep();
    showToast('Next recommended action approved & delegated to agents!', 'success');
  };

  const columns: { id: TaskStatus; label: string }[] = [
    { id: 'planned', label: 'Planned' },
    { id: 'running', label: 'In progress' },
    { id: 'waiting_approval', label: 'Waiting' },
    { id: 'completed', label: 'Done' },
  ];

  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        eyebrow="Active mission"
        title={mission.title}
        description={mission.description}
        actions={
          <button type="button" onClick={handleStartRun} disabled={starting} className="ea-btn ea-btn--primary disabled:opacity-50">
            {starting ? 'Starting…' : 'Start real run'}
          </button>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {mission.assignedAgents.map((agId) => {
                const ag = agents.find((a) => a.id === agId);
                return (
                  <div
                    key={agId}
                    title={ag?.name}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ea-surface)] ea-surface-3 text-sm"
                  >
                    {ag?.avatar || '🤖'}
                  </div>
                );
              })}
            </div>
            <div>
              <div className="text-[11px] ea-muted">Assigned squad</div>
              <div className="text-xs font-medium ea-ink">{mission.assignedAgents.length} agents · running</div>
            </div>
          </div>

          <div className="w-full sm:max-w-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="ea-muted">Progress</span>
              <span className="font-semibold text-[var(--ea-accent)]">{mission.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full ea-surface-3">
              <div className="h-full rounded-full bg-[var(--ea-accent)]" style={{ width: `${mission.progress}%` }} />
            </div>
          </div>
        </div>
      </PageHero>

      {liveRuns && liveRuns.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between border-b border-[var(--ea-line)] pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--ea-success)]" />
              <h3 className="text-sm font-semibold ea-ink">Live workflow runs</h3>
            </div>
            <button type="button" onClick={handleStartRun} disabled={starting} className="ea-btn text-xs py-1.5 disabled:opacity-50">
              {starting ? 'Starting…' : 'New run'}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {liveRuns.map((run) => {
              const pct = run.total ? Math.round((run.done / run.total) * 100) : 0;
              return (
                <div key={run.id} className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium ea-ink">{run.name}</span>
                    <span className="shrink-0 text-[11px] capitalize ea-muted">{run.status.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full ea-surface-3">
                    <div className="h-full rounded-full bg-[var(--ea-accent)]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] ea-faint">
                    {run.done}/{run.total} steps
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <section className="flex flex-col gap-3 rounded-[var(--ea-radius)] border border-[var(--ea-line)] ea-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-[var(--ea-radius-sm)] bg-[var(--ea-accent-soft)] p-2.5 text-[var(--ea-accent)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ea-accent)]">Next best action</div>
            <p className="mt-0.5 text-sm ea-ink">
              Synthesize the Agents overview grid and verify mock-safe permission profiles.
            </p>
          </div>
        </div>
        <button type="button" onClick={handleApproveNext} className="ea-btn ea-btn--primary shrink-0 self-start sm:self-auto">
          <Check className="h-4 w-4" />
          Approve next task
        </button>
      </section>

      <GlassCard>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold ea-ink">
          <Layers className="h-4 w-4 text-[var(--ea-accent)]" />
          Phase tracker
        </h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          {mission.phases.map((phase, idx) => {
            const isDone = phase.status === 'completed';
            const isCurr = phase.status === 'in_progress';
            return (
              <div
                key={phase.id}
                className={`rounded-[var(--ea-radius-sm)] border p-3 ${
                  isDone
                    ? 'border-transparent bg-[var(--ea-success-soft)]'
                    : isCurr
                      ? 'border-transparent bg-[var(--ea-accent-soft)]'
                      : 'border-[var(--ea-line)] ea-surface-2'
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] ea-muted">
                  <span>Phase {idx + 1}</span>
                  <StatusBadge status={phase.status} size="sm" showIcon={false} />
                </div>
                <div className="truncate text-xs font-semibold ea-ink">{phase.title}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] ea-faint">
                  <span>
                    {phase.completedCount}/{phase.tasksCount}
                  </span>
                  <span>{Math.round((phase.completedCount / phase.tasksCount) * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold ea-ink">
            <CheckSquare className="h-4 w-4 text-[var(--ea-accent)]" />
            Task pipeline
          </h3>
          <span className="text-xs ea-muted">{tasks.length} tasks</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="flex min-h-[20rem] flex-col rounded-[var(--ea-radius)] border border-[var(--ea-line)] ea-surface p-3">
                <div className="mb-3 flex items-center justify-between border-b border-[var(--ea-line)] pb-2">
                  <span className="text-xs font-semibold ea-ink">{col.label}</span>
                  <span className="ea-chip">{colTasks.length}</span>
                </div>
                <div className="flex-1 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs ea-faint">Empty</div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="space-y-2 rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-xs font-semibold ea-ink">{t.title}</span>
                          <RiskBadge level={t.riskLevel} size="sm" />
                        </div>
                        <p className="line-clamp-2 text-[11px] ea-muted">{t.description}</p>
                        <div className="flex items-center justify-between border-t border-[var(--ea-line)] pt-2 text-[10px] ea-faint">
                          <span className="text-[var(--ea-accent)]">{t.assignedAgentName}</span>
                          <span>{t.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GlassCard>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold ea-ink">
          <Activity className="h-4 w-4 text-[var(--ea-accent)]" />
          Mission health
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Confidence', value: '94%', hint: 'Stable', tone: 'accent' as const },
            { label: 'Blockers', value: '0', hint: 'Clear', tone: 'ok' as const },
            { label: 'Approvals', value: String(pendingApprovals), hint: 'Gating writes', tone: 'warn' as const },
            { label: 'Sandbox', value: 'On', hint: 'Mock-safe', tone: 'ok' as const },
          ].map((m) => (
            <div key={m.label} className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-3 text-center">
              <div className="text-[11px] ea-muted">{m.label}</div>
              <div
                className={`mt-1 text-2xl font-semibold tabular-nums ${
                  m.tone === 'ok'
                    ? 'text-[var(--ea-success)]'
                    : m.tone === 'warn'
                      ? 'text-[var(--ea-warn)]'
                      : 'text-[var(--ea-accent)]'
                }`}
              >
                {m.value}
              </div>
              <div className="mt-1 text-[10px] ea-faint">{m.hint}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
