import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';
import {
  Search,
  Menu,
  ShieldAlert,
  Bell,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export const TopBar: React.FC<{ setMobileOpen: (open: boolean) => void }> = ({ setMobileOpen }) => {
  const {
    activePage,
    setActivePage,
    setIsCommandModalOpen,
    approvals,
    liveConnected,
    refreshLive,
  } = useApp();

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  const pageTitles: Record<PageId, { title: string; subtitle: string }> = {
    home: { title: 'Overview', subtitle: 'Track system activity, team flow, and open work.' },
    instructions: { title: 'Getting started', subtitle: 'Learn how EvolveAgent works and how to use it safely.' },
    chat: { title: 'Assistant Chat', subtitle: 'A simple, focused conversation workspace.' },
    'dev-console': { title: 'Dev Console', subtitle: 'Inspect traces, tool runs, and debugging details.' },
    'mission-control': { title: 'Mission Control', subtitle: 'See active workflows and what needs attention next.' },
    agents: { title: 'Agents', subtitle: 'Manage active agents, roles, and behavior.' },
    approvals: { title: 'Approvals', subtitle: 'Review items that need confirmation or intervention.' },
    'project-brain': { title: 'Project Brain', subtitle: 'Search memory, records, and project knowledge.' },
    tools: { title: 'Tools Hub', subtitle: 'Browse integrations, MCP tools, and connected capabilities.' },
    governance: { title: 'Governance', subtitle: 'Monitor safety, auditability, and control settings.' },
    settings: { title: 'Settings', subtitle: 'Adjust workspace behavior, models, and defaults.' },
    'design-system': { title: 'Design System', subtitle: 'Review tokens, patterns, and interface rules.' },
    'command-center': { title: 'Command Center', subtitle: 'Coordinate operations across the workspace.' },
    'chief-of-staff': { title: 'Chief of Staff', subtitle: 'Stay on top of planning, priorities, and follow-through.' },
    'marketplace-hub': { title: 'Marketplace', subtitle: 'Explore packs, tools, and reusable capabilities.' },
    compliance: { title: 'Compliance', subtitle: 'Review policy, retention, and risk-sensitive activity.' },
    'code-changes': { title: 'Code Changes', subtitle: 'Track updates, diffs, and implementation progress.' },
    departments: { title: 'Departments', subtitle: 'Organize agents and ownership by team.' },
  };

  const currentInfo =
    pageTitles[activePage] || {
      title: 'EvolveAgent',
      subtitle: 'Focused AI workspace for operators, builders, and teams.',
    };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ea-line)] backdrop-blur-xl" style={{ background: 'color-mix(in srgb, var(--ea-surface) 88%, transparent)' }}>
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6" style={{ height: 'var(--ea-topbar-h)' }}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-2 ea-soft transition hover:bg-[var(--ea-surface)] hover:text-[var(--ea-ink)] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold tracking-tight ea-ink sm:text-base">
                {currentInfo.title}
              </h2>

              {pendingApprovalsCount > 0 && activePage !== 'approvals' && (
                <button
                  onClick={() => setActivePage('approvals')}
                  className="hidden items-center gap-1 rounded-full bg-[var(--ea-warn-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--ea-warn)] transition sm:inline-flex"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>{pendingApprovalsCount} pending</span>
                </button>
              )}
            </div>

            <p className="hidden truncate text-[11px] ea-muted sm:block">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsCommandModalOpen(true)}
            className="flex w-40 items-center justify-between gap-3 rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 px-3 py-2 text-xs ea-muted transition hover:bg-[var(--ea-surface)] hover:text-[var(--ea-ink)] sm:w-64"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--ea-accent)]" />
              <span className="truncate">Search or ask anything</span>
            </div>
            <kbd className="hidden rounded-md border border-[var(--ea-line)] ea-surface px-1.5 py-0.5 font-mono text-[10px] ea-faint sm:inline-block">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => refreshLive()}
            className="inline-flex items-center gap-2 rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface px-3 py-2 text-xs font-medium ea-soft transition hover:bg-[var(--ea-surface-2)] hover:text-[var(--ea-ink)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="hidden items-center gap-2 rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface px-3 py-2 sm:flex">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                liveConnected ? 'bg-[var(--ea-success)]' : 'bg-[var(--ea-faint)]'
              }`}
            />
            <span className="text-xs font-medium ea-soft">
              {liveConnected ? 'Live connected' : 'Offline'}
            </span>
          </div>

          <button className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface p-2 ea-muted transition hover:bg-[var(--ea-surface-2)] hover:text-[var(--ea-ink)]">
            <Bell className="h-4 w-4" />
          </button>

          <div className="hidden h-10 items-center gap-2 rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 px-3 md:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ea-success-soft)] text-[var(--ea-success)]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-medium ea-ink">Workspace healthy</div>
              <div className="text-[10px] ea-muted">Core systems available</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
