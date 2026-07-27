import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  fetchWorkflowRuns,
  startDurableRun,
  LiveWorkflowRun,
  runMissionTask,
  updateMissionTaskStatus,
} from '../data/api';
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
import { Task, TaskStatus } from '../types';

export const MissionControl: React.FC = () => {
  const { mission, tasks, agents, approvals, advanceWorkflowStep, showToast, refreshLive, liveConnected, setActivePage } = useApp();
  const [liveRuns, setLiveRuns] = useState<LiveWorkflowRun[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const loadRuns = () => fetchWorkflowRuns().then(setLiveRuns);
  useEffect(() => { loadRuns(); }, []);

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const runningTasks = tasks.filter(t => t.status === 'running').length;
  const waitingTasks = tasks.filter(t => t.status === 'waiting_approval').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked' || t.status === 'failed').length;
  const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
  const avgAgentConfidence = agents.length
    ? Math.round(agents.reduce((total, agent) => total + (Number(agent.qualityScore) || 0), 0) / agents.length)
    : 0;
  const derivedProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : mission.progress;
  const visibleProgress = tasks.length ? derivedProgress : mission.progress;
  const nextTask = tasks.find(t => t.status === 'waiting_approval')
    || tasks.find(t => t.status === 'running')
    || tasks.find(t => t.status === 'planned')
    || tasks.find(t => t.status !== 'completed');

  const explainTaskStatus = (status: TaskStatus) => {
    if (status === 'planned') {
      return {
        label: 'Ready to start',
        nextAction: 'Start Task',
        explanation: 'This task is planned and waiting for an agent to begin.',
        tone: 'text-blue-300',
      };
    }
    if (status === 'running') {
      return {
        label: 'Agent working',
        nextAction: 'Mark Done',
        explanation: 'An agent is working on this task. Mark it done after you verify the result.',
        tone: 'text-cyan-300',
      };
    }
    if (status === 'waiting_approval') {
      return {
        label: 'Needs approval',
        nextAction: 'Review Approval',
        explanation: 'The task is paused until you approve or reject the requested action.',
        tone: 'text-amber-300',
      };
    }
    if (status === 'completed') {
      return {
        label: 'Done',
        nextAction: 'View Result',
        explanation: 'This task is complete and counted in mission progress.',
        tone: 'text-emerald-300',
      };
    }
    return {
      label: 'Needs review',
      nextAction: 'Reopen Task',
      explanation: 'This task hit a blocker or failed. Reopen it after you understand the issue.',
      tone: 'text-rose-300',
    };
  };

  const refreshMission = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshLive(), loadRuns()]);
      showToast('Mission Control refreshed from the backend.', 'success');
    } finally {
      setRefreshing(false);
    }
  };

  const runTaskAction = async (task: Task) => {
    const guide = explainTaskStatus(task.status);
    if (task.status === 'waiting_approval') {
      setActivePage('approvals');
      showToast(`Open Approvals to review "${task.title}".`, 'info');
      return;
    }
    if (task.status === 'completed') {
      showToast(`"${task.title}" is complete. Check the task result summary in backend metadata.`, 'success');
      return;
    }

    setActionBusyId(task.id);
    try {
      if (liveConnected && mission.id) {
        if (task.status === 'planned') {
          const result = await runMissionTask(mission.id, task.id);
          if (!result) {
            showToast(`Backend could not run "${task.title}". Check the server and try again.`, 'warning');
            return;
          }
          await Promise.all([refreshLive(), loadRuns()]);
          showToast(
            result.requiresApproval
              ? `"${task.title}" ran and is now waiting for approval.`
              : `"${task.title}" ran through the agent workflow.`,
            result.requiresApproval ? 'warning' : 'success',
          );
          return;
        }

        if (task.status === 'running') {
          const updated = await updateMissionTaskStatus(mission.id, task.id, 'completed');
          if (!updated) {
            showToast(`Backend could not mark "${task.title}" done.`, 'warning');
            return;
          }
          await refreshLive();
          showToast(`Marked "${task.title}" done in Mission Control.`, 'success');
          return;
        }

        if (task.status === 'blocked' || task.status === 'failed') {
          const updated = await updateMissionTaskStatus(mission.id, task.id, 'planned');
          if (!updated) {
            showToast(`Backend could not reopen "${task.title}".`, 'warning');
            return;
          }
          await refreshLive();
          showToast(`Reopened "${task.title}" for another agent pass.`, 'success');
          return;
        }
      }

      advanceWorkflowStep();
      showToast(`${guide.nextAction}: "${task.title}" delegated locally. Backend is offline.`, 'warning');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleStartRun = async () => {
    setStarting(true);
    try {
      const ok = await startDurableRun('Mission Control run', [
        { name: 'Collect mission context' },
        { name: 'Summarize progress' },
        { name: 'Notify on completion', action_type: 'notify', action_params: { message: 'Mission Control workflow complete' } },
      ]);
      showToast(ok ? 'Started a real durable workflow — the notify step is held for approval.' : 'Backend unavailable — could not start a live run.', ok ? 'success' : 'warning');
      if (ok) await loadRuns();
    } finally {
      setStarting(false);
    }
  };

  const handleApproveNext = () => {
    if (!nextTask) {
      showToast('No next task is available. Create a new goal from Chat.', 'info');
      return;
    }
    void runTaskAction(nextTask);
  };

  const columns: { ids: TaskStatus[]; label: string; color: string }[] = [
    { ids: ['planned'], label: 'Planned / Backlog', color: 'border-blue-500/30' },
    { ids: ['running'], label: 'In Progress / Running', color: 'border-cyan-500/40' },
    { ids: ['waiting_approval'], label: 'Waiting Approval', color: 'border-amber-500/40' },
    { ids: ['blocked', 'failed'], label: 'Needs Review', color: 'border-rose-500/40' },
    { ids: ['completed'], label: 'Completed', color: 'border-emerald-500/40' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Active Mission Overview Header Card */}
      {tasks.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Compass className="w-10 h-10 text-cyan-400 mx-auto" />
          <h2 className="mt-4 text-xl font-extrabold text-white">No active mission yet</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-xl mx-auto">
            Create a goal from Chat, for example: “Build an AI resume analyzer app.” Mission Control will show the phases, tasks, agents, approvals, and progress here.
          </p>
        </GlassCard>
      ) : (
      <div className="relative rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#171524] via-[#14141c] to-[#121216] p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase tracking-wider">
                Active Mission #01
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {liveConnected ? 'Live backend' : 'Offline fallback'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{mission.title}</h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{mission.description}</p>
          </div>

          {/* Assigned Agents Avatars & Progress Radial/Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 shrink-0 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={refreshMission}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-gray-200 transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Live'}
            </button>
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-400 mb-1.5">Assigned Squad</div>
              <div className="flex items-center -space-x-2">
                {mission.assignedAgents.map((agId, idx) => {
                  const ag = agents.find(a => a.id === agId);
                  return (
                    <div
                      key={idx}
                      title={ag?.name}
                      className="w-9 h-9 rounded-full bg-[#1e1e26] border-2 border-[#121216] flex items-center justify-center text-sm shadow-md"
                    >
                      {ag?.avatar || '🤖'}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full sm:w-44 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">Total Progress</span>
                <span className="text-cyan-300 font-bold">{visibleProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden p-0.5 border border-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${visibleProgress}%` }} />
              </div>
              <div className="text-[10px] text-gray-400 font-mono">
                {completedTasks}/{tasks.length} tasks complete · {waitingTasks} waiting
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Live mission metrics */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Progress', value: `${visibleProgress}%`, sub: `${completedTasks}/${tasks.length} complete`, color: 'text-cyan-300' },
            { label: 'Running', value: `${runningTasks}`, sub: 'Agent active', color: 'text-emerald-400' },
            { label: 'Waiting', value: `${waitingTasks}`, sub: 'Needs approval', color: 'text-amber-400' },
            { label: 'Blocked', value: `${blockedTasks}`, sub: blockedTasks ? 'Review needed' : 'No blockers', color: blockedTasks ? 'text-rose-400' : 'text-emerald-400' },
            { label: 'Approvals', value: `${pendingApprovals}`, sub: 'Pending review', color: pendingApprovals ? 'text-amber-400' : 'text-gray-400' },
            { label: 'Agent Score', value: `${avgAgentConfidence}%`, sub: 'Avg quality', color: 'text-sky-300' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-2xl bg-[#171717]/80 border border-white/[0.07] backdrop-blur-xl space-y-1">
              <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{item.label}</div>
              <div className={`text-2xl font-bold font-mono tracking-tight ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-gray-500 font-mono truncate">{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Live durable-workflow runs (real backend data) */}
      {liveRuns !== null && (
        <GlassCard>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Workflow Runs
            </span>
            <button
              onClick={handleStartRun}
              disabled={starting}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-200 transition-colors disabled:opacity-50"
            >
              {starting ? 'Starting…' : '▶ Start real run'}
            </button>
          </div>
          {liveRuns.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
              {liveRuns.map(run => {
              const pct = run.total ? Math.round((run.done / run.total) * 100) : 0;
              const tone = run.status === 'completed' ? 'text-emerald-300' : run.status === 'waiting_approval' ? 'text-amber-300' : run.status === 'cancelled' ? 'text-gray-400' : 'text-cyan-300';
              return (
                <div key={run.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-200 truncate">{run.name}</span>
                    <span className={`text-[10px] font-mono ${tone}`}>{run.status.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-2 w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">{run.done}/{run.total} steps</div>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="pt-3 text-xs text-gray-400">
              No live workflow runs yet. Start a governed run to create a real checkpointed workflow.
            </div>
          )}
        </GlassCard>
      )}

      {/* 2. Next Best Action Recommendation Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-900/30 via-sky-900/20 to-blue-900/30 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
            <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="text-xs font-semibold text-cyan-200 uppercase tracking-wide font-mono">Recommended Next Action</div>
            <p className="text-xs sm:text-sm text-white font-medium mt-0.5">
              {nextTask
                ? <>Continue <span className="text-cyan-300 font-bold">{nextTask.title}</span> with {nextTask.assignedAgentName}.</>
                : <>All visible tasks are complete. Review results and create the next mission from Chat.</>}
            </p>
          </div>
        </div>
        <button
          onClick={handleApproveNext}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Approve Next Task</span>
        </button>
      </div>

      {/* 3. Mission Phase Tracker (5 Phases Step Bar) */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
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
                  isCurr ? 'bg-cyan-500/[0.08] border-cyan-500/40 text-cyan-200 shadow-md' :
                  'bg-white/[0.01] border-white/5 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span>Phase 0{idx + 1}</span>
                  <StatusBadge status={phase.status} size="sm" showIcon={false} />
                </div>
                <div className="text-xs font-semibold truncate text-white">{phase.title}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono opacity-80">
                  <span>{phase.completedCount}/{phase.tasksCount} tasks</span>
                  <span>{phase.tasksCount ? Math.round((phase.completedCount / phase.tasksCount) * 100) : 0}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 4. Task Graph / Kanban Flow (4 columns) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <span>Task Graph & Execution Pipeline</span>
          </h3>
          <span className="text-xs text-gray-400 font-mono">Showing {tasks.length} tasks · {completedTasks} done</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {columns.map(col => {
            const colTasks = tasks.filter(t => col.ids.includes(t.status));
            return (
              <div key={col.label} className={`p-4 rounded-2xl bg-[#141418] border ${col.color} flex flex-col min-h-[350px]`}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">{col.label}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{colTasks.length}</span>
                </div>

                <div className="flex-1 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500 font-mono">No tasks in this state</div>
                  ) : (
                    colTasks.map(t => (
                      (() => {
                        const guide = explainTaskStatus(t.status);
                        return (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-[#1a1a20] border border-white/10 hover:border-white/20 transition-all space-y-2 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-xs font-semibold text-white line-clamp-2">{t.title}</span>
                          <RiskBadge level={t.riskLevel} size="sm" />
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-2">{t.description}</p>
                        <div className="rounded-lg bg-black/30 border border-white/5 p-2">
                          <div className={`text-[10px] font-mono uppercase ${guide.tone}`}>{guide.label}</div>
                          <p className="mt-1 text-[11px] text-gray-300 leading-relaxed">{guide.explanation}</p>
                        </div>
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500">
                          <span className="text-cyan-300">{t.assignedAgentName}</span>
                          <span>{t.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void runTaskAction(t)}
                          disabled={actionBusyId === t.id}
                          className={`w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : t.status === 'waiting_approval'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : t.status === 'blocked' || t.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                  : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/30'
                          } disabled:opacity-60`}
                        >
                          {actionBusyId === t.id ? 'Working...' : guide.nextAction}
                        </button>
                      </div>
                        );
                      })()
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
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Mission Intelligence & Agent Confidence Scores</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-xs font-mono text-gray-400">Agent Confidence</div>
            <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">{avgAgentConfidence}%</div>
            <div className="text-[10px] text-emerald-400 mt-1">Average quality score</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-xs font-mono text-gray-400">Blockers Detected</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${blockedTasks ? 'text-rose-300' : 'text-white'}`}>{blockedTasks}</div>
            <div className="text-[10px] text-gray-500 mt-1">{blockedTasks ? 'Needs review' : 'No blockers'}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-xs font-mono text-gray-400">Pending Approvals</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{pendingApprovals}</div>
            <div className="text-[10px] text-amber-300/80 mt-1">Waiting for review</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-xs font-mono text-gray-400">Mission State</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">Active</div>
            <div className="text-[10px] text-gray-500 mt-1">{runningTasks} running · {waitingTasks} waiting</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
