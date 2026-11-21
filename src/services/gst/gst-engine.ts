/**
 * AGC GST Calculation Engine
 *
 * Implements precise financial calculation in integer paise (1 Rupee = 100 paise)
 * Supports:
 * - Intra-state (CGST + SGST) vs Inter-state (IGST) determination
 * - Tax-exclusive item pricing (Rate * Qty + Making + Other - Discount = Taxable -> Add GST)
 * - Tax-inclusive item pricing (Extract Taxable = Gross / (1 + Rate))
 * - Exact paise rounding
 * - Gold Jewellery standard rate (3% -> 1.5% CGST + 1.5% SGST or 3% IGST)
 * - Service rate standard (5% / 18%)
 */

export interface LineItemInput {
  description: string;
  category?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  grossWeight?: number;
  netWeight?: number;
  rate: number; // in Rupees (Rate per gram for goods, or Service Fee for services)
  principalAmount?: number; // in Rupees (Financial Services loan takeover principal amount)
  serviceAmount?: number; // in Rupees (Financial Services facilitation fee)
  makingCharges?: number; // in Rupees
  otherCharges?: number; // in Rupees
  discount?: number; // in Rupees
  gstRate: number; // percentage, e.g. 3 for 3%, 18 for 18%
  isTaxInclusive?: boolean;
}

export interface LineItemCalculation {
  description: string;
  category?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  grossWeight?: number;
  netWeight?: number;
  ratePaise: number;
  principalAmountPaise?: number;
  serviceAmountPaise?: number;
  makingChargesPaise: number;
  otherChargesPaise: number;
  discountPaise: number;
  taxableValuePaise: number;
  gstRate: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  totalValuePaise: number;
}

export interface InvoiceCalculationSummary {
  supplyType: 'intra' | 'inter';
  subtotalPaise: number;
  totalDiscountPaise: number;
  totalMakingChargesPaise: number;
  totalOtherChargesPaise: number;
  taxableAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  totalGstAmountPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  amountReceivedPaise: number;
  balanceDuePaise: number;
  items: LineItemCalculation[];
}

/**
 * Convert Rupees (float or string) to exact integer paise.
 */
