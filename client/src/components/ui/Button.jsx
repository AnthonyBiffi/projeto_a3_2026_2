export function buttonClasses() {
  return 'button';
}

export default function Button({ children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`button ${className}`}>
      {children}
    </button>
  );
}
