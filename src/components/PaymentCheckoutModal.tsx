import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Banknote, ChevronDown, Landmark, Receipt, Split } from 'lucide-react';
import { apiFetch, apiOk } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toSelectItems,
} from './ui/select';

interface Bank {
  id: string;
  name: string;
  code: string;
}

/** Shared target shape for the unified checkout (visit session | material sale | group). */
export interface PaymentTarget {
  type: 'visit' | 'material_sale' | 'group';
  id: string;
  customerName: string;
  customerPhone?: string;
  ticketLabel: string;
  lines: { label: string; subtitle?: string; amountEtb: number }[];
  subtotalEtb: number;
  taxEtb: number;
  discountEtb: number;
}

interface PaymentCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PaymentTarget | null;
  onSuccess?: () => void | Promise<void>;
}

type PayMethod = 'cash' | 'bank' | 'mixed';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function PaymentCheckoutModal({ open, onOpenChange, target, onSuccess }: PaymentCheckoutModalProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [method, setMethod] = useState<PayMethod>('cash');
  const [bankId, setBankId] = useState('');
  const [bankName, setBankName] = useState('');
  const [txnReference, setTxnReference] = useState('');
  const [cashAmount, setCashAmount] = useState(0);
  const [bankAmount, setBankAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [cashback, setCashback] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Parents may build a fresh `target` object on every render (e.g. an inline
  // toPaymentTarget() call), so reset state only when the payable changes or the
  // modal opens — never because of an unrelated parent re-render (e.g. polling).
  const lastTargetId = useRef<string>('');
  const lastTargetOpen = useRef<boolean>(false);

  const subtotal = target?.subtotalEtb ?? 0;
  const tax = target?.taxEtb ?? 0;
  const netTotal = Math.max(0, round2(subtotal - discount + tax));
  // Line amounts must sum to net total plus any cashback handed back.
  const neededTotal = round2(netTotal + cashback);
  const allocated = round2((cashAmount || 0) + (bankAmount || 0));
  const remaining = round2(neededTotal - allocated);

  useEffect(() => {
    const key = target ? `${target.type}:${target.id}` : '';
    if (key === lastTargetId.current && open === lastTargetOpen.current) return;
    lastTargetId.current = key;
    lastTargetOpen.current = open;
    if (!target) return;
    setBanks([]);
    setSubmitError('');
    setAdvancedOpen(false);
    setMethod('cash');
    setBankId('');
    setBankName('');
    setTxnReference('');
    setCashAmount(0);
    setBankAmount(0);
    setDiscount(target.discountEtb || 0);
    setCashback(0);
    setSubmitting(false);
    apiFetch('/api/payments/banks')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Bank[]) => setBanks(rows))
      .catch(() => setBanks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, open]);

  const canSubmit =
    !!target &&
    !submitting &&
    (method === 'cash'
      ? true
      : method === 'bank'
        ? !!bankId
        : !!bankId && cashAmount > 0 && bankAmount > 0 && remaining === 0);

  const handleSubmit = async () => {
    if (!target || !canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    const bankLine = {
      method: 'bank' as const,
      bankId: bankId || undefined,
      bankName: bankName || undefined,
      txnReference: txnReference || undefined,
    };
    const payments =
      method === 'cash'
        ? [{ method: 'cash' as const, amountEtb: neededTotal, cashbackEtb: cashback }]
        : method === 'bank'
          ? [{ ...bankLine, amountEtb: neededTotal, cashbackEtb: cashback }]
          : [
              { method: 'cash' as const, amountEtb: cashAmount, cashbackEtb: cashback },
              { ...bankLine, amountEtb: bankAmount, cashbackEtb: 0 },
            ];
    try {
      const res = await apiOk(
        await apiFetch('/api/payments/checkout', {
          method: 'POST',
          body: JSON.stringify({
            payableType: target.type,
            payableId: target.id,
            discountEtb: discount,
            completedAt: new Date().toISOString(),
            payments,
          }),
        }),
      );
      await res.json();
      await onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      setSubmitError(e?.message || 'Checkout failed. Please review the amounts.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target && open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4 text-primary" /> Collect Payment — {target?.customerName} ({target?.ticketLabel})
          </DialogTitle>
          <DialogDescription>
            {target?.customerPhone} · Total:{' '}
            <span className="font-semibold text-foreground">{netTotal.toLocaleString()} ETB</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Advanced options (discount & cashback) — collapsed unless needed */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-medium text-foreground/90 hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <ChevronDown className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                Advanced
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {discount > 0 ? `Discount ${discount.toLocaleString()} ETB` : 'No discount'}
                {cashback > 0 ? ' · cashback' : ''}
              </span>
            </button>
            {advancedOpen && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Discount (ETB)</label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Amount off the subtotal"
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Cashback (ETB)</label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={cashback}
                    onChange={(e) => setCashback(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Cash handed back to the client"
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Itemized summary — just the total */}
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-sm">
            {target?.lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-2 text-muted-foreground">
                <span className="truncate">{l.label}{l.subtitle ? ` — ${l.subtitle}` : ''}</span>
                <span className="font-mono shrink-0">{Number(l.amountEtb).toLocaleString()} ETB</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1.5 text-foreground font-semibold">
              <span>Total</span>
              <span className="font-mono">{netTotal.toLocaleString()} ETB</span>
            </div>
          </div>

          {/* Method selector — Cash, Bank, or a split of both */}
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={method === 'cash' ? 'default' : 'outline'}
              className="text-xs h-9 px-3 flex-1"
              onClick={() => setMethod('cash')}
            >
              <Banknote className="size-3.5 mr-1" />Cash
            </Button>
            <Button
              type="button"
              size="sm"
              variant={method === 'bank' ? 'default' : 'outline'}
              className="text-xs h-9 px-3 flex-1"
              onClick={() => setMethod('bank')}
            >
              <Landmark className="size-3.5 mr-1" />Bank
            </Button>
            <Button
              type="button"
              size="sm"
              variant={method === 'mixed' ? 'default' : 'outline'}
              className="text-xs h-9 px-3 flex-1"
              onClick={() => setMethod('mixed')}
            >
              <Split className="size-3.5 mr-1" />Cash + Bank
            </Button>
          </div>

          {method === 'cash' && (
            <div className="rounded-md border border-border p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Banknote className="size-4" /> Cash received at desk — {netTotal.toLocaleString()} ETB
            </div>
          )}

          {(method === 'bank' || method === 'mixed') && (
            <div className="rounded-md border border-border p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                value={bankId}
                onValueChange={(v) => {
                  const bank = banks.find((b) => b.id === v);
                  setBankId(v);
                  setBankName(bank?.name || '');
                }}
                items={toSelectItems(banks.map((b) => ({ value: b.id, label: b.name })))}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="Select bank / channel" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Txn reference #"
                value={txnReference}
                onChange={(e) => setTxnReference(e.target.value)}
                className="h-9"
              />
            </div>
          )}

          {/* Split amounts are the only place a manual amount is needed */}
          {method === 'mixed' && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0 w-16">Cash</span>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  placeholder="Cash amount ETB"
                  value={cashAmount || ''}
                  onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0 w-16">Bank</span>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  placeholder="Bank amount ETB"
                  value={bankAmount || ''}
                  onChange={(e) => setBankAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {method === 'mixed' && remaining > 0 && (
            <p className="text-sm font-medium text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              Remaining to allocate: {remaining.toLocaleString()} ETB
            </p>
          )}

          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2 flex items-start gap-2">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />{submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Processing…' : `Confirm Payment · ${netTotal.toLocaleString()} ETB`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}