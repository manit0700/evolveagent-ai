import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  ArrowRight,
  ShieldAlert,
  Brain,
  Bot,
  CheckSquare,
  X,
  Play,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PageId } from '../../types';

export const CommandModal: React.FC = () => {
  const {
    isCommandModalOpen,
    setIsCommandModalOpen,
    setActivePage,
    agents,
    memories,
    approveBatchLowRisk,
    runMockWorkflowStep,
    showToast
  } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isCommandModalOpen) {
      setQuery('');
    }
  }, [isCommandModalOpen]);

  if (!isCommandModalOpen) return null;

  const handleClose = () => setIsCommandModalOpen(false);

  const navigateTo = (page: PageId) => {
    setActivePage(page);
    handleClose();
    showToast(`Navigated to ${page.toUpperCase().replace('-', ' ')}`, 'info');
  };

  const executeAction = (action: () => void, msg: string) => {
    action();
    handleClose();
    if (msg) showToast(msg, 'success');
  };

  const quickActions = [
    { title: 'Review my repo & suggest UI architecture', icon: Sparkles, action: () => navigateTo('chat'), tag: 'Agent Workflow' },
    { title: 'Plan workflow for Mission #01', icon: CheckSquare, action: () => navigateTo('mission-control'), tag: 'Mission Chief' },
    { title: 'Approve pending low-risk tool batch', icon: ShieldAlert, action: () => executeAction(approveBatchLowRisk, ''), tag: 'Governance' },
    { title: 'Simulate next workflow trace step', icon: Play, action: () => executeAction(runMockWorkflowStep, ''), tag: 'Dev Console' },
    { title: 'Search Project Brain memories for tokens', icon: Brain, action: () => navigateTo('project-brain'), tag: 'Knowledge' },
    { title: 'Inspect UI Design Agent live tokens', icon: Bot, action: () => navigateTo('agents'), tag: 'Agent Profile' },
  ];

  const filteredActions = quickActions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));
  const filteredAgents = agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase()) || a.role.toLowerCase().includes(query.toLowerCase()));
  const filteredMemories = memories.filter(m => m.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 animate-fadeIn" style={{ background: 'var(--ea-overlay)' }}>
      <div className="w-full max-w-2xl rounded-[calc(var(--ea-radius)+4px)] border border-[var(--ea-line)] ea-surface shadow-[var(--ea-shadow-lg)] overflow-hidden relative">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--ea-line)] ea-surface-2">
          <Search className="w-5 h-5 ea-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, agents, memories, or run a quick action…"
            className="flex-1 bg-transparent text-sm ea-ink placeholder:text-[var(--ea-faint)] focus:outline-none"
            autoFocus
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded ea-surface-3 ea-muted border border-[var(--ea-line)]">ESC</span>
            <button onClick={handleClose} className="p-1 rounded-lg ea-muted hover:ea-ink hover:bg-[var(--ea-surface-3)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] ea-faint px-2 mb-1.5">Quick actions</div>
            <div className="space-y-1">
              {filteredActions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full flex items-center justify-between p-2.5 rounded-[var(--ea-radius-sm)] hover:bg-[var(--ea-surface-2)] text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[var(--ea-accent-soft)] text-[var(--ea-accent)]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-medium ea-ink">{item.title}</div>
                        <div className="text-[11px] ea-muted">{item.tag}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 ea-faint group-hover:text-[var(--ea-ink)] transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          {query && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] ea-faint px-2 mb-1.5">Navigate</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['home', 'chat', 'dev-console', 'mission-control', 'agents', 'approvals', 'project-brain', 'tools', 'governance', 'settings', 'design-system'] as PageId[]).map((page) => (
                  <button
                    key={page}
                    onClick={() => navigateTo(page)}
                    className="flex items-center gap-2 p-2 rounded-lg ea-surface-2 hover:bg-[var(--ea-surface-3)] border border-[var(--ea-line)] text-xs ea-soft capitalize transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-[var(--ea-accent)]" />
                    <span>{page.replace('-', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredAgents.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] ea-faint px-2 mb-1.5">Agents ({filteredAgents.length})</div>
              <div className="space-y-1">
                {filteredAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => navigateTo('agents')}
                    className="w-full flex items-center justify-between p-2 rounded-[var(--ea-radius-sm)] hover:bg-[var(--ea-surface-2)] text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{agent.avatar}</span>
                      <div>
                        <div className="text-xs font-medium ea-ink">{agent.name}</div>
                        <div className="text-[11px] ea-muted">{agent.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full ea-surface-3 ea-muted border border-[var(--ea-line)] capitalize">
                      {agent.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredMemories.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] ea-faint px-2 mb-1.5">Project Brain ({filteredMemories.length})</div>
              <div className="space-y-1">
                {filteredMemories.slice(0, 3).map(mem => (
                  <button
                    key={mem.id}
                    onClick={() => navigateTo('project-brain')}
                    className="w-full flex items-center justify-between p-2 rounded-[var(--ea-radius-sm)] hover:bg-[var(--ea-surface-2)] text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-[var(--ea-accent)]" />
                      <span className="text-xs ea-soft truncate max-w-md">{mem.title}</span>
                    </div>
                    <span className="text-[10px] font-medium text-[var(--ea-accent)]">{mem.relevance}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-[var(--ea-line)] ea-surface-2 flex items-center justify-between text-[11px] ea-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--ea-success)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ea-success)]" />
            <span>Mock-safe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
