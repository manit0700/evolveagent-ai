import React from 'react';
import { Activity, PlayCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

export type BadgeStatus =
  | 'active'
  | 'idle'
  | 'running'
  | 'waiting'
  | 'waiting_approval'
  | 'blocked'
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'connected'
  | 'disconnected'
  | 'approval-gated'
  | 'error'
  | 'allowed'
  | 'mock_executed';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true
}) => {
  const normalized = status.toLowerCase().replace('_', ' ');

  let bgClass = 'bg-[var(--ea-surface-3)] text-[var(--ea-muted)] border-[var(--ea-line)]';
  let Icon = Clock;

  if (['active', 'completed', 'connected', 'allowed', 'mock executed'].includes(normalized)) {
    bgClass = 'bg-[var(--ea-success-soft)] text-[var(--ea-success)] border-transparent';
    Icon = CheckCircle2;
  } else if (['running', 'in progress'].includes(normalized)) {
    bgClass = 'bg-[var(--ea-info-soft)] text-[var(--ea-info)] border-transparent';
    Icon = PlayCircle;
  } else if (['waiting approval', 'waiting', 'pending', 'approval-gated', 'pending review'].includes(normalized)) {
    bgClass = 'bg-[var(--ea-warn-soft)] text-[var(--ea-warn)] border-transparent';
    Icon = Clock;
  } else if (['blocked', 'error', 'disconnected', 'rejected'].includes(normalized)) {
    bgClass = 'bg-[var(--ea-danger-soft)] text-[var(--ea-danger)] border-transparent';
    Icon = ShieldAlert;
  } else if (['idle'].includes(normalized)) {
    bgClass = 'bg-[var(--ea-accent-soft)] text-[var(--ea-accent)] border-transparent';
    Icon = Activity;
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${bgClass} ${sizeClass}`}>
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span className="capitalize">{normalized}</span>
    </span>
  );
};
