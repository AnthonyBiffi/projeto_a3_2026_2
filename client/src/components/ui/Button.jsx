export function buttonClasses(variant = 'primary', size = 'md') {
  return `button ${variant === 'secondary' ? 'button-secondary' : 'button-primary'} ${size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-3' : ''}`;
}

export default function Button({ children, onClick, disabled, type = 'button', className = '', variant = 'primary', size = 'md' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${buttonClasses(variant, size)} ${className}`}>
      {children}
    </button>
  );
}
