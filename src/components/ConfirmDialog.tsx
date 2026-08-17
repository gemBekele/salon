import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger = false }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-card rounded-md shadow-xl border border-border p-5 w-full max-w-sm mx-4 animate-[scaleIn_0.15s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-md ${danger ? 'bg-red-50 dark:bg-red-950/40' : 'bg-muted'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-muted-foreground'}`} />
          </div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onCancel} className="ml-auto p-1 hover:bg-muted rounded-md"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-[13px] text-muted-foreground mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          <Button onClick={onConfirm} variant={danger ? 'destructive' : 'default'}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}