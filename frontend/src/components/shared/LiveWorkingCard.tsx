import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Edit3,
  Check,
  ArrowRight,
  Activity,
} from 'lucide-react';

export const LiveWorkingCard: React.FC = () => {
  const { approvals, approveRequest, mission, showToast } = useApp();
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');

  const pendingApproval = approvals.find(a => a.status === 'pending');

  const handlePause = () => {
    setIsPaused(prev => !prev);
    showToast(isPaused ? 'Resumed orchestration pipeline' : 'Paused live agent orchestration', 'info');
  };

  const handleStop = () => {
    setIsStopped(true);
    showToast('Orchestration stopped. All agents returned to idle state.', 'warning');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInstruction.trim()) return;
    showToast(`Updated instruction sent to Master Orchestrator: "${customInstruction}"`, 'success');
    setCustomInstruction('');
    setIsEditing(false);
  };

  if (isStopped) {
    return (
      <div className="ea-card p-4 ea-muted text-sm flex items-center justify-between">
        <span className="flex items-center gap-2">
          <StopCircle className="w-4 h-4 text-[var(--ea-danger)]" /> Orchestration stopped by user.
        </span>
        <button
          onClick={() => setIsStopped(false)}
          className="text-xs text-[var(--ea-accent)] hover:underline"
        >
          Restart pipeline
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 ea-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--ea-line)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--ea-radius-sm)] bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] flex items-center justify-center">
            <Activity className={`w-4 h-4 ${isPaused ? '' : 'animate-pulse'}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold ea-ink flex items-center gap-2">
              EvolveAgent is working
              <span className="ea-chip ea-chip--accent">
                {isPaused ? 'Paused' : 'Live'}
              </span>
            </h4>
            <p className="text-xs ea-muted">Mission: {mission.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button onClick={handlePause} className="ea-btn text-xs py-1.5 px-2.5">
            {isPaused ? <PlayCircle className="w-3.5 h-3.5 text-[var(--ea-success)]" /> : <PauseCircle className="w-3.5 h-3.5 text-[var(--ea-warn)]" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button onClick={() => setIsEditing(prev => !prev)} className="ea-btn text-xs py-1.5 px-2.5">
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleStop}
            className="ea-btn text-xs py-1.5 px-2.5 bg-[var(--ea-danger-soft)] text-[var(--ea-danger)] border-transparent"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleEditSubmit} className="mt-4 p-3 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)] flex gap-2">
          <input
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="Add a clarifying instruction for the orchestrator…"
            className="ea-input flex-1 py-1.5 text-xs"
            autoFocus
          />
          <button type="submit" className="ea-btn ea-btn--primary text-xs">
            Send
          </button>
        </form>
      )}

      <div className="mt-4 space-y-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] ea-faint">Active agent stack</div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { emoji: '🤖', name: 'Master Orchestrator', detail: 'Delegating sub-tasks across 4 worker agents', tone: 'ok' as const },
            { emoji: '🎨', name: 'UI Design Agent', detail: 'Drafting cleaner layout and spacing proposals', tone: 'run' as const },
            { emoji: '🧠', name: 'Memory Agent', detail: 'Indexing recent file edits into Project Brain', tone: 'ok' as const },
            { emoji: '🛡️', name: 'Governance Agent', detail: 'Auditing tool calls for mock-safe sandboxing', tone: 'ok' as const },
            {
              emoji: '⚡',
              name: 'Implementation Agent',
              detail: pendingApproval ? `Waiting approval on: ${pendingApproval.toolName}` : 'All requested tool calls approved',
              tone: 'wait' as const,
            },
          ].map((row) => (
            <div
              key={row.name}
              className={`flex items-center justify-between p-2.5 rounded-[var(--ea-radius-sm)] border ${
                row.tone === 'run'
                  ? 'bg-[var(--ea-info-soft)] border-transparent'
                  : row.tone === 'wait'
                    ? 'bg-[var(--ea-warn-soft)] border-transparent'
                    : 'ea-surface-2 border-[var(--ea-line)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{row.emoji}</span>
                <div>
                  <div className="text-xs font-medium ea-ink">{row.name}</div>
                  <div className="text-[11px] ea-muted">{row.detail}</div>
                </div>
              </div>
              <span
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  row.tone === 'run'
                    ? 'bg-[var(--ea-info-soft)] text-[var(--ea-info)]'
                    : row.tone === 'wait'
                      ? 'bg-[var(--ea-warn-soft)] text-[var(--ea-warn)]'
                      : 'bg-[var(--ea-success-soft)] text-[var(--ea-success)]'
                }`}
              >
                {row.tone === 'wait' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {row.tone === 'run' ? 'Running' : row.tone === 'wait' ? 'Waiting' : 'Active'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--ea-line)]">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="ea-muted">Pipeline progress</span>
          <span className="font-semibold text-[var(--ea-accent)]">{mission.progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full ea-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--ea-accent)] transition-all duration-500"
            style={{ width: `${mission.progress}%` }}
          />
        </div>
      </div>

      {pendingApproval ? (
        <div className="mt-4 p-3.5 rounded-[var(--ea-radius-sm)] bg-[var(--ea-warn-soft)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[var(--ea-warn)] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold ea-ink">{pendingApproval.title}</div>
              <div className="text-[11px] ea-muted">{pendingApproval.plannedAction}</div>
            </div>
          </div>
          <button
            onClick={() => approveRequest(pendingApproval.id)}
            className="ea-btn ea-btn--primary shrink-0 self-start sm:self-auto"
          >
            <Check className="w-4 h-4" />
            <span>Approve</span>
          </button>
        </div>
      ) : (
        <div className="mt-4 p-3 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)] flex items-center justify-between text-xs ea-muted">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--ea-success)]" /> High-risk operations are cleared.
          </span>
          <button
            onClick={() => showToast('Advancing orchestration to next checkpoint...', 'info')}
            className="text-xs text-[var(--ea-accent)] flex items-center gap-1 font-medium"
          >
            <span>Next phase</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="mt-3 text-[11px] text-center ea-faint flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ea-success)]" />
        <span>No real tool action runs until you approve it.</span>
      </div>
    </div>
  );
};
