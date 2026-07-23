import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchWorkflowRuns, startDurableRun, LiveWorkflowRun } from '../data/api';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { RiskBadge } from '../components/shared/RiskBadge';
import { 
  Compass, 
  CheckSquare, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Play, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Check, 
  Cpu 
} from 'lucide-react';
import { TaskStatus } from '../types';

export const MissionControl: React.FC = () => {
  const { mission, tasks, agents, approvals, runMockWorkflowStep, showToast } = useApp();
  const [liveRuns, setLiveRuns] = useState<LiveWorkflowRun[] | null>(null);
  const [starting, setStarting] = useState(false);
  const loadRuns = () => fetchWorkflowRuns().then(setLiveRuns);
  useEffect(() => { loadRuns(); }, []);

  const handleStartRun = async () => {
    setStarting(true);
    try {
      const ok = await startDurableRun('Mission Control run', [
        { name: 'Collect mission context' },
        { name: 'Summarize progress' },
        { name: 'Notify on completion', action_type: 'notify', action_params: { message: 'Mission Control workflow complete' } },
      ]);
      showToast(ok ? 'Started a real durable workflow — the notify step is held for approval.' : 'Backend offline — could not start a real run.', ok ? 'success' : 'warning');
      if (ok) await loadRuns();
    } finally {
      setStarting(false);
    }
  };

  const handleApproveNext = () => {
    runMockWorkflowStep();
    showToast('Next recommended action approved & delegated to agents!', 'success');
  };

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'planned', label: 'Planned / Backlog', color: 'border-blue-500/30' },
    { id: 'running', label: 'In Progress / Running', color: 'border-[var(--ea-line-strong)]' },
    { id: 'waiting_approval', label: 'Waiting Approval', color: 'border-amber-500/40' },
    { id: 'completed', label: 'Completed', color: 'border-emerald-500/40' }
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* 1. Active Mission Overview Header Card */}
      <div className="ea-hero relative">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] border border-[var(--ea-line)] font-semibold uppercase tracking-wider">
                Active Mission #01
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Running
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold ea-ink tracking-tight">{mission.title}</h1>
            <p className="text-xs sm:text-sm ea-soft leading-relaxed">{mission.description}</p>
          </div>

          {/* Assigned Agents Avatars & Progress Radial/Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 shrink-0 bg-[var(--ea-surface-2)] p-4 rounded-2xl border border-[var(--ea-line)]">
            <div>
              <div className="text-[10px] font-mono uppercase ea-muted mb-1.5">Assigned Squad</div>
              <div className="flex items-center -space-x-2">
                {mission.assignedAgents.map((agId, idx) => {
                  const ag = agents.find(a => a.id === agId);
                  return (
                    <div
                      key={idx}
                      title={ag?.name}
                      className="w-9 h-9 rounded-full ea-surface-2 border-2 border-[#121216] flex items-center justify-center text-sm shadow-md"
                    >
                      {ag?.avatar || '🤖'}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full sm:w-44 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="ea-muted">Total Progress</span>
                <span className="text-[var(--ea-accent)] font-bold">{mission.progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--ea-surface-3)] overflow-hidden p-0.5 border border-[var(--ea-line)]">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${mission.progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live durable-workflow runs (real backend data) */}
      {liveRuns && liveRuns.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)]">
            <span className="text-sm font-bold ea-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Workflow Runs
            </span>
            <button
              onClick={handleStartRun}
              disabled={starting}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[var(--ea-accent-soft)] hover:bg-[var(--ea-accent)]/30 border border-[var(--ea-line)] text-[var(--ea-accent)] transition-colors disabled:opacity-50"
            >
              {starting ? 'Starting…' : '▶ Start real run'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
            {liveRuns.map(run => {
              const pct = run.total ? Math.round((run.done / run.total) * 100) : 0;
              const tone = run.status === 'completed' ? 'text-emerald-300' : run.status === 'waiting_approval' ? 'text-amber-300' : run.status === 'cancelled' ? 'ea-muted' : 'text-[var(--ea-accent)]';
              return (
                <div key={run.id} className="p-3 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium ea-soft truncate">{run.name}</span>
                    <span className={`text-[10px] font-mono ${tone}`}>{run.status.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-2 w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] ea-faint font-mono mt-1">{run.done}/{run.total} steps</div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* 2. Next Best Action Recommendation Banner */}
      <div className="p-4 rounded-2xl ea-surface-2 border border-[var(--ea-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[var(--ea-shadow-sm)]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] shrink-0">
            <Sparkles className="w-5 h-5 " style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--ea-accent)] uppercase tracking-wide font-mono">Recommended Next Action</div>
            <p className="text-xs sm:text-sm ea-ink font-medium mt-0.5">
              UI Design Agent recommends synthesizing the <span className="text-[var(--ea-accent)] font-bold">Agents Overview grid</span> and verifying Mock-Safe permission profiles next.
            </p>
          </div>
        </div>
        <button
          onClick={handleApproveNext}
          className="px-5 py-2.5 rounded-xl bg-[var(--ea-accent)] hover:brightness-110 text-[var(--ea-accent-ink)] font-semibold text-xs transition-all shadow-[var(--ea-shadow-sm)] flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Approve Next Task</span>
        </button>
      </div>

      {/* 3. Mission Phase Tracker (5 Phases Step Bar) */}
      <GlassCard>
        <h3 className="text-sm font-semibold ea-ink mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--ea-accent)]" />
          <span>Mission Phase Tracker</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {mission.phases.map((phase, idx) => {
            const isDone = phase.status === 'completed';
            const isCurr = phase.status === 'in_progress';
            return (
              <div
                key={phase.id}
                className={`p-3 rounded-xl border transition-all ${
                  isDone ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-300' :
                  isCurr ? 'bg-cyan-500/[0.08] border-[var(--ea-line-strong)] text-[var(--ea-accent)] shadow-md' :
                  'bg-white/[0.01] border-[var(--ea-line)] ea-faint'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span>Phase 0{idx + 1}</span>
                  <StatusBadge status={phase.status} size="sm" showIcon={false} />
                </div>
                <div className="text-xs font-semibold truncate ea-ink">{phase.title}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono opacity-80">
                  <span>{phase.completedCount}/{phase.tasksCount} tasks</span>
                  <span>{Math.round((phase.completedCount / phase.tasksCount) * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 4. Task Graph / Kanban Flow (4 columns) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold ea-ink flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[var(--ea-accent)]" />
            <span>Task Graph & Execution Pipeline</span>
          </h3>
          <span className="text-xs ea-muted font-mono">Showing {tasks.length} atomic operations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className={`p-4 rounded-2xl ea-surface border ${col.color} flex flex-col min-h-[350px]`}>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)] mb-3">
                  <span className="text-xs font-bold ea-ink uppercase tracking-wider font-mono">{col.label}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--ea-surface-3)] ea-soft">{colTasks.length}</span>
                </div>

                <div className="flex-1 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs ea-faint font-mono">No tasks in this state</div>
                  ) : (
                    colTasks.map(t => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl ea-surface-2 border border-[var(--ea-line)] hover:border-white/20 transition-all space-y-2 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-xs font-semibold ea-ink line-clamp-2">{t.title}</span>
                          <RiskBadge level={t.riskLevel} size="sm" />
                        </div>
                        <p className="text-[11px] ea-muted line-clamp-2">{t.description}</p>
                        <div className="pt-2 border-t border-[var(--ea-line)] flex items-center justify-between text-[10px] font-mono ea-faint">
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

      {/* 5. Mission Intelligence & Health Panel */}
      <GlassCard glow="purple">
        <h3 className="text-sm font-semibold ea-ink mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--ea-accent)]" />
          <span>Mission Intelligence & Agent Confidence Scores</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)]">
            <div className="text-xs font-mono ea-muted">Agent Confidence</div>
            <div className="text-2xl font-bold font-mono text-[var(--ea-accent)] mt-1">94%</div>
            <div className="text-[10px] text-emerald-400 mt-1">High predictability</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)]">
            <div className="text-xs font-mono ea-muted">Blockers Detected</div>
            <div className="text-2xl font-bold font-mono ea-ink mt-1">00</div>
            <div className="text-[10px] ea-faint mt-1">Smooth execution</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)]">
            <div className="text-xs font-mono ea-muted">Pending Approvals</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{approvals.filter(a => a.status === 'pending').length}</div>
            <div className="text-[10px] text-amber-300/80 mt-1">Gating external writes</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--ea-surface-2)] border border-[var(--ea-line)]">
            <div className="text-xs font-mono ea-muted">Sandboxing Mode</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">Active</div>
            <div className="text-[10px] ea-faint mt-1">Zero unplanned side effects</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
