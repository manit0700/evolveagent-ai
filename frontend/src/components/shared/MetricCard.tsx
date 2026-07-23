import React from 'react';
import { GlassCard } from './GlassCard';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  isPositive = true,
  subtitle,
  icon,
  onClick
}) => {
  return (
    <GlassCard hover={!!onClick} onClick={onClick} padding="sm" className="flex flex-col justify-between min-h-[7.5rem]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium ea-muted">{label}</span>
        {icon && (
          <div className="p-1.5 rounded-lg ea-surface-3 text-[var(--ea-accent)] border border-[var(--ea-line)]">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-semibold tracking-tight ea-ink tabular-nums">{value}</span>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              isPositive
                ? 'bg-[var(--ea-success-soft)] text-[var(--ea-success)] border-transparent'
                : 'bg-[var(--ea-warn-soft)] text-[var(--ea-warn)] border-transparent'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>

      {subtitle && <div className="mt-1.5 text-[11px] ea-faint truncate">{subtitle}</div>}
    </GlassCard>
  );
};
