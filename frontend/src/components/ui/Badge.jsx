export function Badge({ tone = 'default', className = '', children, ...rest }) {
  const t =
    tone === 'accent' ? 'ea-chip--accent' :
    tone === 'success' ? 'bg-[var(--ea-success-soft)] text-[var(--ea-success)] border-transparent' :
    tone === 'warn' ? 'bg-[var(--ea-warn-soft)] text-[var(--ea-warn)] border-transparent' :
    tone === 'danger' ? 'bg-[var(--ea-danger-soft)] text-[var(--ea-danger)] border-transparent' : ''
  return <span className={`ea-chip ${t} ${className}`} {...rest}>{children}</span>
}

export default Badge
