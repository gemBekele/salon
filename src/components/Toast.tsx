import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

let _addToast: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

export function showToast(type: ToastMessage['type'], message: string) {
  _addToast?.({ type, message });
}

interface ToastContainerProps {}

export function ToastContainer(_props: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    _addToast = (msg) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...msg, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => { _addToast = null; };
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    error: <AlertTriangle className="w-4 h-4 text-red-500" />,
    info: <Info className="w-4 h-4 text-muted-foreground" />,
  };
  const bg = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
    info: 'bg-muted border-border text-foreground',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md border text-xs font-medium animate-[slideIn_0.2s_ease] ${bg[t.type]}`}>
          {icons[t.type]}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="p-0.5 rounded-md hover:bg-black/5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}