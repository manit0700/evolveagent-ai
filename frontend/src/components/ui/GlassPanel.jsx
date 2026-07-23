export function GlassPanel({ className = '', children, ...rest }) {
  return <div className={`ea-card ${className}`} {...rest}>{children}</div>
}

export default GlassPanel
