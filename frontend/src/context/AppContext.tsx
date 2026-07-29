import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  PageId,
  Agent,
  Mission,
  Task,
  ApprovalRequest,
  MemoryItem,
  ToolConnector,
  GovernanceEvent,
  TraceStep,
  ChatMessage,
  ChatRunStatus,
  SystemMetric,
  RiskLevel,
  ProjectSetupSummary,
  ProjectContextSelection
} from '../types';
import {
  INITIAL_AGENTS,
  INITIAL_MISSION,
  INITIAL_TASKS,
  INITIAL_APPROVALS,
  INITIAL_MEMORIES,
  INITIAL_CONNECTORS,
  INITIAL_GOVERNANCE_LOGS,
  INITIAL_TRACE_STEPS,
  INITIAL_CHAT_MESSAGES,
  SYSTEM_METRICS
} from '../data/mockData';
import { fetchLiveData, routeMessage, decideApproval, setConnectorEnabled } from '../data/api';

const SAFETY_KEY = 'evolveagent-safety';
const PROJECT_CONTEXT_KEY = 'evolveagent-project-context';
const DEFAULT_SAFETY: SafetySettings = {
  planningFirst: true,
  mockSafe: true,
  requireApproval: true,
  auditLogging: true,
  blockDestructive: true,
};

interface SafetySettings {
  planningFirst: boolean;
  mockSafe: boolean;
  requireApproval: boolean;
  auditLogging: boolean;
  blockDestructive: boolean;
}

