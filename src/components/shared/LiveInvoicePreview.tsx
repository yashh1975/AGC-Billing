import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Sparkles, Check } from 'lucide-react';
import { formatRupees, numberToWordsIndian } from '@/services/gst/gst-engine';
import logoUrl from '@/assets/logo/agc-logo-circular.png';
import { AGC_DEFAULT_LOGO_BASE64 } from '@/assets/logo/logo-base64';

export interface LiveInvoiceItem {
  description: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  grossWeight?: number;
  netWeight?: number;
  rate: number; // in Rupees
  makingCharges?: number;
  discount?: number; // in Rupees
  gstRate: number; // percentage, e.g. 3 or 18
}
import type { CompanyProfile } from '@/types/database';

export interface LiveInvoicePreviewProps {
  type: 'sales' | 'purchase' | 'service';
  documentNumber?: string;
  invoiceDate?: string;
  partyName?: string;
  partyAddress?: string;
  partyCity?: string;
  partyState?: string;
  partyMobile?: string;
  partyGstin?: string;
  placeOfSupply?: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  items: LiveInvoiceItem[];
  notes?: string;
  companyProfile?: Partial<CompanyProfile>;
  onPrint?: () => void;
  onSavePdf?: () => void;
  isSaving?: boolean;
  sheetRef?: React.Ref<HTMLDivElement>;
}

