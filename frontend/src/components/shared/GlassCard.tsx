import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'purple' | 'blue' | 'none';
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = false,
  glow = 'none',
  onClick,
  padding = 'md'
}) => {
  const padClass =
    padding === 'none' ? 'p-0' :
    padding === 'sm' ? 'p-3 sm:p-3.5' :
    padding === 'lg' ? 'p-5 sm:p-6' :
    'p-4 sm:p-5';

  return (
    <div
      onClick={onClick}
      className={`ea-card ${hover ? 'ea-card--hover ea-card--interactive' : ''} ${padClass} ${className}`}
      data-glow={glow === 'none' ? undefined : glow}
    >
      {children}
    </div>
  );
};
