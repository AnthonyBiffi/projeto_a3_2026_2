import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);

  const notify = (text, tone = 'success') => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 3500);
  };

  return (
    <ToastContext.Provider
      value={{
        success: (text) => notify(text, 'success'),
        error: (text) => notify(text, 'error'),
      }}
    >
      {children}
      {message && <div className={`toast ${message.tone}`}>{message.text}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
