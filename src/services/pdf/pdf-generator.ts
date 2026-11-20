import { jsPDF } from 'jspdf';
import type { CompanyProfile } from '@/types/database';
import { formatRupees, numberToWordsIndian } from '@/services/gst/gst-engine';
import { AGC_DEFAULT_LOGO_BASE64, RUPEE_SYMBOL_BASE64 } from '@/assets/logo/logo-base64';

export interface InvoicePdfData {
  type: 'sales' | 'purchase' | 'service';
  documentNumber: string;
  invoiceDate: string;
  financialYear: string;
  placeOfSupply: string;
  supplyType: 'intra' | 'inter';
  partyName: string;
  partyMobile?: string;
  partyGstin?: string;
  partyAddress?: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  items: Array<{
    description: string;
    hsnCode?: string;
    sacCode?: string;
    quantity: number;
    grossWeight?: number;
    netWeight?: number;
    ratePaise: number;
    makingChargesPaise?: number;
    discountPaise?: number;
    gstRate: number;
    cgstAmountPaise: number;
    sgstAmountPaise: number;
    igstAmountPaise: number;
    taxableValuePaise: number;
    totalValuePaise: number;
  }>;
  subtotalPaise: number;
  totalDiscountPaise: number;
  totalMakingChargesPaise: number;
  taxableAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  amountReceivedPaise: number;
  balanceDuePaise: number;
  companyProfile: Partial<CompanyProfile>;
  logoBase64?: string;
  signatureBase64?: string;
  notes?: string;
}

/**
 * Generate high-precision vector A4 PDF matching AGC benchmark visual specifications.
 */
