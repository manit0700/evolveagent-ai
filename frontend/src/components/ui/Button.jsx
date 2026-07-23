export function Button({ variant = 'default', size = 'md', className = '', children, ...rest }) {
  const v = variant === 'primary' ? 'ea-btn--primary' : variant === 'ghost' ? 'ea-btn--ghost' : ''
  const s = size === 'sm' ? 'text-xs py-1.5 px-2.5' : ''
  return (
    <button type="button" className={`ea-btn ${v} ${s} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export default Button
