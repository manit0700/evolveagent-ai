import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/shared/GlassCard';
import { StatusBadge } from '../components/shared/StatusBadge';
import { RiskBadge } from '../components/shared/RiskBadge';
import { PageHero } from '../components/shared/PageHero';
import {
  ShieldAlert,
  Check,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Sparkles,
} from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export const ApprovalsPage: React.FC = () => {
  const { approvals, approveRequest, rejectRequest, approveBatchLowRisk, showToast } = useApp();
  const [selectedId, setSelectedId] = useState<string>(
    approvals.find((a) => a.status === 'pending')?.id || approvals[0]?.id || 'app-01'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const selectedItem = approvals.find((a) => a.id === selectedId) || approvals[0];

  const filteredApprovals = useMemo(
    () =>
      approvals.filter((a) => {
        const matchesStatus = statusFilter === 'all' ? true : a.status === statusFilter;
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          a.title.toLowerCase().includes(q) ||
          a.agentName.toLowerCase().includes(q) ||
          a.toolName.toLowerCase().includes(q);
        return matchesStatus && matchesQuery;
      }),
    [approvals, searchQuery, statusFilter]
  );

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const approvedToday = approvals.filter((a) => a.status === 'approved').length + 14;
  const rejectedToday = approvals.filter((a) => a.status === 'rejected').length + 2;
  const highRiskPending = approvals.filter((a) => a.status === 'pending' && a.riskLevel === 'high').length;

  const metrics = [
    { label: 'Pending', value: String(pendingCount), hint: 'Need sign-off', tone: 'warn' as const },
    { label: 'Approved', value: String(approvedToday), hint: 'Today', tone: 'ok' as const },
    { label: 'Rejected', value: String(rejectedToday), hint: 'Today', tone: 'danger' as const },
    { label: 'High risk', value: String(highRiskPending), hint: 'In queue', tone: 'warn' as const },
  ];

  const toneValue = (tone: 'ok' | 'warn' | 'danger' | 'accent') =>
    tone === 'ok'
      ? 'text-[var(--ea-success)]'
      : tone === 'warn'
        ? 'text-[var(--ea-warn)]'
        : tone === 'danger'
          ? 'text-[var(--ea-danger)]'
          : 'text-[var(--ea-accent)]';

  if (!selectedItem) {
    return (
      <div className="ea-hero">
        <h1 className="text-xl font-semibold ea-ink">Approvals</h1>
        <p className="mt-2 text-sm ea-muted">No approval requests yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHero
        eyebrow="Governance"
        title="Approvals"
        description="Review planned actions, risk, and scope before anything runs outside the sandbox."
        actions={
          <button type="button" onClick={approveBatchLowRisk} className="ea-btn ea-btn--primary">
            <Sparkles className="h-4 w-4" />
            Approve low-risk batch
          </button>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 px-3 py-2.5">
              <div className="text-[11px] font-medium ea-muted">{m.label}</div>
              <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneValue(m.tone)}`}>{m.value}</div>
              <div className="text-[11px] ea-faint">{m.hint}</div>
            </div>
          ))}
        </div>
      </PageHero>

      {selectedItem.status === 'pending' && (
        <section className="ea-hero">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ea-chip bg-[var(--ea-warn-soft)] text-[var(--ea-warn)] border-transparent">Needs review</span>
                <RiskBadge level={selectedItem.riskLevel} />
                <span className="text-[11px] ea-faint">{selectedItem.timestamp}</span>
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight ea-ink">{selectedItem.title}</h2>
                <p className="mt-1 text-sm ea-muted">
                  Requested by <span className="font-medium ea-ink">{selectedItem.agentName}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] ea-faint">Intent</div>
                  <p className="mt-1.5 text-sm ea-soft leading-relaxed">{selectedItem.intent}</p>
                </div>
                <div className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-3.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] ea-faint">Planned action</div>
                  <p className="mt-1.5 text-sm font-medium text-[var(--ea-warn)] leading-relaxed">{selectedItem.plannedAction}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs ea-muted">Scopes</span>
                {selectedItem.permissionScopes.map((scope) => (
                  <span key={scope} className="ea-chip">
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 rounded-[var(--ea-radius)] border border-[var(--ea-line)] ea-surface-2 p-3.5 lg:w-56">
              <button type="button" onClick={() => approveRequest(selectedItem.id)} className="ea-btn ea-btn--primary w-full">
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => rejectRequest(selectedItem.id)}
                className="ea-btn w-full bg-[var(--ea-danger-soft)] text-[var(--ea-danger)] border-transparent"
              >
                <X className="h-4 w-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={() => showToast('Opened scope modification modal...', 'info')}
                className="ea-btn w-full"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit scope
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="flex flex-col gap-3 border-b border-[var(--ea-line)] pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[var(--ea-warn)]" />
                <h3 className="text-sm font-semibold ea-ink">Queue</h3>
                <span className="ea-chip">{filteredApprovals.length}</span>
              </div>
              <div className="flex items-center rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-1 text-xs">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-[var(--ea-ink)] text-[var(--ea-surface)] font-semibold'
                        : 'ea-muted hover:ea-ink'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ea-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, agent, or tool…"
                className="ea-input py-2 pl-10 text-sm"
              />
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--ea-line)] text-[11px] uppercase tracking-wide ea-faint">
                    <th className="px-2 py-2 font-medium">Request</th>
                    <th className="px-2 py-2 font-medium">Agent</th>
                    <th className="px-2 py-2 font-medium">Risk</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApprovals.map((item) => {
                    const isSel = item.id === selectedId;
                    const isPend = item.status === 'pending';
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`cursor-pointer border-b border-[var(--ea-line)] transition-colors last:border-0 ${
                          isSel ? 'bg-[var(--ea-accent-soft)]' : 'hover:bg-[var(--ea-surface-2)]'
                        }`}
                      >
                        <td className="max-w-[220px] truncate px-2 py-3 font-medium ea-ink">{item.title}</td>
                        <td className="px-2 py-3 ea-muted">{item.agentName}</td>
                        <td className="px-2 py-3">
                          <RiskBadge level={item.riskLevel} size="sm" />
                        </td>
                        <td className="px-2 py-3">
                          <StatusBadge status={item.status} size="sm" />
                        </td>
                        <td className="px-2 py-3 text-right">
                          {isPend ? (
                            <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => approveRequest(item.id)}
                                title="Approve"
                                className="rounded-lg bg-[var(--ea-success-soft)] p-1.5 text-[var(--ea-success)]"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => rejectRequest(item.id)}
                                title="Reject"
                                className="rounded-lg bg-[var(--ea-danger-soft)] p-1.5 text-[var(--ea-danger)]"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] ea-faint">{item.timestamp}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredApprovals.length === 0 && (
                <div className="py-10 text-center text-sm ea-muted">No requests match this filter.</div>
              )}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="flex h-full flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--ea-line)] pb-3">
              <span className="text-sm font-semibold ea-ink">Risk detail</span>
              <span className="text-[11px] ea-faint">{selectedItem.id}</span>
            </div>

            <div>
              <h4 className="text-sm font-semibold ea-ink">{selectedItem.title}</h4>
              <div className="mt-2 space-y-2 rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="ea-muted">Tool</span>
                  <strong className="truncate text-[var(--ea-accent)]">{selectedItem.toolName}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="ea-muted">Scope</span>
                  <strong className="truncate ea-ink">{selectedItem.workspaceScope}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="ea-muted">Cost limit</span>
                  <strong className="text-[var(--ea-success)]">{selectedItem.costLimit || '$0.00'}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] ea-faint">Checks</div>
              {selectedItem.governanceChecks.map((chk) => (
                <div key={chk.label} className="rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] ea-surface-2 p-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium ea-ink">{chk.label}</span>
                    {chk.passed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ea-success)]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ea-warn)]">
                        <AlertTriangle className="h-3.5 w-3.5" /> Review
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] ea-muted">{chk.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {selectedItem.status === 'pending' ? (
            <div className="mt-5 space-y-2 border-t border-[var(--ea-line)] pt-4">
              <button type="button" onClick={() => approveRequest(selectedItem.id)} className="ea-btn ea-btn--primary w-full">
                <Check className="h-4 w-4" />
                Grant permission
              </button>
              <button
                type="button"
                onClick={() => rejectRequest(selectedItem.id)}
                className="ea-btn w-full bg-[var(--ea-danger-soft)] text-[var(--ea-danger)] border-transparent"
              >
                Reject request
              </button>
            </div>
          ) : (
            <div className="mt-5 border-t border-[var(--ea-line)] pt-4 text-center">
              <StatusBadge status={selectedItem.status} />
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
