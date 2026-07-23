import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageId } from '../types';
import { GlassCard } from '../components/shared/GlassCard';
import { MetricCard } from '../components/shared/MetricCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { RiskBadge } from '../components/shared/RiskBadge';
import { PageHero } from '../components/shared/PageHero';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Users,
  Wrench,
  Activity,
  Check,
  X,
  Play,
  ShieldAlert,
  Github,
  CheckSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const HomeDashboard: React.FC = () => {
  const {
    systemMetrics,
    tasks,
    approvals,
    connectors,
    governanceLogs,
    setActivePage,
    setIsCommandModalOpen,
    approveRequest,
    rejectRequest,
    approveBatchLowRisk,
    runMockWorkflowStep,
    showToast,
  } = useApp();

  const [quickPrompt, setQuickPrompt] = useState('');
  const [expanded, setExpanded] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const recentTasks = tasks.slice(0, 5);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    showToast(`Starting workflow: "${quickPrompt}"...`, 'success');
    setActivePage('chat');
  };

  return (
    <div className={`${!expanded ? 'min-h-[calc(100vh-11rem)] flex flex-col justify-center gap-5' : 'space-y-5 pb-8'}`}>
      <PageHero
        eyebrow="Workspace"
        title="What should we work on?"
        description="Describe a goal. EvolveAgent plans it, routes work to agents, and keeps risky actions behind approvals."
        className={!expanded ? 'max-w-3xl w-full mx-auto' : ''}
      >
        <form onSubmit={handlePromptSubmit} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ea-faint" />
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Ask or assign work — e.g. redesign dashboard cards, scan the repo…"
              className="ea-input pl-10 pr-16"
            />
            <kbd
              onClick={() => setIsCommandModalOpen(true)}
              className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] px-2 py-0.5 rounded ea-surface-3 ea-muted border border-[var(--ea-line)] hidden sm:block"
            >
              ⌘K
            </kbd>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" className="ea-btn ea-btn--primary flex-1 sm:flex-none">
              <span>Start</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Review repo', page: 'chat' as const, icon: Github },
                { label: 'Plan mission', page: 'mission-control' as const, icon: CheckSquare },
                { label: 'Safety audit', page: 'governance' as const, icon: ShieldCheck },
                { label: 'Dev trace', page: 'dev-console' as const, icon: Terminal },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      setActivePage(action.page);
                      showToast(`Opened ${action.label}`, 'info');
                    }}
                    className="ea-btn text-xs py-1.5"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </PageHero>

      {!expanded && (
        <div className={`flex items-center justify-between rounded-[var(--ea-radius-sm)] px-4 py-3 max-w-3xl w-full mx-auto border ${
          pendingApprovals.length > 0
            ? 'bg-[var(--ea-warn-soft)] border-transparent'
            : 'ea-surface-2 border-[var(--ea-line)]'
        }`}>
          <div className={`flex items-center gap-2 text-xs ${pendingApprovals.length > 0 ? 'text-[var(--ea-warn)]' : 'ea-muted'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pendingApprovals.length > 0 ? 'bg-[var(--ea-warn)]' : 'bg-[var(--ea-success)]'}`} />
            {pendingApprovals.length > 0 ? (
              <span>
                {pendingApprovals.length} approval{pendingApprovals.length !== 1 ? 's' : ''} pending
                {pendingApprovals.some((a) => a.riskLevel === 'high') && (
                  <> · {pendingApprovals.filter((a) => a.riskLevel === 'high').length} high risk</>
                )}
              </span>
            ) : (
              <span>All clear — nothing needs your attention</span>
            )}
          </div>
          <button onClick={() => setExpanded(true)} className="flex items-center gap-1 text-xs font-medium text-[var(--ea-accent)]">
            <span>Details</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {expanded && (
        <>
          {(() => {
            const parseMetricValue = (val: string | number) => {
              const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
              return Number.isNaN(num) ? 0 : num;
            };
            const activeMetrics = systemMetrics.filter((m) => parseMetricValue(m.value) > 0);
            const idleMetrics = systemMetrics.filter((m) => parseMetricValue(m.value) === 0);
            const metricIcons = [
              <Users key="u" className="w-4 h-4" />,
              <Activity key="a" className="w-4 h-4" />,
              <ShieldAlert key="s" className="w-4 h-4" />,
              <Wrench key="w" className="w-4 h-4" />,
              <ShieldCheck key="g" className="w-4 h-4" />,
            ];
            const metricPages: PageId[] = ['agents', 'mission-control', 'approvals', 'tools', 'governance'];

            return (
              <>
                {activeMetrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {activeMetrics.map((m) => {
                      const originalIdx = systemMetrics.indexOf(m);
                      return (
                        <MetricCard
                          key={originalIdx}
                          label={m.label}
                          value={m.value}
                          trend={m.trend}
                          isPositive={m.isPositive}
                          subtitle={m.subtitle}
                          icon={metricIcons[originalIdx] ?? <Activity className="w-4 h-4" />}
                          onClick={() => setActivePage(metricPages[originalIdx] ?? 'home')}
                        />
                      );
                    })}
                  </div>
                )}
                {idleMetrics.length > 0 && (
                  <div className="text-[11px] ea-faint">{idleMetrics.map((m) => m.label).join(' · ')} — idle</div>
                )}
              </>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <GlassCard className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)]">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[var(--ea-accent)]" />
                      <h3 className="text-sm font-semibold ea-ink">Activity</h3>
                    </div>
                    <button
                      onClick={() => {
                        setActivePage('dev-console');
                        showToast('Opened trace inspector', 'info');
                      }}
                      className="text-xs font-medium text-[var(--ea-accent)] flex items-center gap-1"
                    >
                      Full trace <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {recentTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)] flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg ea-surface-3 flex items-center justify-center text-sm shrink-0">
                            {t.assignedAgentName.includes('UI')
                              ? '🎨'
                              : t.assignedAgentName.includes('Memory')
                                ? '🧠'
                                : t.assignedAgentName.includes('Impl')
                                  ? '⚡'
                                  : '🛡️'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold ea-ink">{t.title}</span>
                              <RiskBadge level={t.riskLevel} size="sm" />
                            </div>
                            <p className="text-[11px] ea-muted mt-0.5">{t.description}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] ea-faint">
                              <span>{t.assignedAgentName}</span>
                              <span>·</span>
                              <span>{t.phase}</span>
                              <span>·</span>
                              <span>{t.timestamp}</span>
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={t.status} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--ea-line)] flex items-center justify-between text-xs ea-muted">
                  <span>Mission progress 62%</span>
                  <button onClick={runMockWorkflowStep} className="ea-btn text-xs py-1.5">
                    <Play className="w-3.5 h-3.5 text-[var(--ea-success)]" />
                    Simulate step
                  </button>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[var(--ea-warn)]" />
                    <h3 className="text-sm font-semibold ea-ink">Approvals</h3>
                    <span className="ea-chip">{pendingApprovals.length}</span>
                  </div>
                  <button onClick={() => setActivePage('approvals')} className="text-xs font-medium text-[var(--ea-accent)]">
                    View all
                  </button>
                </div>

                {pendingApprovals.length === 0 ? (
                  <div className="py-10 text-center">
                    <CheckCircle2 className="w-8 h-8 text-[var(--ea-success)] mx-auto mb-2" />
                    <p className="text-xs font-medium ea-ink">All clear</p>
                    <p className="text-[11px] ea-muted mt-1">No high-risk operations waiting.</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {pendingApprovals.map((app) => (
                      <div key={app.id} className="p-3 rounded-[var(--ea-radius-sm)] bg-[var(--ea-warn-soft)] space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold ea-ink">{app.title}</h4>
                            <p className="text-[11px] ea-muted mt-0.5 line-clamp-2">{app.description}</p>
                          </div>
                          <RiskBadge level={app.riskLevel} size="sm" />
                        </div>
                        <div className="text-[10px] ea-faint flex items-center justify-between">
                          <span>{app.toolName}</span>
                          <span>{app.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveRequest(app.id)}
                            className="flex-1 ea-btn text-xs py-1.5 bg-[var(--ea-success-soft)] text-[var(--ea-success)] border-transparent"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => rejectRequest(app.id)}
                            className="ea-btn text-xs py-1.5 bg-[var(--ea-danger-soft)] text-[var(--ea-danger)] border-transparent"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pendingApprovals.some((a) => a.riskLevel === 'low') && (
                <button onClick={approveBatchLowRisk} className="mt-4 w-full ea-btn ea-btn--primary text-xs">
                  Approve low-risk batch
                </button>
              )}
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)]">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[var(--ea-success)]" />
                  <h3 className="text-sm font-semibold ea-ink">Tools</h3>
                </div>
                <button onClick={() => setActivePage('tools')} className="text-xs font-medium text-[var(--ea-accent)]">
                  Manage ({connectors.length})
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {connectors.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActivePage('tools')}
                    className="p-3 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)] text-left hover:border-[var(--ea-line-strong)] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold ea-ink truncate">{c.name}</span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'connected' ? 'bg-[var(--ea-success)]' : 'bg-[var(--ea-warn)]'}`} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] ea-faint">
                      <span>{c.category}</span>
                      <span>{c.callsToday} calls</span>
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--ea-line)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--ea-info)]" />
                  <h3 className="text-sm font-semibold ea-ink">Safety</h3>
                </div>
                <button onClick={() => setActivePage('governance')} className="text-xs font-medium text-[var(--ea-accent)]">
                  Policies
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { title: 'Planning-first', detail: 'Agents draft plans before execution', state: 'On' },
                  { title: 'Mock-safe sandbox', detail: 'High-risk ops need sign-off', state: 'On' },
                  { title: 'Audit logging', detail: `${governanceLogs.length} events recorded`, state: 'Active' },
                ].map((row) => (
                  <div key={row.title} className="flex items-center justify-between p-3 rounded-[var(--ea-radius-sm)] ea-surface-2 border border-[var(--ea-line)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--ea-success)]" />
                      <div>
                        <div className="text-xs font-medium ea-ink">{row.title}</div>
                        <div className="text-[11px] ea-muted">{row.detail}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--ea-success)]">{row.state}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <button onClick={() => setExpanded(false)} className="flex items-center gap-1 text-xs ea-muted hover:text-[var(--ea-accent)] font-medium mx-auto">
            <ChevronUp className="w-3.5 h-3.5" />
            Collapse
          </button>
        </>
      )}
    </div>
  );
};
