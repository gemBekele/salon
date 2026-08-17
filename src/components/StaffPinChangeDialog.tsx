import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { PinPad } from './PinPad';
import { API_BASE, readApiError } from '../lib/api';

interface StaffPinChangeDialogProps {
  open: boolean;
  staffId: string;
  staffName: string;
  /** The PIN used at login, kept in memory so first-time users don't re-enter it. */
  currentPin?: string;
  onChanged: () => void;
  onClose: () => void;
}

/**
 * Forced PIN change: shown on first login (or after a manager reset).
 * Staff pick a new 4-digit PIN, then confirm it.
 */
export const StaffPinChangeDialog: React.FC<StaffPinChangeDialogProps> = ({
  open,
  staffId,
  staffName,
  currentPin,
  onChanged,
  onClose,
}) => {
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>(
    currentPin ? 'new' : 'current'
  );
  const [enteredCurrentPin, setEnteredCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (pin: string) => {
    if (step === 'current') {
      setEnteredCurrentPin(pin);
      setError(null);
      setStep('new');
      return;
    }
    if (step === 'new') {
      setNewPin(pin);
      setError(null);
      setStep('confirm');
      return;
    }
    // confirm step
    if (pin !== newPin) {
      setError('PINs do not match. Please try again.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(API_BASE + '/api/staff/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          currentPin: enteredCurrentPin || currentPin,
          newPin: pin,
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      onChanged();
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const title =
    step === 'current'
      ? 'Enter your current PIN'
      : step === 'new'
      ? 'Choose a new PIN'
      : 'Confirm your new PIN';

  const description =
    step === 'current'
      ? 'For your security, enter the PIN you just signed in with.'
      : step === 'new'
      ? 'Pick any 4 digits. Avoid easy numbers like 0000 or 1234.'
      : 'Enter the same 4 digits again to confirm.';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <KeyRound className="size-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <p className="text-center text-sm font-semibold text-foreground">
          {staffName}
        </p>

        <PinPad
          key={step}
          error={error}
          onComplete={(pin) => submit(pin)}
          onErrorCleared={() => setError(null)}
          autoClear={false}
          disabled={saving}
        />

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (step === 'confirm') {
              setError(null);
              setStep('new');
            } else {
              onClose();
            }
          }}
          disabled={saving}
        >
          {step === 'confirm' ? 'Back' : 'Cancel'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
