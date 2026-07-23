import React from 'react';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PageHero: React.FC<PageHeroProps> = ({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
}) => {
  return (
    <section className={`ea-hero ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <div className="ea-chip ea-chip--accent mb-3">{eyebrow}</div>}
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight ea-ink">{title}</h1>
          {description && <p className="mt-2 text-sm sm:text-[15px] leading-relaxed ea-muted max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
};
