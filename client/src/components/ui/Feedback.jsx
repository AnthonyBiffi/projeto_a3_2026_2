export function Alert({ children, variant = 'info' }) {
  return <div role="alert" className={`alert ${variant}`}>{children}</div>;
}

export function EmptyState({ title, children }) {
  return (
    <div>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`spinner ${className}`} aria-label="Carregando" />;
}

export function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{status}</span>;
}
