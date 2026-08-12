import React, { useState } from 'react';
import { Printer, Download, Sparkles, CheckCircle2, Building, Scissors, Phone, FileText, X } from 'lucide-react';
import { Company, Branch, VisitSession, Customer } from '../types';

interface PrintableInvoiceProps {
  session: VisitSession;
  company: Company;
  branch?: Branch;
  customer?: Customer;
  onClose: () => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  session,
  company,
  branch,
  customer,
  onClose,
}) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'standard'>('thermal');

  // Calculations
  const rawSubtotalEtb = session.services.reduce((acc, s) => acc + s.priceEtb, 0);
  const vatRate = 0.15; // 15% Ethiopian VAT
  const vatAmountEtb = Math.round(rawSubtotalEtb * vatRate);
  const discountAmountEtb = Math.round(session.discountEtb || 0);
  const finalTotalEtb = session.netTotalEtb || Math.max(0, rawSubtotalEtb + vatAmountEtb - discountAmountEtb);

  // Loyalty calculations (e.g. 1 point for every 10 ETB spent)
  const pointsEarned = Math.floor(finalTotalEtb / 10);
  const totalCustomerPoints = (customer?.loyaltyPoints || 0) + pointsEarned;

  const handlePrint = () => {
    window.print();
  };

  const receiptNumber = `REC-${session.id.slice(-6).toUpperCase()}`;
  const formattedDate = session.completedAt
    ? new Date(session.completedAt).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-50 bg-[#18181b]/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden font-sans border border-[#efe8d9] my-8 flex flex-col max-h-[90vh]">
        {/* Top Modal Controls (Hidden during print) */}
        <div className="p-4 bg-[#f6f3ec] border-b border-[#efe8d9] flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-[#18181b]" />
            <div>
              <h3 className="font-serif font-bold text-sm text-[#18181b]">Printable Receipt & Tax Invoice</h3>
              <p className="text-[11px] text-[#71717a]">Official fiscal receipt formatted for standard & thermal receipt printers.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Format Switcher */}
            <div className="flex items-center bg-white border border-[#efe8d9] p-0.5 rounded-full text-xs">
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  printFormat === 'thermal' ? 'bg-[#18181b] text-white shadow-xs' : 'text-[#71717a]'
                }`}
              >
                80mm Thermal
              </button>
              <button
                onClick={() => setPrintFormat('standard')}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  printFormat === 'standard' ? 'bg-[#18181b] text-white shadow-xs' : 'text-[#71717a]'
                }`}
              >
                A4 Invoice
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-ink-800 hover:bg-ink-900 text-white font-bold text-xs rounded-full shadow-xs cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-200 text-[#71717a] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTENT AREA */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printable-receipt"
            className={`bg-white shadow-md border border-[#efe8d9] p-6 text-[#18181b] transition-all print:shadow-none print:border-none print:p-0 ${
              printFormat === 'thermal'
                ? 'w-[320px] font-mono text-xs rounded-xl print:w-[80mm]'
                : 'w-full max-w-lg font-sans text-xs rounded-2xl print:w-full'
            }`}
          >
            {/* Thermal Receipt Header */}
            <div className="text-center space-y-1 pb-4 border-b border-dashed border-stone-300">
              <div className="flex items-center justify-center space-x-1.5">
                <Building className="w-4 h-4 text-[#18181b]" />
                <h2 className="font-serif font-bold text-base uppercase tracking-wider">{company.name}</h2>
              </div>
              <p className="text-[11px] font-semibold text-[#18181b]">
                {branch?.name || 'Main Branch'} — {branch?.city || 'Addis Ababa'}
              </p>
              <p className="text-[10px] text-stone-500">
                TIN: <span className="font-mono font-bold">008492031-ET</span> | Tel: +251 911 234 567
              </p>
              <p className="text-[10px] text-stone-500">{branch?.address || 'Kazanchis Commercial Mall, Floor 2'}</p>
            </div>

            {/* Invoice Meta Bar */}
            <div className="py-3 border-b border-dashed border-stone-300 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>RECEIPT NO:</span>
                <span className="font-mono text-ink-800">{receiptNumber}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Queue Token:</span>
                <span className="font-mono font-bold text-[#18181b]">{session.queueNumber}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Date & Time:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Payment Method:</span>
                <span className="uppercase font-bold text-stone-800">{session.paymentMethod || 'CBE Birr'}</span>
              </div>
            </div>

            {/* Customer & Loyalty Banner */}
            <div className="py-2.5 my-2 px-3 bg-ink-50/80 border border-ink-200/80 rounded-xl space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-ink-950">Customer: {session.customerName}</span>
                {customer?.isVip && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-ink-200 text-ink-900">
                    VIP
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center text-[10px] text-ink-900 border-t border-ink-200/60 pt-1">
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-ink-600 shrink-0" />
                  <span>Loyalty Points Earned:</span>
                </span>
                <span className="font-bold font-mono text-ink-950">+{pointsEarned} pts</span>
              </div>
              <div className="flex justify-between text-[10px] text-ink-800">
                <span>Updated Point Balance:</span>
                <span className="font-bold font-mono">{totalCustomerPoints} pts</span>
              </div>
            </div>

            {/* Itemized Services Breakdown */}
            <div className="py-3 space-y-2">
              <div className="flex justify-between text-[10px] uppercase font-bold text-stone-500 border-b pb-1">
                <span>Service Description</span>
                <span>Amount (ETB)</span>
              </div>

              {session.services.map((srv, idx) => {
                const estimatedComm = srv.commissionAmountEtb ?? Math.round(srv.priceEtb * 0.2);
                return (
                  <div key={idx} className="flex justify-between items-start text-[11px] py-0.5">
                    <div>
                      <div className="font-bold text-[#18181b] flex items-center space-x-1">
                        <Scissors className="w-3 h-3 text-[#18181b] shrink-0" />
                        <span>{srv.serviceName}</span>
                      </div>
                      <div className="text-[10px] text-stone-500 pl-4 flex items-center space-x-2">
                        <span>Staff: {srv.staffName}</span>
                        <span className="text-ink-700 font-semibold">(Comm: {estimatedComm} ETB)</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-[#18181b]">
                      {srv.priceEtb.toLocaleString()} ETB
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fiscal Tax Breakdown */}
            <div className="pt-3 border-t border-dashed border-stone-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal (Excl. VAT):</span>
                <span className="font-mono">{rawSubtotalEtb.toLocaleString()} ETB</span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>VAT (15% Ethiopian Tax):</span>
                <span className="font-mono">+{vatAmountEtb.toLocaleString()} ETB</span>
              </div>

              {discountAmountEtb > 0 && (
                <div className="flex justify-between text-ink-700">
                  <span>Loyalty / VIP Discount:</span>
                  <span className="font-mono">-{discountAmountEtb.toLocaleString()} ETB</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-stone-400 text-[#18181b]">
                <span>TOTAL PAID:</span>
                <span className="font-serif text-base font-bold text-ink-800">
                  {finalTotalEtb.toLocaleString()} ETB
                </span>
              </div>
            </div>

            {/* Footer & QR Code Simulation */}
            <div className="mt-5 pt-4 border-t border-dashed border-stone-300 text-center space-y-2 text-[10px] text-stone-500">
              <div className="flex justify-center">
                <div className="w-16 h-16 border-2 border-dashed border-stone-400 rounded-lg flex items-center justify-center font-mono text-[8px] text-stone-400 bg-stone-50">
                  [QR Fiscal]
                </div>
              </div>
              <p className="font-bold text-[#18181b]">Ameseginalehu! Thank you for your visit.</p>
              <p>Powered by Groomly Salon OS • Ethiopian Tax Authority Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Print Optimization */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
