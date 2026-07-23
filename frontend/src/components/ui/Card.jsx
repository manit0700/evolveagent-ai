// Aligns with EA theme tokens (light web / dark desktop via CSS vars).
export function Card({ hover = false, className = '', children, ...rest }) {
  return (
    <div className={`ea-card ${hover ? 'ea-card--hover' : ''} p-4 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export default Card
