import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/shared/GlassCard';
import { LiveWorkingCard } from '../components/shared/LiveWorkingCard';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Database, 
  Sparkles, 
  Bot, 
  User, 
  ShieldCheck, 
  Brain, 
  CheckSquare, 
  ArrowRight, 
  Layers, 
  FileCode, 
  Wrench,
  Clock,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  Route,
  ShieldAlert,
  Workflow,
  CheckCircle2,
  Search,
  Cpu
} from 'lucide-react';

type ContinueAction = {
  label: string;
  page: 'dev-console' | 'approvals' | 'mission-control' | 'tools' | 'project-brain' | 'code-changes';
};

export const SimpleModeChat: React.FC = () => {
  const { chatMessages, chatRunStatus, sendMessage, mission, agents, connectors, memories, setActivePage, showToast, liveConnected, projectSetup, projectContextSelection, updateProjectContextSelection, refreshLive } = useApp();
  const [inputText, setInputText] = useState('');
  const [selectedDb, setSelectedDb] = useState('Workspace Memory + Postgres');
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'running');
  const actionModeLabel = (mode?: string) => {
    if (mode === 'approval_required') return 'Approval required';
    if (mode === 'blocked') return 'Blocked safely';
    if (mode === 'plan') return 'Plan selected';
    return 'Answer selected';
  };
  const approvalTone = (state?: string) => {
    if (state === 'required') return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
    if (state === 'blocked') return 'border-rose-400/30 bg-rose-500/10 text-rose-100';
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
  };
  const safetyTone = (state?: string) => {
    if (state === 'blocked') return 'text-rose-200 border-rose-400/25 bg-rose-500/10';
    if (state === 'passed') return 'text-emerald-200 border-emerald-400/25 bg-emerald-500/10';
    return 'text-gray-300 border-white/10 bg-white/5';
  };
  const toolStatusTone = (state?: string) => {
    if (state === 'blocked') return 'text-rose-200 border-rose-400/25 bg-rose-500/10';
    if (state === 'approval_required') return 'text-amber-200 border-amber-400/25 bg-amber-500/10';
    if (state === 'executed') return 'text-emerald-200 border-emerald-400/25 bg-emerald-500/10';
    if (state === 'selected') return 'text-cyan-200 border-cyan-400/25 bg-cyan-500/10';
    return 'text-gray-300 border-white/10 bg-white/5';
  };
  const verificationTone = (state?: string) => {
    if (state === 'blocked') return 'text-rose-200 border-rose-400/25 bg-rose-500/10';
    if (state === 'needs_review') return 'text-amber-200 border-amber-400/25 bg-amber-500/10';
    if (state === 'passed') return 'text-emerald-200 border-emerald-400/25 bg-emerald-500/10';
    return 'text-gray-300 border-white/10 bg-white/5';
  };
  const outcomeTone = (state?: string) => {
    if (state === 'blocked' || state === 'failed') return 'text-rose-200 border-rose-400/25 bg-rose-500/10';
    if (state === 'needs approval' || state === 'needs review') return 'text-amber-200 border-amber-400/25 bg-amber-500/10';
    return 'text-emerald-200 border-emerald-400/25 bg-emerald-500/10';
  };
  const outcomeFor = (routing: NonNullable<typeof chatMessages[number]['routing']>) => {
    const actionMode = routing.decision?.actionMode;
    const selectedTaskType = routing.selectedTaskType || 'auto';
    const deliverable = selectedTaskType.includes('goal')
      ? 'Goal plan'
      : selectedTaskType.includes('image')
        ? 'Image result'
        : selectedTaskType.includes('code')
          ? 'Code review'
          : selectedTaskType.includes('document') || selectedTaskType.includes('file')
            ? 'Document analysis'
            : selectedTaskType.includes('automation')
              ? 'Automation plan'
              : actionMode === 'plan'
                ? 'Action plan'
                : 'Answer';
    const completionState = actionMode === 'blocked'
      ? 'blocked'
      : actionMode === 'approval_required'
        ? 'needs approval'
        : routing.context?.overallVerification === 'needs_review'
          ? 'needs review'
          : routing.context?.overallVerification === 'blocked'
            ? 'failed'
            : 'complete';
    const evidence = [
      routing.context?.memoryUsed ? 'memory saved/used' : null,
      (routing.context?.selectedTools || []).length > 0 ? 'tools selected' : null,
      routing.context?.overallVerification === 'passed' ? 'verification passed' : null,
      routing.context?.fallbackUsed ? 'fallback used' : 'primary model route',
    ].filter(Boolean) as string[];
    return {
      outcome: actionMode === 'blocked'
        ? 'Blocked before action'
        : actionMode === 'approval_required'
          ? 'Waiting for approval'
          : actionMode === 'plan'
            ? 'Plan prepared'
            : 'Answer delivered',
      deliverable,
      completionState,
      nextAction: continueActionsFor(routing)[0],
      evidence,
    };
  };
  const timelineFor = (routing: NonNullable<typeof chatMessages[number]['routing']>) => {
    const context = routing.context;
    const hasTools = (context?.selectedTools || []).length > 0 || (context?.toolPreviews || []).length > 0;
    const blockedTool = (context?.toolPreviews || []).some((tool) => tool.blocked);
    const needsToolApproval = (context?.toolPreviews || []).some((tool) => tool.approvalRequired);
    const outcome = outcomeFor(routing);
    return [
      {
        label: 'Route',
        detail: routing.masterPriority ? 'Master priority' : 'Fallback route',
        state: routing.masterPriority ? 'passed' : 'needs_review',
      },
      {
        label: 'Context',
        detail: context?.memoryUsed || (context?.knowledgeHits || 0) > 0
          ? `${context?.memoryCount || 0} memory • ${context?.knowledgeHits || 0} knowledge`
          : 'No extra context',
        state: context?.memoryUsed || (context?.knowledgeHits || 0) > 0 ? 'passed' : 'unknown',
      },
      {
        label: 'Model',
        detail: context?.provider ? `${context.provider}${context.model ? `/${context.model}` : ''}` : 'Router',
        state: context?.fallbackUsed ? 'needs_review' : 'passed',
      },
      {
        label: 'Tools',
        detail: hasTools ? `${context?.selectedTools.length || context?.toolPreviews.length || 0} selected` : 'None selected',
        state: blockedTool ? 'blocked' : needsToolApproval ? 'needs_review' : hasTools ? 'passed' : 'unknown',
      },
      {
        label: 'Verify',
        detail: context?.overallVerification ? context.overallVerification.replaceAll('_', ' ') : 'Not reported',
        state: context?.overallVerification || 'unknown',
      },
      {
        label: 'Outcome',
        detail: outcome.completionState,
        state: outcome.completionState === 'complete'
          ? 'passed'
          : outcome.completionState === 'blocked' || outcome.completionState === 'failed'
            ? 'blocked'
            : 'needs_review',
      },
    ];
  };
  const continueActionsFor = (routing?: typeof chatMessages[number]['routing']): ContinueAction[] => {
    if (!routing) return [{ label: 'Open Developer Trace', page: 'dev-console' }];
    const actions: ContinueAction[] = [];
    if (routing.decision?.approvalState === 'required' || routing.decision?.approvalState === 'blocked') {
      actions.push({ label: 'Open Approvals', page: 'approvals' });
    }
    if (routing.decision?.selectedWorkflow || routing.selectedTaskType?.includes('goal')) {
      actions.push({ label: 'Open Mission Control', page: 'mission-control' });
    }
    if ((routing.context?.selectedTools || []).length > 0 || routing.selectedTaskType === 'app_automation') {
      actions.push({ label: 'Open Tools Hub', page: 'tools' });
    }
    if (routing.context?.memoryUsed || (routing.context?.knowledgeHits || 0) > 0) {
      actions.push({ label: 'Open Project Brain', page: 'project-brain' });
    }
    if (routing.selectedTaskType === 'code_review' || routing.selectedTaskType === 'app_automation') {
      actions.push({ label: 'Open Code Changes', page: 'code-changes' });
    }
    actions.push({ label: 'Open Developer Trace', page: 'dev-console' });
    const seen = new Set<string>();
    return actions.filter((action) => {
      if (seen.has(action.page)) return false;
      seen.add(action.page);
      return true;
    });
  };
  const openContinueAction = (action: ContinueAction) => {
    setActivePage(action.page);
    showToast(`${action.label} opened from EVA`, 'info');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    sendMessage(inputText, attachments.length > 0 ? attachments : undefined);
    setInputText('');
    setAttachments([]);
  };

  const handleRetryLastPrompt = async () => {
    const retryText = chatRunStatus.retryText;
    if (!retryText) return;
    await refreshLive();
    sendMessage(retryText);
  };

  const handleAttachExample = () => {
    const exampleFiles = [
      { name: 'App.tsx', size: '12 KB', type: 'TypeScript Component' },
      { name: 'tailwind.config.ts', size: '4 KB', type: 'Config' },
      { name: 'ADR-12-design-tokens.md', size: '18 KB', type: 'Markdown Memory' }
    ];
    const nextFile = exampleFiles[attachments.length % exampleFiles.length];
    setAttachments(prev => [...prev, nextFile]);
    showToast(`Attached ${nextFile.name} (${nextFile.size}) to chat context`, 'info');
  };

  const toggleMic = () => {
    if (!isRecording) {
      setIsRecording(true);
      showToast('Listening to voice command...', 'info');
      setTimeout(() => {
        setIsRecording(false);
        setInputText(prev => prev + (prev ? ' ' : '') + 'Redesign the agents grid cards with higher contrast and clearer status icons.');
        showToast('Voice transcribed successfully!', 'success');
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8.5rem)] animate-fadeIn pb-6">
      {/* Left 3 Cols: Chat Messages & Input Bar */}
      <div className="lg:col-span-3 flex flex-col h-full bg-[#111116] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10 bg-[#16161c]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Master Orchestrator & Specialized Agents</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Approval-Safe Mode
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  chatRunStatus.active
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25'
                    : chatRunStatus.phase === 'offline'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/25'
                      : liveConnected
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/25'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                }`}>
                  {chatRunStatus.active
                    ? 'Routing'
                    : chatRunStatus.phase === 'offline'
                      ? 'Chat offline'
                      : liveConnected
                        ? 'Chat live'
                        : 'Backend checking'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                Routing across {activeAgents.length} active agents • {chatRunStatus.routeUsed ? `Last route ${chatRunStatus.routeUsed}` : 'Planning-First Active'}
                {chatRunStatus.masterPriority && chatRunStatus.selectedTaskType ? ` • EVA → ${chatRunStatus.selectedTaskType.replaceAll('_', ' ')}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshLive}
              title={liveConnected ? 'Backend connected. Click to refresh live data.' : 'Backend unavailable. Click to retry connection.'}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                liveConnected
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              }`}
            >
              {liveConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {liveConnected ? 'Backend Live' : 'Retry Backend'}
            </button>
            <button
              onClick={() => setActivePage('dev-console')}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-colors font-mono hidden sm:block"
            >
              Trace Inspector
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {chatRunStatus.phase === 'offline' && !chatRunStatus.active && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-100 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="font-semibold">Chat backend is not connected</div>
                  <p className="mt-1 text-xs text-rose-100/80">
                    {chatRunStatus.errorDetail || 'The backend did not answer this chat request.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRetryLastPrompt}
                  disabled={!chatRunStatus.retryText}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/25 text-xs font-semibold text-rose-50 disabled:opacity-50"
                >
                  Retry last prompt
                </button>
              </div>
            </div>
          )}
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id} className={`flex items-start gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg shrink-0 ${
                    isUser
                      ? 'bg-gradient-to-tr from-blue-600 to-sky-600 text-white shadow-lg'
                      : 'bg-[#1e1e26] border border-white/10 text-white shadow-md'
                  }`}
                >
                  {isUser ? <User className="w-5 h-5" /> : msg.avatar || '🤖'}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end text-right' : 'items-start'}`}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-semibold text-gray-300">{isUser ? 'You' : msg.agentName || 'AI Assistant'}</span>
                    <span className="text-[10px] font-mono text-gray-500">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-lg'
                        : 'bg-[#1a1a22] border border-white/10 text-gray-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Attachments inside message if any */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/15 flex flex-wrap gap-2">
                        {msg.attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/30 border border-white/10 text-xs text-gray-300 font-mono">
                            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{file.name}</span>
                            <span className="text-gray-500">({file.size})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* If this message contains the Live Orchestration Card */}
                  {msg.isWorkingCard && <LiveWorkingCard />}

                  {!isUser && msg.routing && (
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3 shadow-lg shadow-cyan-950/20">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center text-cyan-200">
                            <Route className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">What EVA decided</div>
                            <div className="text-[10px] font-mono text-cyan-200/80">
                              {msg.routing.masterPriority ? 'Master Agent priority route' : 'Fallback route'}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono ${approvalTone(msg.routing.decision?.approvalState)}`}>
                          {msg.routing.decision?.approvalState === 'required' || msg.routing.decision?.approvalState === 'blocked'
                            ? <ShieldAlert className="w-3 h-3" />
                            : <CheckCircle2 className="w-3 h-3" />}
                          {actionModeLabel(msg.routing.decision?.actionMode)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-[11px]">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Task type</div>
                          <div className="text-gray-100 font-semibold">{(msg.routing.selectedTaskType || 'auto').replaceAll('_', ' ')}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Agent lane</div>
                          <div className="text-gray-100 font-semibold">{msg.routing.decision?.selectedAgent || msg.routing.primaryDomain || 'Master Orchestrator'}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Workflow</div>
                          <div className="text-gray-100 font-semibold flex items-center gap-1.5">
                            <Workflow className="w-3 h-3 text-purple-300" />
                            {msg.routing.decision?.selectedWorkflow || 'Direct answer'}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Confidence</div>
                          <div className="text-gray-100 font-semibold">
                            {typeof msg.routing.routeConfidence === 'number' ? `${Math.round(msg.routing.routeConfidence * 100)}%` : 'not reported'}
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-[11px] text-gray-300">
                        {msg.routing.decision?.nextStep || 'Continue from this routed answer.'}
                      </p>

                      {(() => {
                        const outcome = outcomeFor(msg.routing);
                        const timeline = timelineFor(msg.routing);
                        return (
                          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <div className="text-[10px] text-gray-500 font-mono uppercase">Outcome report</div>
                                <div className="mt-1 text-sm font-semibold text-white">{outcome.outcome}</div>
                              </div>
                              <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-mono ${outcomeTone(outcome.completionState)}`}>
                                {outcome.completionState}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                                <div className="text-gray-500 font-mono">Deliverable</div>
                                <div className="text-gray-100 font-semibold">{outcome.deliverable}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                                <div className="text-gray-500 font-mono">Next best action</div>
                                <button
                                  type="button"
                                  onClick={() => openContinueAction(outcome.nextAction)}
                                  className="mt-1 inline-flex items-center gap-1.5 text-gray-100 font-semibold hover:text-cyan-200 transition-colors"
                                >
                                  {outcome.nextAction.label}
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {outcome.evidence.map((item) => (
                                <span key={item} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-300">
                                  {item}
                                </span>
                              ))}
                            </div>

                            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-2">
                              <div className="text-[10px] text-gray-500 font-mono uppercase">Run timeline</div>
                              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                                {timeline.map((step) => (
                                  <div key={step.label} className="rounded-lg border border-white/10 bg-black/20 p-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`h-2 w-2 rounded-full ${
                                        step.state === 'blocked'
                                          ? 'bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.55)]'
                                          : step.state === 'needs_review'
                                            ? 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]'
                                            : step.state === 'passed'
                                              ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.45)]'
                                              : 'bg-gray-500'
                                      }`} />
                                      <span className="text-[10px] font-semibold text-white">{step.label}</span>
                                    </div>
                                    <div className="mt-1 text-[9px] font-mono text-gray-400">{step.detail}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {continueActionsFor(msg.routing).map((action) => (
                          <button
                            key={action.page}
                            type="button"
                            onClick={() => openContinueAction(action)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-[11px] font-semibold text-gray-100 transition-colors"
                          >
                            {action.label}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isUser && msg.routing?.context && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-200">
                            <Search className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Why EVA chose this</div>
                            <div className="text-[10px] font-mono text-gray-400">Context, model, tools, and safety checks</div>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono ${safetyTone(msg.routing.context.safetyStatus)}`}>
                          Safety {msg.routing.context.safetyStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-[11px]">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Workspace</div>
                          <div className="text-gray-100 font-semibold">{msg.routing.context.workspaceId?.slice(0, 8) || 'default'}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Memory</div>
                          <div className="text-gray-100 font-semibold">
                            {msg.routing.context.memoryUsed ? `${msg.routing.context.memoryCount || 'some'} used` : 'not used'}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Knowledge hits</div>
                          <div className="text-gray-100 font-semibold">{msg.routing.context.knowledgeHits}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="text-gray-500 font-mono">Model route</div>
                          <div className="text-gray-100 font-semibold flex items-center gap-1.5">
                            <Cpu className="w-3 h-3 text-cyan-300" />
                            {msg.routing.context.provider || 'router'}{msg.routing.context.model ? ` / ${msg.routing.context.model}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="text-[10px] text-gray-500 font-mono uppercase">Model router transparency</div>
                            <p className="mt-1 text-[11px] text-gray-300">
                              {msg.routing.context.modelRoutingReason}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-mono ${
                            msg.routing.context.fallbackUsed
                              ? 'bg-amber-500/10 border-amber-400/25 text-amber-200'
                              : 'bg-emerald-500/10 border-emerald-400/25 text-emerald-200'
                          }`}>
                            {msg.routing.context.fallbackUsed ? 'fallback used' : 'primary route'}
                          </span>
                        </div>
                      </div>

                      {msg.routing.context.verificationChecks.length > 0 && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <div className="text-[10px] text-gray-500 font-mono uppercase">Verification evidence</div>
                              <p className="mt-1 text-[11px] text-gray-300">
                                EVA reported these checks before presenting the answer.
                              </p>
                            </div>
                            <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-mono ${verificationTone(msg.routing.context.overallVerification)}`}>
                              {msg.routing.context.overallVerification.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.routing.context.verificationChecks.map((check) => (
                              <div key={check.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-white">{check.label}</span>
                                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono ${verificationTone(check.status)}`}>
                                    {check.status.replaceAll('_', ' ')}
                                  </span>
                                </div>
                                {check.detail && <p className="mt-1 text-[10px] text-gray-400">{check.detail}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.routing.context.selectedTools.length > 0 ? (
                          msg.routing.context.selectedTools.map((tool) => (
                            <span key={tool} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-300">
                              tool: {tool}
                            </span>
                          ))
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">
                            no tools selected
                          </span>
                        )}
                      </div>

                      {msg.routing.context.toolPreviews.length > 0 && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <div className="text-[10px] text-gray-500 font-mono uppercase">Tool execution preview</div>
                              <p className="mt-1 text-[11px] text-gray-300">
                                EVA selected these tools under the reported permission and safety state.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openContinueAction({ label: 'Open Tools Hub', page: 'tools' })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-[10px] font-semibold text-gray-100 transition-colors"
                              >
                                <Wrench className="w-3 h-3" />
                                Tools Hub
                              </button>
                              {msg.routing.context.toolPreviews.some((tool) => tool.approvalRequired || tool.blocked) && (
                                <button
                                  type="button"
                                  onClick={() => openContinueAction({ label: 'Open Approvals', page: 'approvals' })}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 text-[10px] font-semibold text-amber-100 transition-colors"
                                >
                                  <ShieldAlert className="w-3 h-3" />
                                  Approvals
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {msg.routing.context.toolPreviews.map((tool) => (
                              <div key={tool.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[11px] font-semibold text-white">{tool.name}</span>
                                      {tool.permissionLevel && (
                                        <span className="text-[10px] font-mono text-cyan-200">{tool.permissionLevel.replaceAll('_', ' ')}</span>
                                      )}
                                      {tool.source && <span className="text-[10px] font-mono text-gray-500">{tool.source}</span>}
                                      {tool.riskLevel && <span className="text-[10px] font-mono text-amber-200">risk {tool.riskLevel}</span>}
                                    </div>
                                    {tool.sanitizedInput && (
                                      <p className="mt-1 text-[10px] text-gray-400">
                                        Input: {tool.sanitizedInput}
                                      </p>
                                    )}
                                    {tool.resultSummary && (
                                      <p className="mt-1 text-[10px] text-gray-400">
                                        Result: {tool.resultSummary}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-mono ${toolStatusTone(tool.status)}`}>
                                    {tool.status.replaceAll('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.routing.context.routeExplanation && (
                        <p className="mt-3 text-[11px] text-gray-300">
                          {msg.routing.context.routeExplanation}
                        </p>
                      )}

                      {(msg.routing.context.memorySources.length > 0 || msg.routing.context.knowledgeSources.length > 0) && (
                        <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                          <summary className="cursor-pointer text-[11px] font-semibold text-gray-100">
                            View memory and source drilldown
                          </summary>
                          <div className="mt-3 space-y-3">
                            {msg.routing.context.memorySources.length > 0 && (
                              <div>
                                <div className="text-[10px] font-mono uppercase text-cyan-300">Workspace memory used</div>
                                <div className="mt-2 space-y-2">
                                  {msg.routing.context.memorySources.map((memory) => (
                                    <div key={memory.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-semibold text-white">{memory.title}</span>
                                        {memory.type && <span className="text-[10px] font-mono text-cyan-200">{memory.type}</span>}
                                        {memory.source && <span className="text-[10px] font-mono text-gray-500">{memory.source}</span>}
                                      </div>
                                      {memory.snippet && <p className="mt-1 text-[10px] text-gray-400">{memory.snippet}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {msg.routing.context.knowledgeSources.length > 0 && (
                              <div>
                                <div className="text-[10px] font-mono uppercase text-purple-300">Knowledge sources used</div>
                                <div className="mt-2 space-y-2">
                                  {msg.routing.context.knowledgeSources.map((source) => (
                                    <div key={source.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-semibold text-white">{source.label}</span>
                                        {source.type && <span className="text-[10px] font-mono text-purple-200">{source.type}</span>}
                                        {source.source && <span className="text-[10px] font-mono text-gray-500">{source.source}</span>}
                                      </div>
                                      {source.snippet && <p className="mt-1 text-[10px] text-gray-400">{source.snippet}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => openContinueAction({ label: 'Open Project Brain', page: 'project-brain' })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-400/20 text-[11px] font-semibold text-cyan-100 transition-colors"
                            >
                              Open Project Brain
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {chatRunStatus.active && (
            <div className="flex items-start gap-3 sm:gap-4 animate-fadeIn">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1e1e26] border border-cyan-500/20 text-cyan-300 shadow-md flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="max-w-2xl space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold text-gray-300">Master Orchestrator</span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {chatRunStatus.phase === 'slow' ? 'still working' : liveConnected ? 'live route' : 'connecting'}
                  </span>
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed rounded-tl-none border shadow-md ${
                  chatRunStatus.phase === 'slow'
                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-100'
                    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-100'
                }`}>
                  <div className="flex items-start gap-3">
                    <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" />
                    <div>
                      <p className="font-medium">{chatRunStatus.message}</p>
                      <p className="mt-1 text-xs opacity-75">
                        {chatRunStatus.phase === 'slow'
                          ? 'Real provider calls can take longer. If this fails, the retry banner will keep your prompt.'
                          : 'Keep this page open. The reply will appear here automatically when the backend returns.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer Area */}
        <div className="p-4 bg-[#14141a] border-t border-white/10 space-y-3">
          {/* Attached Files Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-2">
              <span className="text-[11px] font-mono text-gray-400">Attached:</span>
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono animate-fadeIn">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="hover:text-white ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Form */}
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <div className="relative flex-1 flex items-center bg-black/60 rounded-2xl border border-white/15 focus-within:border-cyan-500 transition-all shadow-inner px-3 py-2">
              {/* Attachment Button */}
              <button
                type="button"
                onClick={handleAttachExample}
                title="Attach workspace file or code snippet"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Database selector dropdown */}
              <div className="relative hidden sm:block border-r border-white/10 pr-2 mr-2">
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  className="bg-transparent text-xs text-cyan-300 font-mono focus:outline-none cursor-pointer pr-1"
                >
                  <option className="bg-[#171717]">Workspace Memory + Postgres</option>
                  <option className="bg-[#171717]">Project Brain (Vector Index)</option>
                  <option className="bg-[#171717]">Local Filesystem (/src)</option>
                  <option className="bg-[#171717]">GitHub Repo Metadata</option>
                </select>
              </div>

              {/* Input field */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={chatRunStatus.active}
                placeholder="Instruct agents, ask questions, or describe what to build next..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none px-2 py-1.5 disabled:opacity-60"
              />

              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleMic}
                title="Voice input transcription"
                className={`p-2 rounded-xl transition-colors ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={chatRunStatus.active || (!inputText.trim() && attachments.length === 0)}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center shrink-0"
            >
              {chatRunStatus.active ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>

          {/* Quick prompt suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-gray-500 font-mono shrink-0">Try asking:</span>
            {[
              'Run a safety check on all connected MCP tools',
              'Summarize ADR #12 from Project Brain',
              'Deploy our container build to Cloud Run sandbox',
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(prompt)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-gray-300 text-[11px] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right 1 Col: Workspace Context Panel */}
      <div className="space-y-4 flex flex-col h-full overflow-y-auto">
        <GlassCard glow="blue">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-semibold text-white">Active Project Setup</h4>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              projectSetup
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {projectSetup ? 'Live' : 'Fallback'}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-300" htmlFor="chat-workspace-select">
                Workspace
              </label>
              {projectSetup?.workspaces?.length ? (
                <select
                  id="chat-workspace-select"
                  value={projectContextSelection.workspaceId || projectSetup.workspaceId}
                  onChange={(e) => updateProjectContextSelection({ workspaceId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-cyan-500/20 bg-black/50 px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
                >
                  {projectSetup.workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id} className="bg-[#111116]">
                      {workspace.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 text-sm font-bold text-white">Default Workspace</div>
              )}
              <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">
                {projectSetup?.workspaceDescription || 'Current chat uses the default workspace context until a live project setup is selected.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
                <label className="text-[10px] font-mono text-gray-500 uppercase" htmlFor="chat-agent-select">Active agent</label>
                {projectSetup?.agents?.length ? (
                  <select
                    id="chat-agent-select"
                    value={projectContextSelection.agentId || projectSetup.agentId || ''}
                    onChange={(e) => updateProjectContextSelection({ agentId: e.target.value || undefined })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 font-semibold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {projectSetup.agents.map((agent) => (
                      <option key={agent.id} value={agent.id} className="bg-[#111116]">
                        {agent.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1 font-semibold text-white truncate">Master Orchestrator</div>
                )}
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
                <div className="text-[10px] font-mono text-gray-500 uppercase">Memory loaded</div>
                <div className="mt-1 font-semibold text-white">
                  {projectSetup?.memoryCount ?? memories.length} items
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <label className="text-[10px] font-mono text-gray-500 uppercase" htmlFor="chat-goal-select">Current goal</label>
                  {projectSetup?.goals?.length ? (
                    <select
                      id="chat-goal-select"
                      value={projectContextSelection.goalId || projectSetup.goalId || ''}
                      onChange={(e) => updateProjectContextSelection({ goalId: e.target.value || undefined })}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                    >
                      {projectSetup.goals.map((goal) => (
                        <option key={goal.id} value={goal.id} className="bg-[#111116]">
                          {goal.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-1 text-xs font-semibold text-white line-clamp-2">{mission.title}</div>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-mono text-cyan-300">
                  {Math.round(projectSetup?.goalProgress ?? mission.progress)}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(projectSetup?.agentTools?.length ? projectSetup.agentTools : ['memory_search', 'file_analysis']).slice(0, 4).map((tool) => (
                <span key={tool} className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-200">
                  {tool}
                </span>
              ))}
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-200">
                {projectSetup?.agentPermission || 'approval_safe'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setActivePage('project-brain')} className="rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 px-2 py-2 text-[10px] font-semibold text-gray-200">
                Brain
              </button>
              <button onClick={() => setActivePage('agents')} className="rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 px-2 py-2 text-[10px] font-semibold text-gray-200">
                Agent
              </button>
              <button onClick={() => setActivePage('mission-control')} className="rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 px-2 py-2 text-[10px] font-semibold text-gray-200">
                Goal
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Active Mission Overview */}
        <GlassCard>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-semibold text-white">Active Mission</h4>
            </div>
            <button onClick={() => setActivePage('mission-control')} className="text-[11px] text-cyan-400 hover:underline">
              View
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs font-semibold text-white">{mission.title}</div>
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Progress</span>
              <span className="text-cyan-300 font-semibold">{mission.progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${mission.progress}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1">
              <span>5 phases</span>
              <span>4 agents assigned</span>
            </div>
          </div>
        </GlassCard>

        {/* Project Brain Memory Context */}
        <GlassCard>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-semibold text-white">Brain Context</h4>
            </div>
            <button onClick={() => setActivePage('project-brain')} className="text-[11px] text-cyan-400 hover:underline">
              {memories.length} matches
            </button>
          </div>
          <div className="mt-3 space-y-2.5">
            {memories.slice(0, 3).map((mem) => (
              <div key={mem.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-200 truncate max-w-[150px]">{mem.title}</span>
                  <span className="text-[10px] font-mono text-cyan-400">{mem.relevance}%</span>
                </div>
                <p className="text-[10px] text-gray-400 line-clamp-2">{mem.snippet}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Active Tools in Session */}
        <GlassCard className="flex-1">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-white">Active Tools</h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Safe
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {connectors.filter(c => c.status === 'connected' || c.status === 'approval-gated').slice(0, 4).map(tool => (
              <div key={tool.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] text-xs">
                <span className="text-gray-300 truncate">{tool.name}</span>
                <span className="text-[10px] font-mono text-gray-500">{tool.callsToday}x</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
