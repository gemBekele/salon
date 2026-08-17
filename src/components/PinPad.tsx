import React, { useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface PinPadProps {
  length?: number;
  error?: string | null;
  disabled?: boolean;
  onComplete: (pin: string) => void;
  onErrorCleared?: () => void;
  autoClear?: boolean;
}

/**
 * Big-touch numeric PIN pad for non-technical salon staff.
 * Shows one dot per digit, auto-submits when the full PIN is entered.
 */
export const PinPad: React.FC<PinPadProps> = ({
  length = 4,
  error,
  disabled = false,
  onComplete,
  onErrorCleared,
  autoClear = true,
}) => {
  const [pin, setPin] = React.useState('');
  const [shake, setShake] = React.useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (error && autoClear && pin.length === length) {
      setShake(true);
      const t1 = setTimeout(() => setShake(false), 450);
      const t2 = setTimeout(() => {
        setPin('');
        onErrorCleared?.();
      }, 450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [error, pin, length, autoClear, onErrorCleared]);

  const press = (digit: string) => {
    if (disabled || pin.length >= length) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === length) {
      setTimeout(() => onCompleteRef.current(next), 80);
    }
  };

  const backspace = () => {
    if (disabled) return;
    setPin((p) => p.slice(0, -1));
    onErrorCleared?.();
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div className="w-full max-w-xs mx-auto select-none">
      {/* Dots */}
      <div className={cn('flex items-center justify-center gap-4 py-4', shake && 'animate-shake')}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 w-4 rounded-full border-2 transition-all duration-150',
              i < pin.length
                ? 'bg-primary border-primary scale-110'
                : 'border-muted-foreground/40 bg-transparent'
            )}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm font-medium text-destructive pb-2">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k, idx) =>
          k === '' ? (
            <div key={idx} />
          ) : k === 'back' ? (
            <Button
              key={idx}
              type="button"
              variant="outline"
              onClick={backspace}
              disabled={disabled || pin.length === 0}
              className="h-14 rounded-md text-lg"
              aria-label="Delete last digit"
            >
              <Delete className="size-4" />
            </Button>
          ) : (
            <Button
              key={idx}
              type="button"
              variant="outline"
              onClick={() => press(k)}
              disabled={disabled}
              className="h-14 rounded-md text-xl font-medium"
            >
              {k}
            </Button>
          )
        )}
      </div>
    </div>
  );
};
