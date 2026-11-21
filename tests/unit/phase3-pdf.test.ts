import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { generateInvoicePdf, formatRecordToPdfData, InvoicePdfData } from '../../src/services/pdf/pdf-generator';
import {
  getFinancialYearForDate,
  getMonthName,
  generateFileName,
} from '../../electron/file-manager';
import { initDatabase, closeDatabase } from '../../electron/database';
import { savePdfDocument } from '../../electron/services/pdf-service';

describe('Phase 3 - PDF Generation, Folder Vault & WhatsApp Engine', () => {
  const sampleInvoiceData: InvoicePdfData = {
    type: 'sales',
    documentNumber: 'AGC/S/26-27/0001',
    invoiceDate: '2026-11-18',
    financialYear: '2026-27',
    placeOfSupply: 'Karnataka',
    supplyType: 'intra',
    partyName: 'Yashwanth Kumar S',
    partyMobile: '9008477669',
    partyGstin: '29ACKFA4620Q1ZV',
    partyAddress: '#9, 1st Main, Nandini Layout, Bengaluru - 560096',
    items: [
      {
        description: 'Gold Ring',
        hsnCode: '7113',
        quantity: 1,
        grossWeight: 1.5,
        netWeight: 1.5,
        ratePaise: 1300000,
        discountPaise: 50000,
        gstRate: 3,
        cgstAmountPaise: 18750,
        sgstAmountPaise: 18750,
        igstAmountPaise: 0,
        taxableValuePaise: 1250000,
        totalValuePaise: 1287500,
      },
    ],
    subtotalPaise: 1300000,
    totalDiscountPaise: 50000,
    totalMakingChargesPaise: 0,
    taxableAmountPaise: 1250000,
    cgstAmountPaise: 18750,
    sgstAmountPaise: 18750,
    igstAmountPaise: 0,
    roundOffPaise: 0,
    grandTotalPaise: 1287500,
    amountReceivedPaise: 1287500,
    balanceDuePaise: 0,
    companyProfile: {
      businessName: 'Anjaneya Gold Company',
      legalName: 'Anjaneya Gold Company',
      gstin: '29ACKFA4620Q1ZV',
      address: '#20, 1st Floor, Saraswathipura Main Road, Nandini Layout',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560096',
      phone: '9008477669',
      email: 'anjaneyagoldcompany@gmail.com',
      bankName: 'IDFC FIRST Bank',
      bankAccountName: 'Anjaneya Gold Company',
      bankAccountNumber: '10309933727',
      bankIfsc: 'IDFB0081179',
      bankBranch: 'Nandini Layout',
    },
  };

  it('sales invoice PDF generation produces valid A4 binary with standard PDF header', () => {
    const doc = generateInvoicePdf(sampleInvoiceData);
    expect(doc).toBeDefined();

    const output = doc.output('datauristring');
    expect(output).toContain('data:application/pdf');

    const rawBuffer = Buffer.from(doc.output('arraybuffer'));
    const header = rawBuffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('sales invoice PDF strictly excludes purity markings from line items and text', () => {
    // Inspect line items passed to PDF
    sampleInvoiceData.items.forEach((item) => {
      expect((item as any).purity).toBeUndefined();
    });

    const doc = generateInvoicePdf(sampleInvoiceData);
    const pdfText = doc.output();
    // Verify common purity strings are not injected
    expect(pdfText).not.toContain('22KT');
    expect(pdfText).not.toContain('916 KDM');
    expect(pdfText).not.toContain('Purity:');

    // Verify lowercase email formatting
    expect(pdfText).toContain('anjaneyagoldcompany@gmail.com');
    expect(pdfText).not.toContain('ANJANEYAGOLDCOMPANY@GMAIL.COM');
  });

  it('dealer purchase PDF includes required internal disclaimer and supplier invoice reference', () => {
    const purchaseData: InvoicePdfData = {
      ...sampleInvoiceData,
      type: 'purchase',
      documentNumber: 'AGC/P/26-27/0001',
      originalInvoiceNumber: 'KB-8899',
      originalInvoiceDate: '2026-11-15',
    };

    const doc = generateInvoicePdf(purchaseData);
    const output = doc.output();
    expect(output).toBeDefined();
    expect(output).toContain('DEALER PURCHASE BILL');
    expect(output).toContain('KB-8899');
  });

  it.each([
    ['2026-11-18', '26-27', 'November'],
    ['2027-02-15', '26-27', 'February'],
    ['2027-04-10', '27-28', 'April'],
  ])('date %s resolves to financial year %s and month subfolder %s', (dateStr, expectedFy, expectedMonth) => {
    expect(getFinancialYearForDate(dateStr)).toBe(expectedFy);
    expect(getMonthName(dateStr)).toBe(expectedMonth);
  });

  it('document file naming sanitizes delimiters and formats standard timestamped filename', () => {
    const fileName = generateFileName('Sales', 'AGC/S/26-27/0001', '2026-11-18');
    expect(fileName).toBe('AGC-S-26-27-0001_2026-11-18.pdf');
    expect(fileName).not.toContain('/');
    expect(fileName).not.toContain('\\');
  });

  it('formatRecordToPdfData correctly maps record properties including documentId and paise amounts', () => {
    const mockDbRecord = {
      id: 42,
      invoice_number: 'AGC-S-2026-27-0004',
      invoice_date: '2026-11-19',
      customer_name: 'Test Customer',
      customer_mobile: '9876543210',
      grand_total: 1475000,
      taxable_amount: 1250000,
      cgst_amount: 112500,
      sgst_amount: 112500,
      igst_amount: 0,
      round_off: 0,
      amount_received: 1475000,
      balance_due: 0,
      items: [
        {
          description: 'Gold Chain',
          hsn_code: '7113',
          quantity: 1,
          gross_weight: 2.0,
          net_weight: 2.0,
          rate_paise: 1300000,
          discount_paise: 50000,
          gst_rate: 18,
          taxable_value_paise: 1250000,
          cgst_amount_paise: 112500,
          sgst_amount_paise: 112500,
          igst_amount_paise: 0,
          total_value_paise: 1475000,
        },
      ],
    };

    const pdfData = formatRecordToPdfData('sales', mockDbRecord);
    expect(pdfData.documentId).toBe(42);
    expect(pdfData.documentNumber).toBe('AGC-S-2026-27-0004');
    expect(pdfData.grandTotalPaise).toBe(1475000);
    expect(pdfData.taxableAmountPaise).toBe(1250000);
    expect(pdfData.items).toHaveLength(1);
    expect((pdfData.items[0] as any).purity).toBeUndefined();
  });

  it('savePdfDocument returns ApiResponse contract with success, data.filePath, and top-level filePath', () => {
    initDatabase(':memory:');
    try {
      const doc = generateInvoicePdf(sampleInvoiceData);
      const pdfBase64 = Buffer.from(doc.output('arraybuffer')).toString('base64');

      const result = savePdfDocument({
        type: 'Sales',
        documentId: 0, // standalone preview save
        documentNumber: 'AGC-S-TEST-0001',
        documentDate: '2026-11-19',
        pdfBase64,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.filePath).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(result.filePath).toBe(result.data?.filePath);
      expect(fs.existsSync(result.filePath!)).toBe(true);

      // Clean up test file
      if (result.filePath && fs.existsSync(result.filePath)) {
        fs.unlinkSync(result.filePath);
      }
    } finally {
      closeDatabase();
    }
  });

  it('multi-page pagination generates single page for <= 12 items and multiple pages for > 12 items', () => {
    // 1 item -> 1 page
    const singlePageDoc = generateInvoicePdf(sampleInvoiceData);
    expect(singlePageDoc.getNumberOfPages()).toBe(1);

    // 12 items -> 1 page (fits cleanly with compact footer layout)
    const twelveItems = Array.from({ length: 12 }, (_, i) => ({
      ...sampleInvoiceData.items[0],
      description: `Gold Item ${i + 1}`,
    }));
    const twelveItemDoc = generateInvoicePdf({
      ...sampleInvoiceData,
      items: twelveItems,
    });
    expect(twelveItemDoc.getNumberOfPages()).toBe(1);

    // 14 items -> 2 pages
    const fourteenItems = Array.from({ length: 14 }, (_, i) => ({
      ...sampleInvoiceData.items[0],
      description: `Gold Item ${i + 1}`,
    }));
    const twoPageDoc = generateInvoicePdf({
      ...sampleInvoiceData,
      items: fourteenItems,
    });
    expect(twoPageDoc.getNumberOfPages()).toBe(2);

    const pdfText = twoPageDoc.output();
    expect(pdfText).toContain('Continued on Page 2');
    expect(pdfText).toContain('Page 1 of 2');
    expect(pdfText).toContain('Page 2 of 2');

    // 35 items -> 3 pages
    const thirtyFiveItems = Array.from({ length: 35 }, (_, i) => ({
      ...sampleInvoiceData.items[0],
      description: `Gold Item ${i + 1}`,
    }));
    const threePageDoc = generateInvoicePdf({
      ...sampleInvoiceData,
      items: thirtyFiveItems,
    });
    expect(threePageDoc.getNumberOfPages()).toBe(3);
    const pdfText3 = threePageDoc.output();
    expect(pdfText3).toContain('Page 1 of 3');
    expect(pdfText3).toContain('Page 3 of 3');
  });

  it('service estimate and service invoice generate proper header titles and synchronized metadata', () => {
    // Service estimate draft
    const serviceDraftData: InvoicePdfData = {
      ...sampleInvoiceData,
      type: 'service',
      documentNumber: 'EST-0006',
      isDraft: true,
      items: [
        {
          description: 'GOLD LOAN TAKEOVER & RELEASE SERVICE',
          sacCode: '9971',
          quantity: 1,
          ratePaise: 50000,
          principalAmountPaise: 10000000,
          serviceAmountPaise: 50000,
          discountPaise: 0,
          gstRate: 18,
          cgstAmountPaise: 4500,
          sgstAmountPaise: 4500,
          igstAmountPaise: 0,
          taxableValuePaise: 50000,
          totalValuePaise: 59000,
        },
      ],
      taxableAmountPaise: 50000,
      cgstAmountPaise: 4500,
      sgstAmountPaise: 4500,
      grandTotalPaise: 59000,
      amountReceivedPaise: 59000,
      balanceDuePaise: 0,
    };

    const docDraft = generateInvoicePdf(serviceDraftData);
    const draftText = docDraft.output();
    expect(draftText).toContain('SERVICE ESTIMATE / QUOTATION');
    expect(draftText).toContain('FOR REFERENCE & ESTIMATION ONLY');
    expect(draftText).toContain('EST-0006');
    expect(draftText).toContain('GSTIN: 29ACKFA4620Q1ZV');
    expect(draftText).toContain('anjaneyagoldcompany@gmail.com');
    expect(draftText).toContain('PH: 9008477669');

    // Service original invoice
    const serviceInvoiceData: InvoicePdfData = {
      ...serviceDraftData,
      documentNumber: 'SRV/2026-27/0001',
      isDraft: false,
    };

    const docInvoice = generateInvoicePdf(serviceInvoiceData);
    const invoiceText = docInvoice.output();
    expect(invoiceText).toContain('SERVICE TAX INVOICE');
    expect(invoiceText).not.toContain('FOR REFERENCE & ESTIMATION ONLY');
    expect(invoiceText).toContain('SRV/2026-27/0001');
    expect(invoiceText).toContain('GSTIN: 29ACKFA4620Q1ZV');
  });
});
