import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const tone =
    toast.type === 'warning'
      ? { icon: 'text-[var(--ea-danger)]', chip: 'bg-[var(--ea-danger-soft)]' }
      : toast.type === 'info'
        ? { icon: 'text-[var(--ea-info)]', chip: 'bg-[var(--ea-info-soft)]' }
        : { icon: 'text-[var(--ea-success)]', chip: 'bg-[var(--ea-success-soft)]' };

  const Icon = toast.type === 'warning' ? AlertTriangle : toast.type === 'info' ? Info : CheckCircle2;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-[var(--ea-radius-sm)] border border-[var(--ea-line)] shadow-[var(--ea-shadow-lg)] ea-surface font-sans text-xs font-medium max-w-sm ea-ink">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${tone.chip}`}>
        <Icon className={`w-4 h-4 shrink-0 ${tone.icon}`} />
      </span>
      <span className="flex-1 ea-soft">{toast.message}</span>
    </div>
  );
};
