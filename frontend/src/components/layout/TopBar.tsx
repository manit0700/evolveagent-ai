import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';
import {
  Search,
  Menu,
  ShieldAlert,
  MessageSquare,
  Terminal,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export const TopBar: React.FC<{ setMobileOpen: (open: boolean) => void }> = ({ setMobileOpen }) => {
  const {
    activePage,
    setActivePage,
    setIsCommandModalOpen,
    approvals,
    safetySettings,
    toggleSafetySetting,
    showToast,
    liveConnected,
    refreshLive,
  } = useApp();

  const pendingApprovalsCount = approvals.filter(a => a.status === 'pending').length;

  const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
    'home': { title: 'Overview', subtitle: 'Start a task, check approvals, and scan system health' },
    'instructions': { title: 'Getting started', subtitle: 'How EvolveAgent works and how to use it safely' },
    'chat': { title: 'Assistant', subtitle: 'Plan and delegate work through a simple chat' },
    'dev-console': { title: 'Dev Console', subtitle: 'Inspect traces, tool calls, and system health' },
    'code-changes': { title: 'Code Changes', subtitle: 'Review proposed diffs and change sets' },
    'mission-control': { title: 'Mission Control', subtitle: 'Track phases and choose the next best action' },
    'agents': { title: 'Agents', subtitle: 'Manage roles, permissions, and activity' },
    'approvals': { title: 'Approvals', subtitle: 'Review risk, cost, and planned actions' },
    'project-brain': { title: 'Project Brain', subtitle: 'Search memories and decision records' },
    'tools': { title: 'Tools', subtitle: 'Connectors, MCP hubs, and permission modes' },
    'governance': { title: 'Governance', subtitle: 'Policies, audit log, and safety thresholds' },
    'settings': { title: 'Settings', subtitle: 'Models, defaults, memory, and appearance' },
    'design-system': { title: 'Design System', subtitle: 'Tokens, components, and interaction rules' },
    'command-center': { title: 'Command Center', subtitle: 'Operational overview and controls' },
    'chief-of-staff': { title: 'Chief of Staff', subtitle: 'Priorities, briefings, and follow-ups' },
    'marketplace-hub': { title: 'Marketplace', subtitle: 'Browse and manage agent capabilities' },
    'compliance': { title: 'Compliance', subtitle: 'Checks, evidence, and policy posture' },
    'departments': { title: 'Departments', subtitle: 'Organize agents and ownership by team' },
  };

  const currentInfo = pageTitles[activePage] || { title: 'EvolveAgent', subtitle: 'Local-first multi-agent workspace' };

  return (
    <header
      className="sticky top-0 z-40 shrink-0 backdrop-blur-xl border-b border-[var(--ea-line)] px-4 sm:px-6 flex items-center justify-between gap-4"
      style={{ height: 'var(--ea-topbar-h)', background: 'color-mix(in srgb, var(--ea-surface) 92%, transparent)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)] ea-soft hover:ea-ink lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold ea-ink tracking-tight truncate">{currentInfo.title}</h2>
            {pendingApprovalsCount > 0 && activePage !== 'approvals' && (
              <button
                onClick={() => setActivePage('approvals')}
                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--ea-warn-soft)] text-[var(--ea-warn)]"
              >
                <ShieldAlert className="w-3 h-3" />
                <span>{pendingApprovalsCount} need review</span>
              </button>
            )}
          </div>
          <p className="text-[11px] ea-muted truncate hidden sm:block">{currentInfo.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={() => setIsCommandModalOpen(true)}
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--ea-radius-sm)] ea-surface-2 hover:ea-surface border border-[var(--ea-line)] ea-muted hover:ea-ink text-xs transition-all w-36 sm:w-56"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 ea-faint shrink-0" />
            <span className="truncate">Search</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded ea-surface-3 ea-muted border border-[var(--ea-line)]">
            ⌘K
          </kbd>
        </button>

        <div className="hidden xl:flex items-center p-1 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)]">
          {([
            { id: 'chat' as const, label: 'Chat', icon: MessageSquare, toast: 'Switched to Assistant' },
            { id: 'dev-console' as const, label: 'Dev', icon: Terminal, toast: 'Switched to Dev Console' },
            { id: 'mission-control' as const, label: 'Mission', icon: Compass, toast: 'Switched to Mission Control' },
          ]).map((tab) => {
            const Icon = tab.icon;
            const active = activePage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActivePage(tab.id); showToast(tab.toast, 'info'); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  active ? 'bg-[var(--ea-ink)] text-[var(--ea-surface)]' : 'ea-muted hover:ea-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            refreshLive();
            showToast(
              liveConnected ? 'Refreshed live data from backend' : 'Backend offline — showing sample data',
              liveConnected ? 'success' : 'warning'
            );
          }}
          title={liveConnected ? 'Connected — click to refresh' : 'Backend offline — click to retry'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ea-radius-sm)] border text-xs font-medium transition-colors shrink-0 ${
            liveConnected
              ? 'bg-[var(--ea-success-soft)] border-transparent text-[var(--ea-success)]'
              : 'ea-surface-2 border-[var(--ea-line)] ea-muted'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${liveConnected ? 'bg-[var(--ea-success)]' : 'bg-[var(--ea-faint)]'}`} />
          <span className="hidden md:inline">{liveConnected ? 'Live' : 'Sample'}</span>
        </button>

        <button
          onClick={() => toggleSafetySetting('mockSafe')}
          title={safetySettings.mockSafe
            ? 'Mock-Safe ON. Click to allow real non-risky execution.'
            : 'Real Actions ON. Risky actions stay approval-gated.'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ea-radius-sm)] border text-xs font-medium transition-colors shrink-0 ${
            safetySettings.mockSafe
              ? 'bg-[var(--ea-success-soft)] border-transparent text-[var(--ea-success)]'
              : 'bg-[var(--ea-warn-soft)] border-transparent text-[var(--ea-warn)]'
          }`}
        >
          {safetySettings.mockSafe
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <ShieldAlert className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{safetySettings.mockSafe ? 'Mock-Safe' : 'Real'}</span>
        </button>
      </div>
    </header>
  );
};