export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  // A4 dimensions in mm: 210 x 297
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Use crisp, modern Helvetica for the benchmark clean aesthetic
  doc.setFont('helvetica', 'normal');

  // ─────────────────────────────────────────────────────────────────
  // 1. TOP HEADER: LOGO & INVOICE META (LEFT) | COMPANY INFO (RIGHT)
  // ─────────────────────────────────────────────────────────────────
  let curY = margin + 2;

  // Circular Logo on Top Left
  const logoSize = 22; // mm
  const logoX = margin;
  const logoY = curY;

  // Draw circular crisp ring border (solid black)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5, 'S');

  // Render AGC Logo (use provided logoBase64 or guaranteed embedded asset fallback)
  const logoToRender = data.logoBase64 || AGC_DEFAULT_LOGO_BASE64;
  if (logoToRender) {
    try {
      const format = (logoToRender.includes('image/png') || logoToRender.startsWith('data:image/png')) ? 'PNG' : 'JPEG';
      doc.addImage(
        logoToRender,
        format,
        logoX,
        logoY,
        logoSize,
        logoSize,
        undefined,
        'SLOW'
      );
    } catch {
      // Fallback monogram
      doc.setFillColor(255, 255, 255);
      doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('A', logoX + logoSize / 2 - 2, logoY + logoSize / 2 + 2);
    }
  }

  // Company Information on Right
  const company = data.companyProfile;
  const rightX = pageWidth - margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0); // Solid black
  doc.text(
    (company.business_name || (company as any).businessName || 'ANJANEYA GOLD COMPANY').toUpperCase(),
    rightX,
    curY + 2,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  const addressLines = [
    '#20, 1ST FLOOR, SARASWATHIPURA MAIN ROAD,',
    'OPP. SATHYA SHANTHI GANAPATHI TEMPLE,',
    'NANDINI LAYOUT, BANGALURU - 560096',
    'KARNATAKA',
    `GSTIN: ${company.gstin || '29ACKFA4620Q1ZV'}`,
    company.email ? company.email.toLowerCase() : 'anjaneyagoldcompany@gmail.com',
    `PH: ${company.phone || '9008477669'}`,
  ];

  let addrY = curY + 6;
  for (const line of addressLines) {
    if (line.startsWith('GSTIN:') || line === 'KARNATAKA') {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.setTextColor(0, 0, 0);
    doc.text(line, rightX, addrY, { align: 'right' });
    addrY += 3.7;
  }

  // Title on Left under logo with generous breathing room gap
  curY = logoY + logoSize + 9.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);

  let titleText = 'TAX INVOICE';
  if (data.type === 'purchase') {
    titleText = 'INTERNAL PURCHASE RECORD';
  } else if (data.type === 'service') {
    titleText = 'SERVICE TAX INVOICE';
  }
  doc.text(titleText, margin, curY);

  // Meta lines under title
  curY += 4.5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const metaLabelX = margin;
  const metaValX = margin + 34;

  doc.text('NO.', metaLabelX, curY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.documentNumber, metaValX, curY);

  curY += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('DATE', metaLabelX, curY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  // Format date e.g. 17 NOV 2026
  let formattedDate = data.invoiceDate;
  try {
    const d = new Date(data.invoiceDate);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = d.getFullYear();
      formattedDate = `${day} ${month} ${year}`;
    }
  } catch {}
  doc.text(formattedDate, metaValX, curY);

  curY += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  if (data.type === 'purchase' && data.originalInvoiceNumber) {
    doc.text('DEALER BILL #', metaLabelX, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${data.originalInvoiceNumber} (${data.originalInvoiceDate || ''})`, metaValX, curY);
  } else {
    doc.text('REVERSE CHARGE', metaLabelX, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('NO', metaValX, curY);
  }

  curY = Math.max(curY + 4, addrY + 2);

  // Helper for strictly 2 decimal places formatted Indian currency
  const formatMoney = (paise: number): string => {
    const rs = Math.round(Number(paise) || 0) / 100;
    return rs.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isIntraState = data.supplyType === 'intra';

  // Calculate weight totals across ALL items
  let totalGrossWeight = 0;
  let totalNetWeight = 0;
  for (const item of data.items) {
    if (item.grossWeight && item.grossWeight > 0) {
      totalGrossWeight += item.grossWeight;
    } else if (item.netWeight && item.netWeight > 0) {
      totalGrossWeight += item.netWeight;
    }
    if (item.netWeight && item.netWeight > 0) {
      totalNetWeight += item.netWeight;
    }
  }

  // Column boundaries calibrated for 182mm content width (x: 14 to 196) with ample room for Taxable Value and Amount
  // Col 0: Sr (14 to 23 = 9mm)
  // Col 1: Product Name (23 to 69 = 46mm)
  // Col 2: Gross Wt (69 to 84 = 15mm)
  // Col 3: Net Wt (84 to 99 = 15mm)
  // Col 4: Rate (99 to 116 = 17mm)
  // Col 5: Taxable Value (116 to 143 = 27mm - ample breathing space)
  // Col 6: CGST (143 to 161 = 18mm)
  // Col 7: SGST (161 to 179 = 18mm)
  // Col 8: Amount (179 to 196 = 17mm)
  const colDividers = isIntraState
    ? [14, 23, 69, 84, 99, 116, 143, 161, 179, 196]
    : [14, 23, 69, 84, 99, 116, 143, 178, 196];

  // Vertical Grid Lines for Total Row (Notice: x = 23 is excluded so 'Total' is NEVER split!)
  const totalRowDividers = isIntraState
    ? [14, 69, 84, 99, 116, 143, 161, 179, 196]
    : [14, 69, 84, 99, 116, 143, 178, 196];

  // ─────────────────────────────────────────────────────────────────
  // DYNAMIC ROW HEIGHT & MULTI-PAGE CHUNKING PLANNER
  // ─────────────────────────────────────────────────────────────────
  interface PageChunk {
    pageIndex: number;
    items: typeof data.items;
    startItemIndex: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  }

  // Calculate dynamic row height in millimeters for any item based on text wrap
  const getItemRowHeight = (item: typeof data.items[0]): number => {
    const desc = (item.description || '').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const lines: string[] = doc.splitTextToSize(desc, 42);
    const numLines = Math.max(1, lines.length);
    if (numLines <= 1) return 8.2;
    // 2 lines: 3.0 (top) + 2*3.2 (text) + 0.5 (code gap) + 2.5 (bottom padding) = 12.4mm
    return Math.max(12.0, 3.0 + (numLines * 3.2) + 2.8);
  };

  const getPageChunks = (): PageChunk[] => {
    const total = data.items.length;
    if (total === 0) {
      return [{
        pageIndex: 1,
        items: [],
        startItemIndex: 0,
        isFirstPage: true,
        isLastPage: true,
      }];
    }

    // Measure each item's actual rendered height
    const itemHeights = data.items.map((item) => getItemRowHeight(item));
    const totalItemsHeight = itemHeights.reduce((sum, h) => sum + h, 0);

    // Single-page limit: Up to 12 items fitting within 100mm
    if (total <= 12 && totalItemsHeight <= 100) {
      return [{
        pageIndex: 1,
        items: data.items,
        startItemIndex: 0,
        isFirstPage: true,
        isLastPage: true,
      }];
    }

    // Multi-page chunking
    const chunks: PageChunk[] = [];
    let curIndex = 0;
    let pageNum = 1;

    // Page 1: holds up to 18 items or 150mm without footer, reserving at least 2 items for subsequent pages
    let page1Height = 0;
    let page1Count = 0;
    const maxPage1Items = Math.min(18, total - 2);
    for (let i = 0; i < maxPage1Items; i++) {
      if (page1Height + itemHeights[i] > 150) break;
      page1Height += itemHeights[i];
      page1Count++;
    }
    if (page1Count === 0) page1Count = 1;

    const p1Items = data.items.slice(0, page1Count);
    chunks.push({
      pageIndex: pageNum,
      items: p1Items,
      startItemIndex: 0,
      isFirstPage: true,
      isLastPage: false,
    });
    curIndex = page1Count;
    pageNum++;

    // Subsequent pages
    while (curIndex < total) {
      const remainingItems = data.items.slice(curIndex);
      const remainingHeights = itemHeights.slice(curIndex);
      const remainingTotalHeight = remainingHeights.reduce((sum, h) => sum + h, 0);

      // Can all remaining items fit on the final page with full footer (up to 16 items and max 135mm)?
      if (remainingItems.length <= 16 && remainingTotalHeight <= 135) {
        chunks.push({
          pageIndex: pageNum,
          items: remainingItems,
          startItemIndex: curIndex,
          isFirstPage: false,
          isLastPage: true,
        });
        break;
      }

      // Intermediate page: take up to 20 items or 170mm, reserving at least 2 for the final page
      let pageHeight = 0;
      let take = 0;
      const maxTake = Math.min(20, remainingItems.length - 2);
      for (let i = 0; i < maxTake; i++) {
        if (pageHeight + remainingHeights[i] > 170) break;
        pageHeight += remainingHeights[i];
        take++;
      }
      if (take === 0) take = 1;

      const pItems = remainingItems.slice(0, take);
      chunks.push({
        pageIndex: pageNum,
        items: pItems,
        startItemIndex: curIndex,
        isFirstPage: false,
        isLastPage: false,
      });
      curIndex += take;
      pageNum++;
    }

    return chunks;
  };

  // Helper to render table header at specified topY
  const renderTableHeader = (headerTopY: number): number => {
    const headerHeight = 8;
    const headerBottomY = headerTopY + headerHeight;

    // Header background (White)
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, headerTopY, contentWidth, headerHeight, 'F');

    // Header Text (Solid Black)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    // Col 0: Sr (14 to 23, center = 18.5)
    doc.setFontSize(7.5);
    doc.text('Sr', 18.5, headerTopY + 5.0, { align: 'center' });

    // Col 1: Product Name / HSN Code (23 to 69)
    doc.setFontSize(7.5);
    doc.text('Product Name', 25, headerTopY + 3.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(data.type === 'service' ? 'SAC Code' : 'HSN / SAC Code', 25, headerTopY + 6.6);

    // Col 2: Gross Wt (69 to 84, center = 76.5)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Gross Wt', 76.5, headerTopY + 5.0, { align: 'center' });

    // Col 3: Net Wt. (84 to 99, center = 91.5)
    doc.text('Net Wt.', 91.5, headerTopY + 5.0, { align: 'center' });

    // Col 4: Rate (99 to 116, center = 107.5)
    doc.text('Rate', 107.5, headerTopY + 3.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Per GMS', 107.5, headerTopY + 6.6, { align: 'center' });

    // Col 5: Taxable Value (116 to 143, center = 129.5)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Taxable Value', 129.5, headerTopY + 5.0, { align: 'center' });

    if (isIntraState) {
      // Col 6: CGST (143 to 161, center = 152)
      doc.text('CGST', 152, headerTopY + 3.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('Amt & Rate', 152, headerTopY + 6.6, { align: 'center' });

      // Col 7: SGST (161 to 179, center = 170)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('SGST', 170, headerTopY + 3.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('Amt & Rate', 170, headerTopY + 6.6, { align: 'center' });
    } else {
      // Col 6: IGST (143 to 178, center = 160.5)
      doc.text('IGST', 160.5, headerTopY + 3.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('Amt & Rate', 160.5, headerTopY + 6.6, { align: 'center' });
    }

    // Col Last: Amount (right-aligned at 193)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Amount', 193, headerTopY + 5.0, { align: 'right' });

    // Header top border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.line(margin, headerTopY, pageWidth - margin, headerTopY);

    // Header bottom border
    doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

    return headerBottomY;
  };

  // Helper to render item rows with dynamic height and no word overlap
  const renderItemsRows = (pageItems: typeof data.items, startIdx: number, startY: number): number => {
    let rowY = startY;

    pageItems.forEach((item, index) => {
      const globalIdx = startIdx + index + 1;
      const thisRowHeight = getItemRowHeight(item);

      // Measure wrapped description lines
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      const desc = (item.description || '').toUpperCase();
      const descLines: string[] = doc.splitTextToSize(desc, 42);
      const numLines = Math.max(1, descLines.length);

      // Render Description lines sequentially with proper line-height
      const descStartY = numLines <= 1 ? rowY + 3.2 : rowY + 3.0;
      descLines.forEach((lineText, lIdx) => {
        doc.text(lineText, 25, descStartY + (lIdx * 3.2));
      });

      // Code line (HSN or SAC) rendered cleanly below all description lines
      const codeY = numLines <= 1 ? rowY + 6.6 : descStartY + (numLines * 3.2) + 0.4;
      const code = item.sacCode || item.hsnCode || (data.type === 'service' ? '9971' : '7113');
      const codeLabel = data.type === 'service' ? 'SAC Code' : 'HSN Code';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`${codeLabel} : ${code}`, 25, codeY);

      // Vertically centered alignment for all other columns
      const midY = rowY + (thisRowHeight / 2) + 0.8;

      // Sr
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(String(globalIdx), 18.5, midY, { align: 'center' });

      // Gross Wt (69 to 84, center = 76.5)
      const grossVal = item.grossWeight ? `${item.grossWeight.toFixed(3)} GMS` : (item.netWeight ? `${item.netWeight.toFixed(3)} GMS` : '—');
      doc.text(grossVal, 76.5, midY, { align: 'center' });

      // Net Wt (84 to 99, center = 91.5)
      const netVal = item.netWeight ? `${item.netWeight.toFixed(3)} GMS` : '—';
      doc.text(netVal, 91.5, midY, { align: 'center' });

      // Rate (99 to 116, right align at 114)
      doc.text(formatMoney(item.ratePaise), 114, midY, { align: 'right' });

      // Taxable Value (116 to 143, right align at 141)
      doc.text(formatMoney(item.taxableValuePaise), 141, midY, { align: 'right' });

      // Taxes (Split vertically around midY)
      if (isIntraState) {
        const halfRate = (item.gstRate / 2).toFixed(2);
        doc.text(formatMoney(item.cgstAmountPaise), 159, midY - 1.6, { align: 'right' });
        doc.setFontSize(6.2);
        doc.text(`(${halfRate}%)`, 159, midY + 2.0, { align: 'right' });

        doc.setFontSize(7.5);
        doc.text(formatMoney(item.sgstAmountPaise), 177, midY - 1.6, { align: 'right' });
        doc.setFontSize(6.2);
        doc.text(`(${halfRate}%)`, 177, midY + 2.0, { align: 'right' });
      } else {
        doc.text(formatMoney(item.igstAmountPaise), 176, midY - 1.6, { align: 'right' });
        doc.setFontSize(6.2);
        doc.text(`(${item.gstRate.toFixed(2)}%)`, 176, midY + 2.0, { align: 'right' });
      }

      // Line Amount (Taxable + GST)
      const lineAmountPaise = Math.round(item.taxableValuePaise + item.cgstAmountPaise + item.sgstAmountPaise + item.igstAmountPaise);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(formatMoney(lineAmountPaise), 193, midY, { align: 'right' });

      rowY += thisRowHeight;

      // Row divider line (solid black)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(margin, rowY, pageWidth - margin, rowY);
    });

    return rowY;
  };

  const chunks = getPageChunks();

  // Iterate over each page chunk and render
  chunks.forEach((chunk, chunkIdx) => {
    if (chunkIdx > 0) {
      doc.addPage();
    }

    let tableTopY = 0;

    if (chunk.isFirstPage) {
      // ─────────────────────────────────────────────────────────────
      // 2. BILL TO & PLACE OF SUPPLY CARD (PAGE 1 ONLY)
      // ─────────────────────────────────────────────────────────────
      const billBoxY = curY;
      const billBoxHeight = 23;

      // Background rounded box with solid black border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, billBoxY, contentWidth, billBoxHeight, 2, 2, 'FD');

      // Left: Bill To
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(data.type === 'purchase' ? 'RECEIVED FROM' : 'BILL TO', margin + 4, billBoxY + 4.5);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text((data.partyName || 'Retail Customer').toUpperCase(), margin + 4, billBoxY + 9);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      let pY = billBoxY + 13;
      const partyLines = [
        data.partyAddress || '#9, 1ST MAIN, NANJUNDESHWARA NAGAR, NANDINI LAYOUT',
        'BENGALURU - 560096',
        'KARNATAKA',
      ];
      for (const pl of partyLines) {
        doc.text(pl, margin + 4, pY);
        pY += 3.2;
      }

      // Right: Place of Supply & Badge
      const posRightX = pageWidth - margin - 4;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('PLACE OF SUPPLY', posRightX, billBoxY + 4.5, { align: 'right' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text((data.placeOfSupply || 'KARNATAKA').toUpperCase(), posRightX, billBoxY + 9, { align: 'right' });

      // Supply type tag (Solid Black border & text, White fill)
      const isIntra = data.supplyType === 'intra';
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.roundedRect(posRightX - 48, billBoxY + 12.5, 48, 5.2, 1.2, 1.2, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const supplyBadge = isIntra ? 'INTRASTATE (CGST + SGST)' : 'INTERSTATE (IGST)';
      doc.text(supplyBadge, posRightX - 24, billBoxY + 16.2, { align: 'center' });

      tableTopY = billBoxY + billBoxHeight + 4;
    } else {
      // ─────────────────────────────────────────────────────────────
      // CONTINUATION HEADER (PAGES 2+)
      // ─────────────────────────────────────────────────────────────
      const contHeaderY = margin + 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(titleText, margin, contHeaderY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const titleWidth = doc.getTextWidth(titleText);
      doc.text(`|  NO: ${data.documentNumber}  |  DATE: ${formattedDate}`, margin + titleWidth + 3, contHeaderY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.text(
        (company.business_name || (company as any).businessName || 'ANJANEYA GOLD COMPANY').toUpperCase(),
        rightX,
        contHeaderY + 3.5,
        { align: 'right' }
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`GSTIN: ${company.gstin || '29ACKFA4620Q1ZV'}`, rightX, contHeaderY + 8, { align: 'right' });

      // Horizontal separator line under continuation header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(margin, contHeaderY + 11, pageWidth - margin, contHeaderY + 11);

      tableTopY = contHeaderY + 14;
    }

    // Render Table Header
    const headerBottomY = renderTableHeader(tableTopY);

    // Render Items for this page chunk
    const tableBodyBottom = renderItemsRows(chunk.items, chunk.startItemIndex, headerBottomY);

    if (!chunk.isLastPage) {
      // ─────────────────────────────────────────────────────────────
      // INTERMEDIATE PAGE: CLOSE TABLE AND PRINT CONTINUATION NOTICE
      // ─────────────────────────────────────────────────────────────
      const pageTableBottom = tableBodyBottom;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(margin, pageTableBottom, pageWidth - margin, pageTableBottom);

      // Vertical Grid Lines for Table Body (Header Top to Table Bottom)
      for (const x of colDividers) {
        doc.line(x, tableTopY, x, pageTableBottom);
      }

      // Print continuation note
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`(Continued on Page ${chunk.pageIndex + 1}...)`, pageWidth - margin, pageTableBottom + 5.5, { align: 'right' });
    } else {
      // ─────────────────────────────────────────────────────────────
      // FINAL PAGE: TOTAL ROW, BOXED TOTALS, BANK DETAILS, TERMS, SIGNATORY
      // ─────────────────────────────────────────────────────────────
      const totalRowHeight = 7.5;
      const totalRowTop = tableBodyBottom;
      const totalRowBottom = totalRowTop + totalRowHeight;

      // Total row background (White)
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, totalRowTop, contentWidth, totalRowHeight, 'F');

      // Total row text (Bold Solid Black) - Merged first two columns (14mm to 69mm)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('Total', 18, totalRowTop + 5.0);

      // Total Gross Wt (69 to 84, center = 76.5)
      doc.setFontSize(7);
      doc.text(totalGrossWeight > 0 ? `${totalGrossWeight.toFixed(3)} GMS` : '—', 76.5, totalRowTop + 5.0, { align: 'center' });

      // Total Net Wt (84 to 99, center = 91.5)
      doc.text(totalNetWeight > 0 ? `${totalNetWeight.toFixed(3)} GMS` : '—', 91.5, totalRowTop + 5.0, { align: 'center' });

      // Total Rate (99 to 116)
      doc.text('—', 107.5, totalRowTop + 5.0, { align: 'center' });

      // Total Taxable Value (116 to 143, right align at 141)
      doc.setFontSize(7.5);
      doc.text(formatMoney(data.taxableAmountPaise), 141, totalRowTop + 5.0, { align: 'right' });

      if (isIntraState) {
        doc.text(formatMoney(data.cgstAmountPaise), 159, totalRowTop + 5.0, { align: 'right' });
        doc.text(formatMoney(data.sgstAmountPaise), 177, totalRowTop + 5.0, { align: 'right' });
      } else {
        doc.text(formatMoney(data.igstAmountPaise), 176, totalRowTop + 5.0, { align: 'right' });
      }

      const itemsTotalPaise = Math.round(data.taxableAmountPaise + data.cgstAmountPaise + data.sgstAmountPaise + data.igstAmountPaise);
      doc.text(formatMoney(itemsTotalPaise), 193, totalRowTop + 5.0, { align: 'right' });

      // Horizontal Lines for Table Frame
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(margin, totalRowTop, pageWidth - margin, totalRowTop);
      doc.line(margin, totalRowBottom, pageWidth - margin, totalRowBottom);

      // Vertical Grid Lines for Table Body (Header Top to Total Row Top)
      for (const x of colDividers) {
        doc.line(x, tableTopY, x, totalRowTop);
      }

      // Vertical Grid Lines for Total Row (Notice: x = 23 is excluded so 'Total' is NEVER split!)
      for (const x of totalRowDividers) {
        doc.line(x, totalRowTop, x, totalRowBottom);
      }

      let curFooterY = totalRowBottom + 2.5;

      // ─────────────────────────────────────────────────────────────
      // ROUNDING OFF ROW (RIGHT-ALIGNED UNDER TOTAL ROW)
      // ─────────────────────────────────────────────────────────────
      if (data.roundOffPaise && data.roundOffPaise !== 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text('ROUNDING OFF', 176, curFooterY + 3.2, { align: 'right' });
        const roSign = data.roundOffPaise < 0 ? '-' : '+';
        const roVal = (Math.abs(data.roundOffPaise) / 100).toFixed(2);
        doc.text(`${roSign} ${roVal}`, 193, curFooterY + 3.2, { align: 'right' });
        curFooterY += 4.8;
      }

      // ─────────────────────────────────────────────────────────────
      // AMOUNT IN WORDS & BOXED TOTALS (SOLID BLACK)
      // ─────────────────────────────────────────────────────────────
      const totalsSectionY = curFooterY + 1;

      // Left: Amount in Words
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('AMOUNT IN WORDS', margin, totalsSectionY + 3);

      const words = numberToWordsIndian(data.grandTotalPaise / 100);
      try {
        doc.addImage(RUPEE_SYMBOL_BASE64, 'PNG', margin, totalsSectionY + 5.2, 2.8, 3.4);
      } catch {}
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const cleanWords = words.endsWith('Only') ? words : `${words} Only`;
      doc.text(cleanWords, margin + 4.5, totalsSectionY + 8, { maxWidth: 90 });

      // Right: Boxed Table for Total Invoice Value & Total Amount Payable (All Black, flush right at 196mm)
      const boxW = 82;
      const boxX = pageWidth - margin - boxW; // 196 - 82 = 114
      const boxH = 14;

      // Solid Black border, White fill
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(boxX, totalsSectionY, boxW, boxH, 'FD');

      // Divider between the two rows
      doc.line(boxX, totalsSectionY + 7, boxX + boxW, totalsSectionY + 7);

      const grandTotalFormatted = formatMoney(data.grandTotalPaise);

      // Row 1: Total Invoice Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('Total Invoice Value', boxX + 4, totalsSectionY + 4.8);
      doc.setFontSize(9);
      const valWidth1 = doc.getTextWidth(grandTotalFormatted);
      try {
        doc.addImage(RUPEE_SYMBOL_BASE64, 'PNG', (boxX + boxW - 3) - valWidth1 - 3.2, totalsSectionY + 2.2, 2.7, 3.3);
      } catch {}
      doc.text(grandTotalFormatted, boxX + boxW - 3, totalsSectionY + 4.8, { align: 'right' });

      // Row 2: Total Amount Payable
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text('Total Amount Payable', boxX + 4, totalsSectionY + 11.5);
      doc.setFontSize(10);
      const valWidth2 = doc.getTextWidth(grandTotalFormatted);
      try {
        doc.addImage(RUPEE_SYMBOL_BASE64, 'PNG', (boxX + boxW - 3) - valWidth2 - 3.5, totalsSectionY + 8.8, 2.9, 3.5);
      } catch {}
      doc.text(grandTotalFormatted, boxX + boxW - 3, totalsSectionY + 11.5, { align: 'right' });

      curFooterY = totalsSectionY + boxH + 4;

      // ─────────────────────────────────────────────────────────────
      // STRUCTURED CARDS: BANK DETAILS & TERMS & CONDITIONS (ALL BLACK)
      // ─────────────────────────────────────────────────────────────
      const targetBottom = 278;
      const bankBoxHeight = 17;
      const termsBoxHeight = 23.5;
      const standardFooterHeight = bankBoxHeight + termsBoxHeight + 10; // 50.5mm
      const remainingSpace = targetBottom - curFooterY;

      let bankBoxY: number;
      let termsBoxY: number;
      let sigY: number;

      if (remainingSpace > standardFooterHeight + 6) {
        const extraSpace = remainingSpace - standardFooterHeight;
        const gap1 = Math.min(8, 2.5 + extraSpace * 0.35);
        const gap2 = Math.min(8, 2.5 + extraSpace * 0.35);
        const gap3 = Math.min(8, 2.5 + extraSpace * 0.30);

        bankBoxY = curFooterY + gap1;
        termsBoxY = bankBoxY + bankBoxHeight + gap2;
        sigY = termsBoxY + termsBoxHeight + gap3;
      } else {
        bankBoxY = curFooterY + 2.5;
        termsBoxY = bankBoxY + bankBoxHeight + 2.5;
        sigY = termsBoxY + termsBoxHeight + 2.5;
      }

      // Card 1: Bank Details Card
      doc.setDrawColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, bankBoxY, contentWidth, bankBoxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('BANK DETAILS', margin + 4, bankBoxY + 4.5);

      const bankCol1 = margin + 4;
      const bankCol2 = margin + 46;
      const bankCol3 = margin + 78;
      const bankCol4 = margin + 116;
      const bankCol5 = margin + 152;

      // Labels (Solid Black)
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('A/C NAME', bankCol1, bankBoxY + 8.8);
      doc.text('BANK', bankCol2, bankBoxY + 8.8);
      doc.text('A/C NO', bankCol3, bankBoxY + 8.8);
      doc.text('IFSC CODE', bankCol4, bankBoxY + 8.8);
      doc.text('PAN', bankCol5, bankBoxY + 8.8);

      // Values (Solid Black)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(company.bank_account_name || 'ANJANEYA GOLD COMPANY', bankCol1, bankBoxY + 13.5);
      doc.text(company.bank_name || 'IDFC', bankCol2, bankBoxY + 13.5);
      doc.text(company.bank_account_number || '10309933727', bankCol3, bankBoxY + 13.5);
      doc.text(company.bank_ifsc || 'IDFB0081179', bankCol4, bankBoxY + 13.5);
      doc.text(company.gstin ? company.gstin.slice(2, 12) : 'ACKFA4620Q', bankCol5, bankBoxY + 13.5);

      // Card 2: Terms & Conditions Card
      doc.setDrawColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, termsBoxY, contentWidth, termsBoxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('TERMS & CONDITIONS', margin + 4, termsBoxY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);

      const defaultTerms = [
        '• NO EXCHANGE OR REFUND ON GOODS ONCE SOLD, EXCEPT IN CASE OF MANUFACTURING DEFECTS WITHIN 7 DAYS, WITH ORIGINAL BILL.',
        '• DISCOUNTED ITEMS ARE NOT ELIGIBLE FOR RETURN OR EXCHANGE.',
        '• GOODS MAY BE EXCHANGED OF EQUAL VALUE WITHIN 7 DAYS, SUBJECT TO AVAILABILITY.',
        '• CHEQUES TO BE DRAWN IN FAVOUR OF ANJANEYA GOLD COMPANY. INTEREST @ 24% P.A. ON DISHONOURED CHEQUES.',
        '• ALL DISPUTES SUBJECT TO BENGALURU JURISDICTION ONLY.',
      ];

      let termY = termsBoxY + 8.2;
      for (const t of defaultTerms) {
        doc.text(t, margin + 4, termY);
        termY += 3.0;
      }

      // Authorized Signatory at bottom right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('For ANJANEYA GOLD COMPANY', pageWidth - margin, sigY, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text('Authorized Signatory', pageWidth - margin, sigY + 8.5, { align: 'right' });
    }
  });

  // Stamp Page Numbers (Page X of Y) on ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, 292, { align: 'center' });
  }

  return doc;
}

export function formatRecordToPdfData(
  type: 'sales' | 'purchase' | 'service',
  doc: any,
  company: any = {}
): InvoicePdfData & { documentId: number } {
  const isSales = type === 'sales';
  const isPurchase = type === 'purchase';
  const isService = type === 'service';

  const docNumber = doc.invoice_number || doc.record_number || '';
  const docDate = doc.invoice_date || doc.record_date || new Date().toISOString().slice(0, 10);
  const partyName = doc.customer_name || doc.supplier_name || 'Retail Customer';
  const partyMobile = doc.customer_mobile || doc.supplier_mobile || '';
  const partyGstin = doc.customer_gstin || doc.supplier_gstin || '';
  const partyAddress = doc.customer_address || doc.supplier_address || '';
  const placeOfSupply = doc.place_of_supply || doc.customer_state || doc.supplier_state || 'Karnataka';
  const supplyType = (doc.supply_type || (doc.igst_amount && Number(doc.igst_amount) > 0 ? 'inter' : 'intra')) as 'intra' | 'inter';

  const parsePaise = (val: any, fallback = 0): number => {
    if (val === undefined || val === null || val === '') return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : Math.round(n);
  };

  const items = (doc.items || []).map((item: any) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const ratePaise = parsePaise(item.ratePaise ?? item.rate);
    const makingChargesPaise = parsePaise(item.makingChargesPaise ?? item.making_charges);
    const discountPaise = parsePaise(item.discountPaise ?? item.discount_amount ?? item.discount);
    const taxableValuePaise = parsePaise(
      item.taxableValuePaise ?? item.taxable_value ?? item.taxable_amount,
      Math.max(0, ratePaise * qty + makingChargesPaise - discountPaise)
    );
    const cgstAmountPaise = parsePaise(item.cgstAmountPaise ?? item.cgst_amount);
    const sgstAmountPaise = parsePaise(item.sgstAmountPaise ?? item.sgst_amount);
    const igstAmountPaise = parsePaise(item.igstAmountPaise ?? item.igst_amount);
    const totalValuePaise = parsePaise(
      item.totalValuePaise ?? item.total_value ?? item.total_amount,
      taxableValuePaise + cgstAmountPaise + sgstAmountPaise + igstAmountPaise
    );
    const gstRate =
      Number(item.gstRate ?? item.gst_rate) ||
      Number(item.cgst_rate || 0) + Number(item.sgst_rate || 0) + Number(item.igst_rate || 0) ||
      (isService ? 5 : 3);

    return {
      description: item.description || (isService ? 'Service / Repair Charges' : 'Gold Jewellery Article'),
      hsnCode: item.hsnCode || item.hsn_code || (isService ? undefined : '7113'),
      sacCode: item.sacCode || item.sac_code || (isService ? '9988' : undefined),
      quantity: qty,
      grossWeight: item.grossWeight || (item.gross_weight ? Number(item.gross_weight) : undefined),
      netWeight: item.netWeight || (item.net_weight ? Number(item.net_weight) : undefined),
      ratePaise,
      makingChargesPaise,
      discountPaise,
      gstRate,
      cgstAmountPaise,
      sgstAmountPaise,
      igstAmountPaise,
      taxableValuePaise,
      totalValuePaise,
    };
  });

  const grandTotalPaise = parsePaise(doc.grandTotalPaise ?? doc.grand_total ?? doc.final_amount ?? doc.total_amount);
  const taxableAmountPaise = parsePaise(doc.taxableAmountPaise ?? doc.taxable_amount ?? doc.taxable_value);
  const totalDiscountPaise = parsePaise(doc.totalDiscountPaise ?? doc.discount_amount ?? doc.discount);
  const totalMakingChargesPaise = parsePaise(doc.totalMakingChargesPaise ?? doc.making_charges);
  const subtotalPaise = parsePaise(doc.subtotalPaise ?? doc.subtotal, taxableAmountPaise + totalDiscountPaise);
  const cgstAmountPaise = parsePaise(doc.cgstAmountPaise ?? doc.cgst_amount);
  const sgstAmountPaise = parsePaise(doc.sgstAmountPaise ?? doc.sgst_amount);
  const igstAmountPaise = parsePaise(doc.igstAmountPaise ?? doc.igst_amount);
  const roundOffPaise = parsePaise(doc.roundOffPaise ?? doc.round_off);
  const amountReceivedPaise = parsePaise(doc.amountReceivedPaise ?? doc.amount_received ?? doc.amount_paid);
  const balanceDuePaise = parsePaise(doc.balanceDuePaise ?? doc.balance_due, Math.max(0, grandTotalPaise - amountReceivedPaise));

  return {
    documentId: doc.id ?? doc.documentId ?? doc.document_id ?? 0,
    type,
    documentNumber: docNumber,
    invoiceDate: docDate,
    financialYear: doc.financial_year || '2026-27',
    placeOfSupply,
    supplyType,
    partyName,
    partyMobile,
    partyGstin,
    partyAddress,
    originalInvoiceNumber: doc.original_invoice_number,
    originalInvoiceDate: doc.original_invoice_date,
    items,
    subtotalPaise,
    totalDiscountPaise,
    totalMakingChargesPaise,
    taxableAmountPaise,
    cgstAmountPaise,
    sgstAmountPaise,
    igstAmountPaise,
    roundOffPaise,
    grandTotalPaise,
    amountReceivedPaise,
    balanceDuePaise,
    companyProfile: company,
    notes: doc.notes,
  };
}