export function LiveInvoicePreview({
  type,
  documentNumber = 'INV/2026-27/0001',
  invoiceDate = new Date().toISOString().split('T')[0],
  partyName = '',
  partyAddress = '',
  partyCity = 'Bengaluru',
  partyState = 'Karnataka',
  partyMobile = '',
  partyGstin = '',
  placeOfSupply = 'Karnataka',
  originalInvoiceNumber = '',
  originalInvoiceDate = '',
  items = [],
  notes = '',
  companyProfile: propCompanyProfile,
  onPrint,
  onSavePdf,
  isSaving = false,
  sheetRef,
}: LiveInvoicePreviewProps) {
  const [dbCompanyProfile, setDbCompanyProfile] = useState<Partial<CompanyProfile> | null>(propCompanyProfile || null);

  useEffect(() => {
    if (propCompanyProfile) {
      setDbCompanyProfile(propCompanyProfile);
      return;
    }
    let isMounted = true;
    window.api?.db?.companyProfile?.get().then((res: any) => {
      if (isMounted && res?.success && res.data) {
        setDbCompanyProfile(res.data);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [propCompanyProfile]);

  const company = dbCompanyProfile || {};
  const companyBusinessName = (company.business_name || (company as any).businessName || 'ANJANEYA GOLD COMPANY').toUpperCase();
  const companyGstin = company.gstin || '29ACKFA4620Q1ZV';
  const companyEmail = (company.email || 'anjaneyagoldcompany@gmail.com').toLowerCase();
  const companyPhone = company.phone || '9008477669';

  // Determine supply type
  const isIntraState = useMemo(() => {
    const pos = (placeOfSupply || '').trim().toLowerCase();
    return pos === 'karnataka' || pos === '29' || pos === '' || pos === 'ka';
  }, [placeOfSupply]);

  // Compute calculated line items and totals
  const summary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    const computedItems = items.map((item, idx) => {
      const qty = Math.max(1, item.quantity || 1);
      const rate = item.rate || 0;
      const making = item.makingCharges || 0;
      const disc = item.discount || 0;
      const gstPct = item.gstRate || 0;
      const gw = item.grossWeight || item.netWeight || 0;
      const nw = item.netWeight || 0;

      totalGrossWeight += gw;
      totalNetWeight += nw;

      const baseAmount = qty * rate + making;
      const taxable = Math.max(0, baseAmount - disc);

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isIntraState) {
        const halfRate = gstPct / 2;
        cgst = (taxable * halfRate) / 100;
        sgst = (taxable * halfRate) / 100;
      } else {
        igst = (taxable * gstPct) / 100;
      }

      const totalVal = taxable + cgst + sgst + igst;

      subtotal += baseAmount;
      totalDiscount += disc;
      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      return {
        ...item,
        index: idx + 1,
        baseAmount,
        taxable,
        cgst,
        sgst,
        igst,
        totalVal,
      };
    });

    const calculatedTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
    const roundedTotal = Math.round(calculatedTotal);
    const roundOff = roundedTotal - calculatedTotal;

    return {
      items: computedItems,
      subtotal,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGrossWeight,
      totalNetWeight,
      roundOff,
      grandTotal: roundedTotal,
    };
  }, [items, isIntraState]);

  // Format date display (e.g. "17 NOV 2026")
  const formattedDate = useMemo(() => {
    try {
      if (!invoiceDate) return '';
      const d = new Date(invoiceDate);
      if (isNaN(d.getTime())) return invoiceDate;
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return invoiceDate;
    }
  }, [invoiceDate]);

  const documentTitle =
    type === 'purchase'
      ? 'INTERNAL PURCHASE RECORD'
      : type === 'service'
      ? 'SERVICE TAX INVOICE'
      : 'TAX INVOICE';

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Multi-page chunking matching PDF engine
  const pages = useMemo(() => {
    const total = summary.items.length;
    // Up to 12 items comfortably fit on a single page with full header and complete footer
    if (total <= 12) {
      return [{
        pageIndex: 1,
        items: summary.items,
        isFirstPage: true,
        isLastPage: true,
      }];
    }

    const chunks: Array<{
      pageIndex: number;
      items: typeof summary.items;
      isFirstPage: boolean;
      isLastPage: boolean;
    }> = [];

    let remaining = [...summary.items];
    let pageNum = 1;

    // Multi-page: Page 1 holds up to 18 items without footer, reserving at least 2 items for Page 2
    const page1Count = Math.min(18, total - 2);

    const p1Items = remaining.slice(0, page1Count);
    chunks.push({
      pageIndex: pageNum,
      items: p1Items,
      isFirstPage: true,
      isLastPage: false,
    });
    remaining = remaining.slice(page1Count);
    pageNum++;

    while (remaining.length > 0) {
      // If remaining items fit on the final page with footer (up to 16 items)
      if (remaining.length <= 16) {
        chunks.push({
          pageIndex: pageNum,
          items: remaining,
          isFirstPage: false,
          isLastPage: true,
        });
        break;
      }

      const take = Math.min(22, remaining.length - 2);
      const pItems = remaining.slice(0, take);
      chunks.push({
        pageIndex: pageNum,
        items: pItems,
        isFirstPage: false,
        isLastPage: false,
      });
      remaining = remaining.slice(take);
      pageNum++;
    }

    return chunks;
  }, [summary.items]);

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const updateScale = () => {
      if (previewContainerRef.current) {
        const availableW = previewContainerRef.current.clientWidth - 16;
        if (availableW > 0) {
          // Standard A4 pixel width at 96 DPI is 794px
          const s = Math.max(0.35, Math.min(1, availableW / 794));
          setScale(s);
        }
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(previewContainerRef.current);
    return () => ro.disconnect();
  }, []);

  const renderTable = (pageItems: typeof summary.items, isLastPage: boolean) => (
    <div className="mt-5 border border-black bg-white w-full">
      <table className="w-full table-fixed text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-black bg-white text-black font-extrabold uppercase text-[11px]">
            <th style={{ width: '28px' }} className="py-2.5 px-1 text-center border-r border-black">Sr</th>
            <th style={{ width: '146px' }} className="py-2.5 px-2 border-r border-black text-left">
              <div>{type === 'service' ? 'Service Description' : 'Product Name'}</div>
              <div className="text-[9px] font-normal text-black normal-case">
                {type === 'service' ? 'SAC Code' : 'HSN / SAC Code'}
              </div>
            </th>
            <th style={{ width: '62px' }} className="py-2.5 px-1 text-center border-r border-black whitespace-nowrap">Gross Wt</th>
            <th style={{ width: '62px' }} className="py-2.5 px-1 text-center border-r border-black whitespace-nowrap">Net Wt</th>
            <th style={{ width: '68px' }} className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">Rate</th>
            <th style={{ width: '96px' }} className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">Taxable Value</th>
            {isIntraState ? (
              <>
                <th style={{ width: '72px' }} className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">
                  <div>CGST</div>
                  <div className="text-[9px] font-normal text-black normal-case">Amt & Rate</div>
                </th>
                <th style={{ width: '72px' }} className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">
                  <div>SGST</div>
                  <div className="text-[9px] font-normal text-black normal-case">Amt & Rate</div>
                </th>
              </>
            ) : (
              <th style={{ width: '144px' }} className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">
                <div>IGST</div>
                <div className="text-[9px] font-normal text-black normal-case">Amt & Rate</div>
              </th>
            )}
            <th style={{ width: '108px' }} className="py-2.5 pr-3 pl-1 text-right whitespace-nowrap">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {pageItems.length === 0 ? (
            <tr>
              <td colSpan={isIntraState ? 9 : 8} className="py-8 text-center text-black italic">
                No items added yet. Add items in the form to see live calculation.
              </td>
            </tr>
          ) : (
            pageItems.map((item) => (
              <tr key={item.index} className="text-xs text-black">
                <td className="py-2.5 px-1 text-center font-bold border-r border-black text-black">
                  {item.index}
                </td>
                <td className="py-2.5 px-2 border-r border-black break-words">
                  <span className="font-extrabold text-black uppercase block text-[11px] leading-tight break-words">
                    {item.description || 'Gold Article'}
                  </span>
                  <span className="text-[10px] text-black font-mono block mt-0.5">
                    {type === 'service' ? 'SAC Code' : 'HSN Code'} : {item.sacCode || item.hsnCode || (type === 'service' ? '9971' : '7113')}
                  </span>
                </td>
                <td className="py-2.5 px-1 text-center font-bold border-r border-black whitespace-nowrap text-black">
                  {item.grossWeight ? `${item.grossWeight.toFixed(3)} GMS` : (item.netWeight ? `${item.netWeight.toFixed(3)} GMS` : '—')}
                </td>
                <td className="py-2.5 px-1 text-center font-bold border-r border-black whitespace-nowrap text-black">
                  {item.netWeight ? `${item.netWeight.toFixed(3)} GMS` : '—'}
                </td>
                <td className="py-2.5 pr-2 pl-1 text-right font-medium border-r border-black whitespace-nowrap text-black">
                  ₹{(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 pr-2 pl-1 text-right font-bold border-r border-black whitespace-nowrap text-black">
                  ₹{(item.taxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                {isIntraState ? (
                  <>
                    <td className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap text-black">
                      <span className="font-bold block">₹{(item.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[9.5px] text-black block">({(item.gstRate / 2).toFixed(2)}%)</span>
                    </td>
                    <td className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap text-black">
                      <span className="font-bold block">₹{(item.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[9.5px] text-black block">({(item.gstRate / 2).toFixed(2)}%)</span>
                    </td>
                  </>
                ) : (
                  <td className="py-2.5 pr-2 pl-1 text-right border-r border-black whitespace-nowrap text-black">
                    <span className="font-bold block">₹{(item.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[9.5px] text-black block">({item.gstRate.toFixed(2)}%)</span>
                  </td>
                )}
                <td className="py-2.5 pr-3 pl-1 text-right font-extrabold text-black whitespace-nowrap">
                  ₹{(item.totalVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {isLastPage && summary.items.length > 0 && (
          <tfoot>
            <tr className="border-t border-black bg-white text-black font-extrabold text-xs">
              <td colSpan={2} className="py-2 px-3 border-r border-black uppercase text-left">
                Total
              </td>
              <td className="py-2 px-1 text-center border-r border-black whitespace-nowrap">
                {summary.totalGrossWeight > 0 ? `${summary.totalGrossWeight.toFixed(3)} GMS` : '—'}
              </td>
              <td className="py-2 px-1 text-center border-r border-black whitespace-nowrap">
                {summary.totalNetWeight > 0 ? `${summary.totalNetWeight.toFixed(3)} GMS` : '—'}
              </td>
              <td className="py-2 px-1.5 border-r border-black text-center">—</td>
              <td className="py-2 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">
                ₹{summary.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              {isIntraState ? (
                <>
                  <td className="py-2 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">
                    ₹{summary.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">
                    ₹{summary.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </>
              ) : (
                <td className="py-2 pr-2 pl-1 text-right border-r border-black whitespace-nowrap">
                  ₹{summary.totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              )}
              <td className="py-2 pr-3 pl-1 text-right whitespace-nowrap">
                ₹{(summary.totalTaxable + summary.totalCgst + summary.totalSgst + summary.totalIgst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full min-w-0">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between bg-white px-3 sm:px-4 py-2 rounded-lg border border-black shadow-xs gap-2 min-w-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
            A4 INVOICE PREVIEW {pages.length > 1 ? `(${pages.length} PAGES)` : ''}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-100 text-black border border-black rounded whitespace-nowrap">
            {Math.round(scale * 100)}% Fit
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSavePdf && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSavePdf}
              disabled={isSaving}
              className="text-xs h-7 px-2.5 border-black hover:bg-gray-100 text-black flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              {isSaving ? 'Saving...' : 'Save PDF'}
            </Button>
          )}

          {onPrint && (
            <Button
              size="sm"
              onClick={onPrint}
              className="text-xs h-7 px-2.5 bg-black hover:bg-gray-800 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              Print Invoice
            </Button>
          )}
        </div>
      </div>

      {/* A4 Paper Sheets Preview Container */}
      <div ref={previewContainerRef} className="w-full flex flex-col items-center overflow-x-auto pb-4 gap-4 min-w-0">
        {pages.map((page, pIdx) => (
          <div
            key={page.pageIndex}
            style={{
              width: `${Math.round(794 * scale)}px`,
              height: `${Math.round(1123 * scale)}px`,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              ref={pIdx === 0 ? sheetRef : undefined}
              id={pIdx === 0 ? 'invoice-a4-sheet' : `invoice-a4-sheet-p${page.pageIndex}`}
              className="bg-white text-black shadow-xl border border-black font-sans transition-all duration-150 select-text flex flex-col justify-between"
              style={{
                width: '794px',
                minWidth: '794px',
                height: '1123px',
                minHeight: '1123px',
                padding: '36px 40px',
                boxSizing: 'border-box',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              {/* PAGE MAIN CONTENT */}
              <div className="flex-1 space-y-4 flex flex-col">
                {page.isFirstPage ? (
                  <>
                    {/* 1. TOP HEADER: Logo & Invoice Metadata (Left), Company Info (Right) */}
                    <div className="flex justify-between items-start gap-4 pb-5 border-b border-black">
                      {/* Left Header */}
                      <div className="space-y-4">
                        {/* AGC Circular Medallion Logo */}
                        <div className="flex items-center">
                          <img
                            src={(company as any).logo_url || AGC_DEFAULT_LOGO_BASE64 || logoUrl}
                            alt="Anjaneya Gold Company Logo"
                            className="w-16 h-16 rounded-full object-cover border-2 border-black shadow-xs"
                          />
                        </div>

                        <div className="pt-2">
                          <h1 className="text-2xl font-black tracking-tight text-black uppercase">
                            {documentTitle}
                          </h1>

                          <div className="mt-2 space-y-1 text-xs">
                            <div className="flex items-center gap-4">
                              <span className="font-semibold text-black w-28 uppercase">NO.</span>
                              <span className="font-bold text-black">{documentNumber}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-semibold text-black w-28 uppercase">DATE</span>
                              <span className="font-bold text-black">{formattedDate || '—'}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-semibold text-black w-28 uppercase">
                                {type === 'purchase' ? 'DEALER BILL #' : 'REVERSE CHARGE'}
                              </span>
                              <span className="font-bold text-black">
                                {type === 'purchase'
                                  ? `${originalInvoiceNumber || 'DIRECT'} ${originalInvoiceDate ? `(${originalInvoiceDate})` : ''}`
                                  : 'NO'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Company Information */}
                      <div className="text-right space-y-0.5 text-xs text-black max-w-[340px]">
                        <h2 className="text-base font-extrabold uppercase text-black tracking-wide mb-1">
                          {companyBusinessName}
                        </h2>
                        <p className="leading-tight text-black">
                          #20, 1ST FLOOR, SARASWATHIPURA MAIN ROAD,
                        </p>
                        <p className="leading-tight text-black">
                          OPP. SATHYA SHANTHI GANAPATHI TEMPLE,
                        </p>
                        <p className="leading-tight text-black">
                          NANDINI LAYOUT, BANGALURU - 560096
                        </p>
                        <p className="font-semibold text-black">KARNATAKA</p>
                        <p className="font-bold text-black pt-1">
                          GSTIN: {companyGstin}
                        </p>
                        <p className="text-black font-normal">{companyEmail}</p>
                        <p className="font-semibold text-black">PH: {companyPhone}</p>
                      </div>
                    </div>

                    {/* 2. BILL TO & PLACE OF SUPPLY CARD */}
                    <div className="mt-4 p-4 rounded-xl border border-black bg-white flex justify-between items-start gap-4">
                      {/* Left: Customer info */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-black tracking-wider uppercase block">
                          {type === 'purchase' ? 'RECEIVED FROM' : 'BILL TO'}
                        </span>
                        <h3 className="text-sm font-black text-black uppercase">
                          {partyName || 'CASH / RETAIL CUSTOMER'}
                        </h3>
                        <p className="text-xs text-black leading-snug">
                          {partyAddress || '#9, 1ST MAIN, NANDINI LAYOUT'}
                        </p>
                        <p className="text-xs text-black leading-snug">
                          {partyCity ? `${partyCity} - 560096` : 'BENGALURU - 560096'}
                        </p>
                        <p className="text-xs font-semibold text-black uppercase">
                          {partyState || 'KARNATAKA'}
                        </p>
                        {(partyMobile || partyGstin) && (
                          <p className="text-xs text-black pt-0.5">
                            {partyMobile && <span>Mob: {partyMobile}</span>}
                            {partyMobile && partyGstin && <span> | </span>}
                            {partyGstin && <span className="font-semibold">GSTIN: {partyGstin}</span>}
                          </p>
                        )}
                      </div>

                      {/* Right: Place of Supply & Badge */}
                      <div className="text-right space-y-1.5 flex flex-col items-end">
                        <span className="text-[11px] font-bold text-black tracking-wider uppercase">
                          PLACE OF SUPPLY
                        </span>
                        <span className="text-sm font-black text-black uppercase">
                          {placeOfSupply || 'KARNATAKA'}
                        </span>

                        <div className="inline-block mt-1">
                          {isIntraState ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-black border border-black">
                              INTRASTATE (CGST + SGST)
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-black border border-black">
                              INTERSTATE (IGST)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* CONTINUATION HEADER FOR PAGES 2+ */
                  <div className="flex justify-between items-center pb-3 border-b-2 border-black text-black">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black uppercase text-black">{documentTitle}</span>
                      <span className="text-xs text-black">| NO: <strong className="font-bold">{documentNumber}</strong></span>
                      <span className="text-xs text-black">| DATE: <strong className="font-bold">{formattedDate}</strong></span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black uppercase text-black block">{companyBusinessName}</span>
                      <span className="text-[10px] text-black font-semibold block">GSTIN: {companyGstin}</span>
                    </div>
                  </div>
                )}

                {/* 3. ITEMS TABLE */}
                {renderTable(page.items, page.isLastPage)}

                {/* CONTINUATION NOTICE IF NOT LAST PAGE */}
                {!page.isLastPage && (
                  <div className="text-right text-xs font-bold pt-2 italic text-black">
                    (Continued on Page {page.pageIndex + 1}...)
                  </div>
                )}

                {/* 4. TOTALS & WORDS SECTION (ONLY ON LAST PAGE) */}
                {page.isLastPage && (
                  <div className="mt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                    {/* Left: Amount in Words */}
                    <div className="flex-1 space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-black uppercase tracking-wider block">
                        AMOUNT IN WORDS
                      </span>
                      <p className="text-xs font-serif italic text-black font-bold leading-relaxed pt-1 bg-white">
                        ₹ {summary.grandTotal > 0
                          ? numberToWordsIndian(summary.grandTotal)
                          : 'Zero Rupees Only'}
                      </p>
                    </div>

                    {/* Right: Boxed Totals (Matching Image 3 - All Black) */}
                    <div className="w-[350px] shrink-0 space-y-1.5">
                      {summary.roundOff !== 0 && (
                        <div className="flex justify-between items-center text-xs font-bold px-2 py-0.5 text-black">
                          <span>ROUNDING OFF</span>
                          <span>{summary.roundOff > 0 ? '+' : ''}₹{summary.roundOff.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Boxed Table for Total Invoice Value & Total Amount Payable (All Black Borders) */}
                      <div className="border border-black bg-white">
                        <div className="flex justify-between items-center px-4 py-2 border-b border-black text-black">
                          <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap">Total Invoice Value</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold">₹</span>
                            <span className="text-base font-extrabold font-mono">
                              {summary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center px-4 py-2.5 bg-white text-black">
                          <span className="text-xs font-black uppercase tracking-wide whitespace-nowrap">Total Amount Payable</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black">₹</span>
                            <span className="text-lg font-black font-mono">
                              {summary.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. FOOTER STRUCTURED CARDS & SIGNATORY (ONLY ON LAST PAGE) */}
              {page.isLastPage ? (
                <div className="mt-auto space-y-4 pt-4 border-t border-black">
                  {/* Bank Details Card */}
                  <div className="p-3.5 rounded-xl border border-black bg-white">
                    <span className="text-[11px] font-black text-black uppercase tracking-wider block mb-2">
                      BANK DETAILS
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-black block text-[10px] font-bold uppercase">A/C NAME</span>
                        <span className="font-bold text-black">{company.bank_account_name || 'ANJANEYA GOLD COMPANY'}</span>
                      </div>
                      <div>
                        <span className="text-black block text-[10px] font-bold uppercase">BANK</span>
                        <span className="font-bold text-black">{company.bank_name || 'IDFC'}</span>
                      </div>
                      <div>
                        <span className="text-black block text-[10px] font-bold uppercase">A/C NO</span>
                        <span className="font-bold font-mono text-black">{company.bank_account_number || '10309933727'}</span>
                      </div>
                      <div>
                        <span className="text-black block text-[10px] font-bold uppercase">IFSC CODE</span>
                        <span className="font-bold font-mono text-black">{company.bank_ifsc || 'IDFB0081179'}</span>
                      </div>
                      <div>
                        <span className="text-black block text-[10px] font-bold uppercase">PAN</span>
                        <span className="font-bold font-mono text-black">{company.gstin ? company.gstin.slice(2, 12) : 'ACKFA4620Q'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Card */}
                  <div className="p-3.5 rounded-xl border border-black bg-white">
                    <span className="text-[11px] font-black text-black uppercase tracking-wider block mb-1.5">
                      TERMS & CONDITIONS
                    </span>
                    <ul className="text-[10.5px] text-black space-y-0.5 leading-snug">
                      <li>• NO EXCHANGE OR REFUND ON GOODS ONCE SOLD, EXCEPT IN CASE OF MANUFACTURING DEFECTS WITHIN 7 DAYS, WITH ORIGINAL BILL.</li>
                      <li>• DISCOUNTED ITEMS ARE NOT ELIGIBLE FOR RETURN OR EXCHANGE.</li>
                      <li>• GOODS MAY BE EXCHANGED OF EQUAL VALUE WITHIN 7 DAYS, SUBJECT TO AVAILABILITY.</li>
                      <li>• CHEQUES TO BE DRAWN IN FAVOUR OF ANJANEYA GOLD COMPANY. INTEREST @ 24% P.A. ON DISHONOURED CHEQUES.</li>
                      <li>• ALL DISPUTES SUBJECT TO BENGALURU JURISDICTION ONLY.</li>
                    </ul>
                  </div>

                  {/* 6. AUTHORIZED SIGNATORY */}
                  <div className="pt-1 flex justify-between items-end">
                    <div className="text-center text-[10px] font-bold text-black">
                      Page {page.pageIndex} of {pages.length}
                    </div>
                    <div className="text-right space-y-6">
                      <span className="text-xs font-bold text-black uppercase tracking-wide block">
                        For ANJANEYA GOLD COMPANY
                      </span>
                      <span className="text-xs text-black font-semibold block pt-3 border-t border-black min-w-[170px]">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* INTERMEDIATE PAGE BOTTOM BAR */
                <div className="mt-auto pt-3 border-t border-black flex justify-between items-center text-xs">
                  <span className="font-semibold text-black uppercase">TAX INVOICE — {documentNumber}</span>
                  <span className="text-[11px] font-bold text-black">
                    Page {page.pageIndex} of {pages.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