interface AppContextType {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  agents: Agent[];
  mission: Mission;
  tasks: Task[];
  approvals: ApprovalRequest[];
  memories: MemoryItem[];
  connectors: ToolConnector[];
  governanceLogs: GovernanceEvent[];
  traceSteps: TraceStep[];
  chatMessages: ChatMessage[];
  chatRunStatus: ChatRunStatus;
  systemMetrics: SystemMetric[];
  isCommandModalOpen: boolean;
  setIsCommandModalOpen: (open: boolean) => void;
  safetySettings: SafetySettings;
  toggleSafetySetting: (key: keyof SafetySettings) => void;
  toast: { message: string; type: 'success' | 'info' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  liveConnected: boolean;
  projectSetup: ProjectSetupSummary | null;
  projectContextSelection: ProjectContextSelection;
  updateProjectContextSelection: (updates: ProjectContextSelection) => void;
  refreshLive: (selection?: ProjectContextSelection) => Promise<void>;

  // Actions
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  approveBatchLowRisk: () => void;
  toggleAgentStatus: (id: string) => void;
  sendMessage: (text: string, attachments?: { name: string; size: string; type: string }[]) => void;
  advanceWorkflowStep: () => void;
  togglePinMemory: (id: string) => void;
  toggleToolConnection: (id: string) => void;
  addMemoryItem: (title: string, snippet: string, type: MemoryItem['type'], tags: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [mission, setMission] = useState<Mission>(INITIAL_MISSION);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [connectors, setConnectors] = useState<ToolConnector[]>(INITIAL_CONNECTORS);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceEvent[]>(INITIAL_GOVERNANCE_LOGS);
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>(INITIAL_TRACE_STEPS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [chatRunStatus, setChatRunStatus] = useState<ChatRunStatus>({
    active: false,
    phase: 'idle',
    message: '',
  });
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>(SYSTEM_METRICS);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [projectSetup, setProjectSetup] = useState<ProjectSetupSummary | null>(null);
  const [projectContextSelection, setProjectContextSelection] = useState<ProjectContextSelection>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROJECT_CONTEXT_KEY) || 'null');
      if (saved && typeof saved === 'object') return saved;
    } catch { /* ignore */ }
    return {};
  });

  const [safetySettings, setSafetySettings] = useState<SafetySettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAFETY_KEY) || 'null');
      if (saved && typeof saved === 'object') return { ...DEFAULT_SAFETY, ...saved };
    } catch { /* ignore */ }
    return DEFAULT_SAFETY;
  });

  // Keyboard shortcut for Command K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load real backend data on mount; keep local fallback data so the UI
  // works even if the backend is down. Only overrides slices that came back.
  const refreshLive = async (selection: ProjectContextSelection = projectContextSelection) => {
    const live = await fetchLiveData(selection);
    if (!live) { setLiveConnected(false); return; }
    setLiveConnected(true);
    if (live.agents) setAgents(live.agents);
    if (live.mission) setMission(live.mission);
    if (live.tasks) setTasks(live.tasks);
    if (live.governanceLogs) setGovernanceLogs(live.governanceLogs);
    if (live.systemMetrics) setSystemMetrics(live.systemMetrics);
    if (live.memories) setMemories(live.memories);
    if (live.connectors) setConnectors(live.connectors);
    if (live.approvals) setApprovals(live.approvals);
    if (live.projectSetup) {
      setProjectSetup(live.projectSetup);
      const resolvedSelection = live.projectSetup.selection || selection;
      setProjectContextSelection(resolvedSelection);
      try { localStorage.setItem(PROJECT_CONTEXT_KEY, JSON.stringify(resolvedSelection)); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    refreshLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const updateProjectContextSelection = (updates: ProjectContextSelection) => {
    const nextSelection: ProjectContextSelection = {
      ...projectContextSelection,
      ...updates,
    };
    if (updates.workspaceId && updates.workspaceId !== projectContextSelection.workspaceId) {
      nextSelection.agentId = undefined;
      nextSelection.goalId = undefined;
    }
    Object.keys(nextSelection).forEach((key) => {
      const typedKey = key as keyof ProjectContextSelection;
      if (!nextSelection[typedKey]) delete nextSelection[typedKey];
    });
    setProjectContextSelection(nextSelection);
    try { localStorage.setItem(PROJECT_CONTEXT_KEY, JSON.stringify(nextSelection)); } catch { /* ignore */ }
    refreshLive(nextSelection);
    showToast('Project context updated for Chat and Project Brain.', 'info');
  };

  const toggleSafetySetting = (key: keyof SafetySettings) => {
    setSafetySettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(SAFETY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      showToast(`Safety setting "${key}" updated to ${updated[key] ? 'Enabled' : 'Disabled'}`, 'info');
      return updated;
    });
  };

  const approveRequest = (id: string) => {
    const target = approvals.find(a => a.id === id);
    if (!target) return;

    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    // Best-effort real decision on the backend (no-op for local fallback items).
    decideApproval(id, 'approve').then(ok => { if (ok) refreshLive(); });
    
    // Log governance event
    const newLog: GovernanceEvent = {
      id: `gov-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'approval_granted',
      agentName: target.agentName,
      action: target.toolName,
      status: 'allowed',
      risk: target.riskLevel,
      details: `User explicitly approved: ${target.title}. Action completed inside the governed approval path.`
    };
    setGovernanceLogs(prev => [newLog, ...prev]);

    // Update tasks
    setTasks(prev => prev.map(t => t.id === 'task-105' || t.id === 'task-106' ? { ...t, status: 'completed' } : t));
    
    // Update metrics
    setSystemMetrics(prev => prev.map(m => {
      if (m.label === 'Pending Approvals') {
        const current = parseInt(m.value.toString()) || 5;
        return { ...m, value: Math.max(0, current - 1) < 10 ? `0${Math.max(0, current - 1)}` : Math.max(0, current - 1) };
      }
      return m;
    }));

    showToast(`Approved "${target.title}". Agent resumed execution.`, 'success');
  };

  const rejectRequest = (id: string) => {
    const target = approvals.find(a => a.id === id);
    if (!target) return;

    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    decideApproval(id, 'reject', 'Rejected by user; no action was applied.').then(ok => { if (ok) refreshLive(); });

    const newLog: GovernanceEvent = {
      id: `gov-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'safety_block',
      agentName: target.agentName,
      action: target.toolName,
      status: 'blocked',
      risk: target.riskLevel,
      details: `User REJECTED action: ${target.title}. Sub-task marked as blocked.`
    };
    setGovernanceLogs(prev => [newLog, ...prev]);

    showToast(`Rejected "${target.title}". Agent notified to replan without this tool.`, 'warning');
  };

  const approveBatchLowRisk = () => {
    const lowRiskPending = approvals.filter(a => a.status === 'pending' && a.riskLevel === 'low');
    if (lowRiskPending.length === 0) {
      showToast('No pending low-risk items in the queue.', 'info');
      return;
    }

    setApprovals(prev => prev.map(a => (a.status === 'pending' && a.riskLevel === 'low') ? { ...a, status: 'approved' } : a));
    
    const newLog: GovernanceEvent = {
      id: `gov-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'approval_granted',
      agentName: 'Master Orchestrator',
      action: 'Batch Low-Risk Approval',
      status: 'allowed',
      risk: 'low',
      details: `Approved ${lowRiskPending.length} low-risk operations simultaneously.`
    };
    setGovernanceLogs(prev => [newLog, ...prev]);

    showToast(`Approved ${lowRiskPending.length} low-risk operations successfully!`, 'success');
  };

  const toggleAgentStatus = (id: string) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === id) {
        const nextStatus = agent.status === 'active' ? 'idle' : agent.status === 'idle' ? 'running' : 'active';
        showToast(`Agent "${agent.name}" status changed to ${nextStatus.toUpperCase()}`, 'info');
        return { ...agent, status: nextStatus };
      }
      return agent;
    }));
  };

  const sendMessage = (text: string, attachments?: { name: string; size: string; type: string }[]) => {
    if (!text.trim() && !attachments?.length) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatRunStatus({
      active: true,
      phase: 'routing',
      message: liveConnected
        ? 'Routing through the live backend: Master Orchestrator first, /api/run fallback if needed...'
        : 'Trying to reconnect to the backend before using local fallback messaging...',
      startedAt: Date.now(),
      routeUsed: undefined,
      masterPriority: undefined,
      selectedTaskType: undefined,
      primaryDomain: undefined,
      routeConfidence: undefined,
      decision: undefined,
      retryText: text,
      errorDetail: undefined,
    });

    // Route through the real Master Agent. When Approval-Safe is OFF we ask the
    // backend to execute (execute:true) — but it only runs NON-risky intents;
    // risky ones stay approval-gated no matter what.
    (async () => {
      const slowTimer = window.setTimeout(() => {
        setChatRunStatus(prev => prev.active ? {
          ...prev,
          phase: 'slow',
          message: 'Agents are still working. Real provider calls can take 30-90 seconds.',
        } : prev);
      }, 12000);

      const routed = await routeMessage(text, !safetySettings.mockSafe, projectContextSelection);
      window.clearTimeout(slowTimer);
      const isDeploy = text.toLowerCase().includes('deploy') || text.toLowerCase().includes('run');
      const ranForReal = routed && !safetySettings.mockSafe && !routed.requiresApproval && !routed.blockedExecution;
      const replyText = routed
        ? `${routed.answer}`
          + (routed.requiresApproval ? '\n\n⚠️ This intent is **risky** — held for explicit approval (nothing was executed).' : '')
          + (ranForReal ? '\n\n✅ Approval-Safe is off — this non-risky action was executed for real.' : '')
          + (routed.suggestedWorkflow ? `\n\nSuggested workflow: **${routed.suggestedWorkflow}**` : '')
          + (routed.masterPriority ? `\n\nEVA selected task type: **${routed.selectedTaskType || 'auto'}**${routed.primaryDomain ? ` under **${routed.primaryDomain}**` : ''}.` : '')
          + `\n\nBackend route used: ${routed.routeUsed}`
        : `I couldn't reach the backend from Chat.\n\nWhat this means:\n- No live agent run was created.\n- No tools executed.\n- Your prompt stayed in the local UI fallback.\n\nUse **Retry Backend** or start the backend, then send this again.`;

      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        agentName: 'Master Orchestrator',
        avatar: '🤖',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isWorkingCard: isDeploy && Boolean(routed?.requiresApproval),
        routing: routed ? {
          masterPriority: routed.masterPriority,
          selectedTaskType: routed.selectedTaskType,
          primaryDomain: routed.primaryDomain,
          routeConfidence: routed.routeConfidence,
          routeUsed: routed.routeUsed,
          decision: routed.decision,
        } : undefined,
      };
      setChatMessages(prev => [...prev, agentMsg]);
      setLiveConnected(Boolean(routed));
      setChatRunStatus({
        active: false,
        phase: routed ? 'idle' : 'offline',
        message: routed ? '' : 'Backend route timed out or was unavailable.',
        routeUsed: routed?.routeUsed,
        masterPriority: routed?.masterPriority,
        selectedTaskType: routed?.selectedTaskType,
        primaryDomain: routed?.primaryDomain,
        routeConfidence: routed?.routeConfidence,
        decision: routed?.decision,
        retryText: routed ? undefined : text,
        errorDetail: routed ? undefined : 'Both /api/master-agent/route and /api/run were unavailable or timed out.',
      });
    })();
  };

  const advanceWorkflowStep = () => {
    // Advance mission progress
    setMission(prev => ({
      ...prev,
      progress: Math.min(100, prev.progress + 8)
    }));

    // Add a new step to trace
    const nextStepNum = traceSteps.length + 1;
    const newStep: TraceStep = {
      step: nextStepNum,
      id: `tr-0${nextStepNum}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      agent: 'Implementation Agent',
      action: `Synthesize component batch #${nextStepNum} with glassmorphic tokens`,
      status: 'success',
      durationMs: Math.floor(Math.random() * 400) + 150,
      toolUsed: 'Component Generator',
      inputSnippet: `Generate responsive JSX with border-white/7 and background rgba(23,23,23,0.75)`,
      outputSnippet: `Successfully emitted 142 lines of clean React code.`
    };

    setTraceSteps(prev => [...prev, newStep]);
    showToast('Workflow step advanced. Mission progress moved to ' + Math.min(100, mission.progress + 8) + '%', 'success');
  };

  const togglePinMemory = (id: string) => {
    setMemories(prev => prev.map(m => {
      if (m.id === id) {
        const nextPin = !m.pinned;
        showToast(nextPin ? `Pinned "${m.title}" to top of Project Brain` : `Unpinned memory item`, 'info');
        return { ...m, pinned: nextPin };
      }
      return m;
    }));
  };

  const toggleToolConnection = (id: string) => {
    setConnectors(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'connected' ? 'disconnected' : 'connected';
        showToast(`Tool connector "${c.name}" is now ${nextStatus.toUpperCase()}`, nextStatus === 'connected' ? 'success' : 'warning');
        // Best-effort real enable/disable on the backend (no-op for local fallback items).
        setConnectorEnabled(id, nextStatus === 'connected').then(ok => { if (ok) refreshLive(); });
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const addMemoryItem = (title: string, snippet: string, type: MemoryItem['type'], tags: string[]) => {
    const newMem: MemoryItem = {
      id: `mem-${Date.now()}`,
      title,
      snippet,
      type,
      relevance: 95,
      tier: 'hot',
      source: 'Manual User Annotation',
      timestamp: 'Just now',
      tags,
      pinned: false
    };
    setMemories(prev => [newMem, ...prev]);
    showToast(`Added new memory "${title}" to Project Brain!`, 'success');
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        agents,
        mission,
        tasks,
        approvals,
        memories,
        connectors,
        governanceLogs,
        traceSteps,
        chatMessages,
        chatRunStatus,
        systemMetrics,
        isCommandModalOpen,
        setIsCommandModalOpen,
        safetySettings,
        toggleSafetySetting,
        toast,
        showToast,
        liveConnected,
        projectSetup,
        projectContextSelection,
        updateProjectContextSelection,
        refreshLive,
        approveRequest,
        rejectRequest,
        approveBatchLowRisk,
        toggleAgentStatus,
        sendMessage,
        advanceWorkflowStep,
        togglePinMemory,
        toggleToolConnection,
        addMemoryItem
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
