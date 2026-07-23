import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';
import {
  LayoutDashboard,
  MessageSquare,
  Terminal,
  GitPullRequestArrow,
  Compass,
  Users,
  ShieldCheck,
  Brain,
  Wrench,
  Shield,
  Settings,
  Palette,
  Bot,
  Gauge,
  Target,
  Store,
  Scale,
  BookOpen,
  Building2,
} from 'lucide-react';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC<{ mobileOpen?: boolean; setMobileOpen?: (open: boolean) => void }> = ({
  mobileOpen = false,
  setMobileOpen,
}) => {
  const { activePage, setActivePage, approvals, agents, memories } = useApp();

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;
  const activeAgentsCount = agents.filter((a) => a.status === 'active' || a.status === 'running').length;

  const sections: NavSection[] = [
    {
      label: 'Core',
      items: [
        { id: 'home', label: 'Overview', icon: LayoutDashboard },
        { id: 'instructions', label: 'Getting started', icon: BookOpen },
        { id: 'chat', label: 'Assistant', icon: MessageSquare, badge: 'Live' },
      ],
    },
    {
      label: 'Work',
      items: [
        { id: 'mission-control', label: 'Mission Control', icon: Compass },
        { id: 'agents', label: 'Agents', icon: Users, badge: activeAgentsCount },
        { id: 'approvals', label: 'Approvals', icon: ShieldCheck, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined },
        { id: 'project-brain', label: 'Project Brain', icon: Brain, badge: memories.length },
        { id: 'tools', label: 'Tools', icon: Wrench },
      ],
    },
    {
      label: 'Ops',
      items: [
        { id: 'command-center', label: 'Command Center', icon: Gauge },
        { id: 'chief-of-staff', label: 'Chief of Staff', icon: Target },
        { id: 'marketplace-hub', label: 'Marketplace', icon: Store },
        { id: 'departments', label: 'Departments', icon: Building2 },
        { id: 'governance', label: 'Governance', icon: Shield },
        { id: 'compliance', label: 'Compliance', icon: Scale },
      ],
    },
    {
      label: 'System',
      items: [
        { id: 'dev-console', label: 'Dev Console', icon: Terminal },
        { id: 'code-changes', label: 'Code Changes', icon: GitPullRequestArrow },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'design-system', label: 'Design System', icon: Palette },
      ],
    },
  ];

  const handleNav = (id: PageId) => {
    setActivePage(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--ea-overlay)' }}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen shrink-0 border-r border-[var(--ea-line)] ea-surface flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-[var(--ea-shadow-lg)]' : '-translate-x-full'
        }`}
        style={{ width: 'var(--ea-sidebar-w)' }}
      >
        <div className="border-b border-[var(--ea-line)] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--ea-radius-sm)] bg-[var(--ea-ink)] text-[var(--ea-surface)]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight ea-ink">EvolveAgent</h1>
              <p className="text-[11px] ea-muted truncate">Agents, chat, and approvals</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ea-faint">
                {section.label}
              </div>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`group flex w-full items-center gap-2.5 rounded-[var(--ea-radius-sm)] px-2.5 py-2 text-left transition-colors ${
                        isActive
                          ? 'bg-[var(--ea-ink)] text-[var(--ea-surface)]'
                          : 'ea-soft hover:bg-[var(--ea-surface-2)] hover:text-[var(--ea-ink)]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            isActive ? 'bg-white/15 text-inherit' : 'ea-surface-3 ea-muted'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--ea-line)] p-3">
          <div className="rounded-[var(--ea-radius-sm)] ea-surface-2 px-3 py-2.5">
            <div className="text-[11px] font-semibold ea-ink">System</div>
            <div className="mt-1 flex items-center gap-2 text-xs ea-muted">
              <span className="h-2 w-2 rounded-full bg-[var(--ea-success)]" />
              Ready
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
