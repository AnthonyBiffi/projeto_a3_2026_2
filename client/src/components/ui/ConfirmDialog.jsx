export default function ConfirmDialog({ open, title, children, confirmLabel, loading, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgb(15 23 42 / 45%)', display: 'grid', placeItems: 'center' }}>
      <div style={{ maxWidth: 480, width: 'calc(100% - 2rem)', padding: '1.5rem', borderRadius: 12, background: '#fff' }}>
        <h2>{title}</h2>
        <div>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onCancel} disabled={loading}>Voltar</button>
          <button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
