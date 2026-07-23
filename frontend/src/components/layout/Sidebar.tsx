import React, { useEffect, useMemo, useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

type BadgeTone = 'neutral' | 'accent' | 'urgent';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeTone?: BadgeTone;
}

interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

const COLLAPSE_KEY = 'evolveagent-sidebar-collapsed';

function navItemClass(active: boolean, collapsed: boolean): string {
  const base =
    'ea-nav-item group flex w-full items-center rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200';
  const pad = collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2';
  const state = active
    ? 'ea-nav-item--active bg-slate-900 text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  return `${base} ${pad} ${state}`;
}

function badgeClass(active: boolean, tone: BadgeTone = 'neutral'): string {
  if (active) return 'bg-white/15 text-white';
  if (tone === 'urgent') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (tone === 'accent') return 'bg-sky-50 text-sky-700 border border-sky-100';
  return 'bg-slate-100 text-slate-600';
}

export const Sidebar: React.FC<{ mobileOpen?: boolean; setMobileOpen?: (open: boolean) => void }> = ({
  mobileOpen = false,
  setMobileOpen,
}) => {
  const { activePage, setActivePage, approvals, agents, memories } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;
  const activeAgentsCount = agents.filter((a) => a.status === 'active' || a.status === 'running').length;

  const sections: NavSection[] = useMemo(
    () => [
      {
        id: 'primary',
        label: 'Workspace',
        items: [
          { id: 'home', label: 'Overview', icon: LayoutDashboard },
          { id: 'chat', label: 'Assistant', icon: MessageSquare, badge: 'Live', badgeTone: 'accent' },
          {
            id: 'approvals',
            label: 'Approvals',
            icon: ShieldCheck,
            badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
            badgeTone: 'urgent',
          },
          { id: 'mission-control', label: 'Mission Control', icon: Compass },
        ],
      },
      {
        id: 'work',
        label: 'Work',
        items: [
          { id: 'agents', label: 'Agents', icon: Users, badge: activeAgentsCount || undefined },
          { id: 'project-brain', label: 'Project Brain', icon: Brain, badge: memories.length || undefined },
          { id: 'tools', label: 'Tools', icon: Wrench },
          { id: 'instructions', label: 'Getting started', icon: BookOpen },
        ],
      },
      {
        id: 'ops',
        label: 'Operations',
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
        id: 'system',
        label: 'System',
        items: [
          { id: 'dev-console', label: 'Dev Console', icon: Terminal },
          { id: 'code-changes', label: 'Code Changes', icon: GitPullRequestArrow },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'design-system', label: 'Design System', icon: Palette },
        ],
      },
    ],
    [activeAgentsCount, memories.length, pendingApprovalsCount]
  );

  const activeSectionLabel = useMemo(() => {
    for (const section of sections) {
      if (section.items.some((item) => item.id === activePage)) return section.label;
    }
    return 'Workspace';
  }, [activePage, sections]);

  const handleNav = (id: PageId) => {
    setActivePage(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNav(item.id)}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
        className={navItemClass(isActive, collapsed)}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'opacity-100' : 'opacity-75'}`} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.label}</span>
            {item.badge !== undefined && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${badgeClass(isActive, item.badgeTone)}`}>
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badgeTone === 'urgent' && item.badge !== undefined && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
        )}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen && setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`ea-sidebar fixed lg:sticky top-0 left-0 z-50 h-screen shrink-0 border-r border-slate-200 bg-white/92 backdrop-blur-xl flex flex-col transition-[width,transform] duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-xl shadow-slate-300/30' : '-translate-x-full'
        } ${collapsed ? 'ea-sidebar--collapsed' : ''}`}
        style={{ width: collapsed ? '4.5rem' : 'var(--ea-sidebar-w)' }}
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        {/* Brand / identity */}
        <div className={`border-b border-slate-200 ${collapsed ? 'px-2 py-3' : 'px-3.5 py-3.5'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden lg:inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-semibold tracking-tight text-slate-900">EvolveAgent</h1>
                <p className="truncate text-[11px] text-slate-500">{activeSectionLabel}</p>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden lg:inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation zones */}
        <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-1.5 py-2.5 space-y-3' : 'px-2.5 py-3 space-y-4'}`}>
          {sections.map((section) => (
            <div key={section.id}>
              {!collapsed && section.label && (
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {section.label}
                </div>
              )}
              {collapsed && section.id !== 'primary' && (
                <div className="mx-auto mb-1.5 h-px w-6 bg-slate-200" aria-hidden />
              )}
              <nav className="space-y-0.5" aria-label={section.label || section.id}>
                {section.items.map((item) => (
                  <div key={item.id} className="relative">
                    {renderItem(item)}
                  </div>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Utility footer */}
        <div className={`border-t border-slate-200 ${collapsed ? 'p-2' : 'p-3'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2" title="Workspace healthy">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="text-[11px] font-semibold text-slate-900">Workspace healthy</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Core systems available
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
