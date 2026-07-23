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
  ChevronRight,
  Gauge,
  Target,
  Store,
  Scale,
} from 'lucide-react';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

export const Sidebar: React.FC<{ mobileOpen?: boolean; setMobileOpen?: (open: boolean) => void }> = ({
  mobileOpen = false,
  setMobileOpen,
}) => {
  const { activePage, setActivePage, approvals, agents, memories } = useApp();

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;
  const activeAgentsCount = agents.filter((a) => a.status === 'active' || a.status === 'running').length;

  const navItems: NavItem[] = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'Assistant Chat', icon: MessageSquare, badge: 'Live' },
    { id: 'dev-console', label: 'Dev Console', icon: Terminal },
    { id: 'code-changes', label: 'Code Changes', icon: GitPullRequestArrow },
    { id: 'mission-control', label: 'Mission Control', icon: Compass },
    { id: 'agents', label: 'Agents', icon: Users, badge: activeAgentsCount },
    { id: 'approvals', label: 'Approvals', icon: ShieldCheck, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined },
    { id: 'project-brain', label: 'Project Brain', icon: Brain, badge: memories.length },
    { id: 'tools', label: 'Tools Hub', icon: Wrench },
    { id: 'governance', label: 'Governance', icon: Shield },
    { id: 'command-center', label: 'Command Center', icon: Gauge },
    { id: 'chief-of-staff', label: 'Chief of Staff', icon: Target },
    { id: 'marketplace-hub', label: 'Marketplace', icon: Store },
    { id: 'compliance', label: 'Compliance', icon: Scale },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'design-system', label: 'Design System', icon: Palette },
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
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 shrink-0 border-r border-slate-200 bg-white/92 backdrop-blur-xl flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl shadow-slate-300/40' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">EvolveAgent</h1>
              <p className="mt-1 text-xs text-slate-500">Focused workspace for chat, agents, tools, and approvals.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Workspace</div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'bg-white/12' : 'bg-slate-100 text-slate-600 group-hover:bg-white'}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'text-white/70' : 'text-slate-300 group-hover:translate-x-0.5'}`} />
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-900">System status</div>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              All core services available
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
