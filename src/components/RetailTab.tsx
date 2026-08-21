import React, { useEffect, useMemo, useState } from 'react';
import { Package, Plus, ShoppingCart, Minus, Trash2, User, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiFetch, apiOk } from '../lib/api';
import { InventoryItem } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PaymentCheckoutModal, PaymentTarget } from './PaymentCheckoutModal';

interface CartLine {
  inventoryItemId: string;
  name: string;
  sku: string;
  unit: string;
  unitPriceEtb: number;
  quantity: number;
  maxStock: number;
}

interface RetailSale {
  id: string;
  customerName: string;
  customerPhone?: string;
  subtotalEtb: number;
  discountEtb: number;
  netTotalEtb: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  items: { itemName: string; quantity: number; unitPriceEtb: number; totalEtb: number }[];
}

interface RetailTabProps {
  companyId: string;
  branchId: string;
  businessUnitId?: string;
  inventoryItems: InventoryItem[];
  onRefresh?: () => void | Promise<void>;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const RetailTab: React.FC<RetailTabProps> = ({
  companyId,
  branchId,
  businessUnitId,
  inventoryItems,
  onRefresh,
}) => {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+251 ');
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [cartError, setCartError] = useState('');
  const [creating, setCreating] = useState(false);
  const [payModal, setPayModal] = useState<PaymentTarget | null>(null);

  const printable = inventoryItems.filter((i) => (i.sellingPriceEtb ?? 0) > 0 && i.currentStock > 0);
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return printable;
    return printable.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  }, [printable, search]);

  const loadSales = async () => {
    const res = await apiFetch(`/api/material-sales?companyId=${encodeURIComponent(companyId)}&branchId=${encodeURIComponent(branchId)}`);
    if (res.ok) setSales(await res.json());
  };

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, branchId]);

  const cartTotal = round2(cart.reduce((a, l) => a + l.unitPriceEtb * l.quantity, 0));

  const addToCart = (item: InventoryItem) => {
    setCartError('');
    setCart((prev) => {
      const existing = prev.find((l) => l.inventoryItemId === item.id);
      if (existing) {
        if (existing.quantity + 1 > item.currentStock) {
          setCartError(`Only ${item.currentStock} × "${item.name}" in stock.`);
          return prev;
        }
        return prev.map((l) => (l.inventoryItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        { inventoryItemId: item.id, name: item.name, sku: item.sku, unit: item.unit, unitPriceEtb: Number(item.sellingPriceEtb), quantity: 1, maxStock: item.currentStock },
      ];
    });
  };

  const setQty = (id: string, qty: number) => {
    setCartError('');
    setCart((prev) =>
      prev.map((l) => {
        if (l.inventoryItemId !== id) return l;
        const clamped = Math.max(1, Math.min(qty, l.maxStock));
        if (qty > l.maxStock) setCartError(`Only ${l.maxStock} × "${l.name}" in stock.`);
        return { ...l, quantity: clamped };
      })
    );
  };

  const createAndCharge = async () => {
    if (cart.length === 0) {
      setCartError('Add at least one product to the sale.');
      return;
    }
    setCartError('');
    setCreating(true);
    try {
      const res = await apiOk(
        await apiFetch('/api/material-sales', {
          method: 'POST',
          body: JSON.stringify({
            companyId,
            branchId,
            businessUnitId,
            customerName: customerName.trim() || 'Walk-in',
            customerPhone: customerPhone.trim().length > 4 ? customerPhone.trim() : null,
            items: cart.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: l.quantity })),
          }),
        }),
      );
      const { id } = await res.json();
      setPayModal({
        type: 'material_sale',
        id,
        customerName: customerName.trim() || 'Walk-in',
        customerPhone: customerPhone.trim().length > 4 ? customerPhone.trim() : undefined,
        ticketLabel: `Retail #${id.slice(-6).toUpperCase()}`,
        lines: cart.map((l) => ({ label: l.name, subtitle: `× ${l.quantity}${l.unit ? ' ' + l.unit : ''}`, amountEtb: l.unitPriceEtb * l.quantity })),
        subtotalEtb: cartTotal,
        taxEtb: 0,
        discountEtb: 0,
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('+251 ');
    } catch (e: any) {
      setCartError(e?.message || 'Could not start the retail sale.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Product shelf */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Retail Products</h3>
                <Badge variant="outline" className="text-[10px]">{printable.length} priced in stock</Badge>
              </div>
              <Input placeholder="Search product or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56 text-sm" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <p className="col-span-full text-sm text-muted-foreground py-8 text-center">
                  No retail products with a selling price in stock. Set prices in Inventory.
                </p>
              ) : (
                filteredProducts.map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground/90 leading-tight">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{item.sku} · {item.currentStock} {item.unit || 'units'}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{Number(item.sellingPriceEtb).toLocaleString()} ETB</span>
                      <Button size="sm" className="h-8 text-xs px-2.5" onClick={() => addToCart(item)}>
                        <Plus className="size-3.5 mr-1" />Add
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent retail sales */}
        <Card className="border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Today's Retail Sales</h3>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No retail sales yet.</p>
            ) : (
              <div className="space-y-2">
                {sales.map((s) => (
                  <div key={s.id} className="rounded-md border border-border p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{s.customerName}</span>
                        {s.customerPhone && <span className="text-[11px] text-muted-foreground font-mono">{s.customerPhone}</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{s.items.map((i) => `${i.itemName} × ${i.quantity}`).join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">{Number(s.netTotalEtb).toLocaleString()} ETB</span>
                      <div>
                        {s.isPaid ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300">Paid</Badge>
                        ) : s.status === 'cancelled' ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Cancelled</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">Unpaid</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart & checkout */}
      <div>
        <Card className="border-border sticky top-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Retail Cart</h3>
              {cart.length > 0 && <Badge variant="secondary" className="text-[10px]">{cart.length} line(s)</Badge>}
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cart is empty — add products from the shelf.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((l) => (
                  <div key={l.inventoryItemId} className="rounded-md border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground/90 truncate">{l.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{l.unitPriceEtb.toLocaleString()} ETB / {l.unit || 'unit'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => setCart((prev) => prev.filter((x) => x.inventoryItemId !== l.inventoryItemId))}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setQty(l.inventoryItemId, l.quantity - 1)}>
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-10 text-center text-sm font-semibold text-foreground">{l.quantity}</span>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setQty(l.inventoryItemId, l.quantity + 1)}>
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{(l.unitPriceEtb * l.quantity).toLocaleString()} ETB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between text-sm text-foreground font-semibold border-t border-border pt-2">
              <span>Subtotal</span>
              <span className="font-mono">{cartTotal.toLocaleString()} ETB</span>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Customer phone (optional)</Label>
                <div className="relative">
                  <Phone className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+251 9x xxx xxxx" className="pl-9 h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Customer name (optional)</Label>
                <div className="relative">
                  <User className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" className="pl-9 h-9 text-sm" />
                </div>
              </div>
            </div>

            {cartError && (
              <p className="text-xs text-destructive flex items-center gap-1 bg-destructive/10 border border-destructive/30 rounded-md p-2">
                <AlertCircle className="size-3.5 shrink-0" />{cartError}
              </p>
            )}

            <Button className="w-full" disabled={cart.length === 0 || creating} onClick={createAndCharge}>
              {creating ? 'Starting sale…' : cartTotal > 0 ? <><CheckCircle2 className="size-4 mr-1.5" />Create & Collect Pay · {cartTotal.toLocaleString()} ETB</> : 'Create & Collect Pay'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Stock is deducted only when the sale is paid. No staff commission on retail.
            </p>
          </CardContent>
        </Card>
      </div>

      <PaymentCheckoutModal
        open={!!payModal}
        onOpenChange={(o) => !o && setPayModal(null)}
        target={payModal}
        onSuccess={async () => {
          await loadSales();
          await onRefresh?.();
        }}
      />
    </div>
  );
};