export function toPaise(rupees: number | string | undefined | null): number {
  if (rupees === undefined || rupees === null || rupees === '') return 0;
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert integer paise to Rupees with 2 decimal places.
 */
export function toRupees(paise: number | undefined | null): number {
  if (!paise) return 0;
  return paise / 100;
}

/**
 * Format paise into Indian Rupee format (e.g. ₹14,750.00).
 */
export function formatRupees(paise: number | undefined | null): string {
  const rupees = toRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Determine supply type based on company state code/name and place of supply.
 */
export function determineSupplyType(
  companyState: string = 'Karnataka',
  placeOfSupply: string = 'Karnataka'
): 'intra' | 'inter' {
  if (!placeOfSupply || !companyState) return 'intra';
  const cleanCompany = companyState.trim().toLowerCase();
  const cleanPos = placeOfSupply.trim().toLowerCase();
  return cleanCompany === cleanPos ? 'intra' : 'inter';
}

/**
 * Calculate line item GST breakdown.
 */
export function calculateLineItem(
  item: LineItemInput,
  supplyType: 'intra' | 'inter',
  docType?: 'sales' | 'purchase' | 'service'
): LineItemCalculation {
  const quantity = Math.max(item.quantity || 1, 1);
  const ratePaise = toPaise(item.rate);
  const principalAmountPaise = toPaise(item.principalAmount);
  const serviceAmountPaise = item.serviceAmount !== undefined && item.serviceAmount !== null
    ? toPaise(item.serviceAmount)
    : (item.sacCode === '9971' || item.category === 'Financial Service' ? ratePaise : 0);
  const makingChargesPaise = toPaise(item.makingCharges);
  const otherChargesPaise = toPaise(item.otherCharges);
  const discountPaise = toPaise(item.discount);
  const gstRate = item.gstRate || 0;

  // Calculate Base Gross Amount in Paise:
  // 1. If financial service: base amount is strictly the service facilitation charge (principal is never taxed)
  // 2. If weight is present (both sales jewellery & dealer bullion purchases): weight in grams * rate per gram
  // 3. Otherwise: rate * quantity
  let baseAmountPaise = 0;
  const isFinancialService = docType === 'service' || item.sacCode === '9971' || item.category === 'Financial Service' || (item.serviceAmount !== undefined && item.serviceAmount > 0);
  const weight = (item.netWeight && item.netWeight > 0)
    ? item.netWeight
    : ((item.grossWeight && item.grossWeight > 0) ? item.grossWeight : 0);

  if (isFinancialService) {
    baseAmountPaise = serviceAmountPaise > 0 ? serviceAmountPaise : ratePaise;
  } else if (weight > 0) {
    // Both Gold Sales jewellery & Dealer Purchase bullion with weight: weight (grams) * rate per gram
    baseAmountPaise = Math.round(weight * ratePaise);
  } else {
    baseAmountPaise = ratePaise * quantity;
  }

  let taxableValuePaise = 0;
  let totalValuePaise = 0;
  let cgstAmountPaise = 0;
  let sgstAmountPaise = 0;
  let igstAmountPaise = 0;

  if (item.isTaxInclusive) {
    // Gross includes taxes: Gross = Taxable * (1 + GST)
    const grossAmountPaise =
      baseAmountPaise + makingChargesPaise + otherChargesPaise - discountPaise;
    taxableValuePaise = Math.round((grossAmountPaise * 100) / (100 + gstRate));
    const totalTaxPaise = grossAmountPaise - taxableValuePaise;

    if (supplyType === 'intra') {
      cgstAmountPaise = Math.round(totalTaxPaise / 2);
      sgstAmountPaise = totalTaxPaise - cgstAmountPaise;
      igstAmountPaise = 0;
    } else {
      cgstAmountPaise = 0;
      sgstAmountPaise = 0;
      igstAmountPaise = totalTaxPaise;
    }
    totalValuePaise = grossAmountPaise;
  } else {
    // Tax exclusive: Taxable = Base + Making + Other - Discount
    taxableValuePaise = Math.max(
      0,
      baseAmountPaise + makingChargesPaise + otherChargesPaise - discountPaise
    );

    if (supplyType === 'intra') {
      // Half to CGST, half to SGST
      const halfRate = gstRate / 2;
      cgstAmountPaise = Math.round((taxableValuePaise * halfRate) / 100);
      sgstAmountPaise = Math.round((taxableValuePaise * halfRate) / 100);
      igstAmountPaise = 0;
    } else {
      // Full to IGST
      cgstAmountPaise = 0;
      sgstAmountPaise = 0;
      igstAmountPaise = Math.round((taxableValuePaise * gstRate) / 100);
    }
    totalValuePaise =
      taxableValuePaise + cgstAmountPaise + sgstAmountPaise + igstAmountPaise;
  }

  return {
    description: item.description,
    category: item.category,
    hsnCode: item.hsnCode,
    sacCode: item.sacCode,
    quantity,
    grossWeight: item.grossWeight,
    netWeight: item.netWeight,
    ratePaise,
    principalAmountPaise,
    serviceAmountPaise,
    makingChargesPaise,
    otherChargesPaise,
    discountPaise,
    taxableValuePaise,
    gstRate,
    cgstAmountPaise,
    sgstAmountPaise,
    igstAmountPaise,
    totalValuePaise,
  };
}

/**
 * Calculate full invoice totals, GST aggregation, rounding, and balances.
 */
export function calculateInvoice(
  items: LineItemInput[],
  companyState: string = 'Karnataka',
  placeOfSupply: string = 'Karnataka',
  amountReceivedRupees: number = 0,
  docType?: 'sales' | 'purchase' | 'service'
): InvoiceCalculationSummary {
  const supplyType = determineSupplyType(companyState, placeOfSupply);

  let subtotalPaise = 0;
  let totalDiscountPaise = 0;
  let totalMakingChargesPaise = 0;
  let totalOtherChargesPaise = 0;
  let taxableAmountPaise = 0;
  let cgstAmountPaise = 0;
  let sgstAmountPaise = 0;
  let igstAmountPaise = 0;

  const calculatedItems = items.map((item) => {
    const calc = calculateLineItem(item, supplyType, docType);

    subtotalPaise += calc.ratePaise * calc.quantity;
    totalDiscountPaise += calc.discountPaise;
    totalMakingChargesPaise += calc.makingChargesPaise;
    totalOtherChargesPaise += calc.otherChargesPaise;
    taxableAmountPaise += calc.taxableValuePaise;
    cgstAmountPaise += calc.cgstAmountPaise;
    sgstAmountPaise += calc.sgstAmountPaise;
    igstAmountPaise += calc.igstAmountPaise;

    return calc;
  });

  const totalGstAmountPaise = cgstAmountPaise + sgstAmountPaise + igstAmountPaise;
  const rawGrandTotalPaise = taxableAmountPaise + totalGstAmountPaise;

  // Round-off to nearest whole Rupee (100 paise)
  const roundedGrandTotalPaise = Math.round(rawGrandTotalPaise / 100) * 100;
  const roundOffPaise = roundedGrandTotalPaise - rawGrandTotalPaise;

  const amountReceivedPaise = toPaise(amountReceivedRupees);
  const balanceDuePaise = Math.max(0, roundedGrandTotalPaise - amountReceivedPaise);

  return {
    supplyType,
    subtotalPaise,
    totalDiscountPaise,
    totalMakingChargesPaise,
    totalOtherChargesPaise,
    taxableAmountPaise,
    cgstAmountPaise,
    sgstAmountPaise,
    igstAmountPaise,
    totalGstAmountPaise,
    roundOffPaise,
    grandTotalPaise: roundedGrandTotalPaise,
    amountReceivedPaise,
    balanceDuePaise,
    items: calculatedItems,
  };
}

/**
 * Number to Indian Words Converter (e.g. 14750 -> Fourteen Thousand Seven Hundred And Fifty Rupees Only)
 */
export function numberToWordsIndian(amountInRupees: number): string {
  const rounded = Math.floor(amountInRupees);
  if (rounded === 0) return 'Zero Rupees Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n];
    const unitDigit = n % 10;
    return tens[Math.floor(n / 10)] + (unitDigit > 0 ? ' ' + units[unitDigit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let str = '';
    if (hundred > 0) {
      str += units[hundred] + ' Hundred';
      if (remainder > 0) str += ' and ';
    }
    if (remainder > 0) {
      str += convertTwoDigits(remainder);
    }
    return str;
  }

  const crore = Math.floor(rounded / 10000000);
  let rem = rounded % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand');
  if (rem > 0) parts.push(convertThreeDigits(rem));

  return parts.join(' ') + ' Rupees Only';
}
