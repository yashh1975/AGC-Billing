# AGC Billing & Management System — User Guide
### Anjaneya Gold Company (AGC) — Windows Desktop Application

Welcome to the **AGC Billing & Management System**. This guide provides practical, step-by-step instructions for operating the application for your daily business needs.

---

## Table of Contents

1. [Initial First-Launch Setup](#1-initial-first-launch-setup)
2. [Login & Security](#2-login--security)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Module 1: Dealer Purchase Bill Recording](#4-module-1-dealer-purchase-bill-recording)
5. [Module 2: Sales Billing (Strictly No Gold Purity)](#5-module-2-sales-billing-strictly-no-gold-purity)
6. [Module 3: Service Billing](#6-module-3-service-billing)
7. [Customer & Supplier Directory](#7-customer--supplier-directory)
8. [All Bills Master Transaction Browser](#8-all-bills-master-transaction-browser)
9. [GST Reports & CA Filing Preparation](#9-gst-reports--ca-filing-preparation)
10. [PDF Document Vault & Windows Explorer](#10-pdf-document-vault--windows-explorer)
11. [WhatsApp Desktop Sharing](#11-whatsapp-desktop-sharing)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)

---

## 1. Initial First-Launch Setup

When the application is launched for the first time, the **Setup Wizard** appears automatically:

1. **Step 1: Business Profile**:
   - Enter legal name: *Anjaneya Gold Company*.
   - Enter the valid 15-character GSTIN.
   - Enter registered address, city, state (*Karnataka*), and pincode.
   - Enter primary phone number and email.
2. **Step 2: Bank Account Details**:
   - Enter bank name, account name, account number, IFSC code, and branch.
   - These details will print cleanly on customer sales and service invoices for direct NEFT/RTGS payments.
3. **Step 3: Initial Administrator Account**:
   - Create the master administrator login (username and secure password).
4. **Step 4: Initial Financial Year**:
   - Select or configure the active financial year (e.g., `2026-27`: 1 April 2026 to 31 March 2027).

---

## 2. Login & Security

- Enter your administrator or staff credentials.
- All passwords are encrypted locally using industrial-standard `bcrypt` hashing.
- To change your password or update users, visit **Settings > Business Profile / Security**.

---

## 3. Dashboard Overview

The **Dashboard** summarizes real-time financials:
- **Today's Summary**: Today's Sales, Today's Dealer Purchases, Today's Services.
- **Monthly Performance**: Billed revenue for the active calendar month.
- **Outstanding Collection**: Total pending dues across all customers.
- **Recent Transactions**: Quick links to view, print, or share the latest bills.
- **Quick Action Bar**: 1-click buttons to create a Sales Bill, record a Dealer Purchase, or create a Service Invoice.

---

## 4. Module 1: Dealer Purchase Bill Recording

**Purpose**: Record original tax invoices issued by bullion dealers and suppliers.

> [!IMPORTANT]
> The generated AGC internal document states: **`"INTERNAL PURCHASE RECORD – NOT A TAX INVOICE"`**. It does not pretend to be the dealer's tax invoice.

### Step-by-Step Recording:
1. Navigate to **Dealer Purchase** from the sidebar.
2. **Select or Add Supplier**:
   - Search by supplier name, mobile, or GSTIN.
   - If new, simply type the supplier details; the system registers them automatically with reference format `AGC-SUP-XXXX`.
3. **Enter Dealer Invoice Details**:
   - **Original Supplier Invoice Number** (e.g., `INV/2026/894`).
   - **Original Supplier Invoice Date**.
   - **Upload Dealer Invoice Scan/PDF**: Attaches the original file into `AGC_Billing/Attachments/Supplier_Invoices/[FY]/`.
4. **Add Items**:
   - Description, HSN Code (`7113`), Quantity, Gross Weight (g), Net Weight (g).
   - Taxable value, GST rate (e.g., 3%), CGST, SGST, IGST.
5. **Record Payment**:
   - Payment Mode (Bank Transfer, NEFT/RTGS, Cheque, Cash).
   - Amount paid and payment date. Supports partial payments.
6. Click **Save Purchase Record**.
7. Preview, print internal summary, or view saved PDF anytime.

---

## 5. Module 2: Sales Billing (Strictly No Gold Purity)

**Purpose**: Issue professional GST retail sales invoices to customers.

> [!CAUTION]
> **COMPANY POLICY RULE**: Gold purity is strictly excluded from all forms, invoices, and exports. Do not input purity.

### Creating a Sales Invoice:
1. Navigate to **Sales Billing** from the sidebar.
2. **Customer Details**:
   - Search existing customer by name, mobile, or reference (`AGC-CUS-XXXX`).
   - For walk-ins, directly enter the customer's name, mobile number, and address.
3. **Place of Supply & Supply Type**:
   - Defaults to *Karnataka (Intra-state: 1.5% CGST + 1.5% SGST)*.
   - For other states, system automatically switches to *Inter-state: 3% IGST*.
4. **Add Jewellery Items**:
   - Product description (e.g., *Gold Necklace*, *Gold Bangle*, *Gold Ring*).
   - HSN Code (`7113`).
   - Quantity, Gross Weight (grams, 3 decimals), Net Weight (grams, 3 decimals).
   - Rate per gram / piece.
   - Making charges and other charges.
   - Discount (if applicable).
   - Real-time GST calculations update automatically with integer paise accuracy.
5. **Payment Settlement**:
   - Choose payment mode: Cash, UPI, Bank Transfer, Card, or Cheque.
   - Enter Amount Received. Outstanding balance updates automatically.
6. **Actions**:
   - **Save Draft**: Saves work-in-progress invoice.
   - **Finalize Invoice**: Locks the bill and generates a permanent document number (e.g., `AGC/S/26-27/0001`).
   - **Save PDF**: Saves official A4 PDF directly into `AGC_Billing/Documents/[FY]/Sales/[Month]/`.
   - **Print A4**: Sends vector A4 layout to your connected printer.
   - **Share via WhatsApp**: Generates pre-formatted WhatsApp customer message.

---

## 6. Module 3: Service Billing

**Purpose**: Issue invoices for jewellery services (making charges, repairs, laser soldering, polishing).

1. Navigate to **Service Billing**.
2. Select or enter customer details.
3. Add service line items with **SAC Code `9988`** and applicable 5% GST rate (2.5% CGST + 2.5% SGST).
4. Settle payment and click **Finalize Invoice**.
5. Independent numbering format: `AGC/SV/26-27/0001`.

---

## 7. Customer & Supplier Directory

- **Customers (`/customers`)**: View all customer profiles, total transaction volume, outstanding balances, and historical bills.
- **Suppliers (`/suppliers`)**: View all dealers, total purchases recorded, and linked invoice documents.
- Automatic duplicate detection prevents accidental double registrations while warning the user.

---

## 8. All Bills Master Transaction Browser

Navigate to **All Bills (`/all-bills`)**:
- Browse all Sales, Dealer Purchases, and Service Invoices in one table.
- Filter by:
  - Module Category (All, Sales, Purchases, Services)
  - Financial Year
  - Payment Status (Paid, Partial, Unpaid)
  - Document Status (Finalized, Draft, Cancelled)
  - Date Range
- Direct actions: View / Print, Open PDF, WhatsApp Share.

---

## 9. GST Reports & CA Filing Preparation

Navigate to **GST Reports (`/gst-reports`)**:
- Formulated specifically for your Chartered Accountant's monthly and quarterly reconciliation.
- Select period: Full FY, Q1, Q2, Q3, Q4, Specific Month, or Custom Date Range.
- **Export Complete Master Report (.xlsx)**:
  - Generates a styled, formula-calculated Excel workbook containing:
    1. *Sales Register* (Line items, weights, GST breakdown — NO PURITY)
    2. *Dealer Purchase Register* (Original bill references & ITC amounts)
    3. *Service Register* (SAC 9988 jobwork invoices)
    4. *GST Tax Summary* (Outward vs. Inward ITC comparison & net liability)
    5. *HSN/SAC Summary* (Tariff-wise aggregated values)
- Workbooks are saved to: `AGC_Billing/GST_Reports/[FinancialYear]/`.

---

## 10. PDF Document Vault & Windows Explorer

- All PDFs are stored locally in the **`AGC_Billing`** folder inside your Windows Documents library:
  ```
  AGC_Billing/
  ├── Documents/
  │   └── 2026-27/
  │       ├── Sales/
  │       │   └── November/
  │       ├── Dealer_Purchase/
  │       │   └── November/
  │       └── Service/
  │           └── November/
  ├── Attachments/
  │   └── Supplier_Invoices/
  │       └── 2026-27/
  ├── GST_Reports/
  │   └── 2026-27/
  ├── Backups/
  └── Exports/
  ```
- Browse files within the app via **PDF Documents (`/documents`)** with 1-click **Open PDF** and **Reveal in Windows Explorer**.

---

## 11. WhatsApp Desktop Sharing

When viewing any invoice:
1. Click the **WhatsApp Share** button.
2. The system formats a personalized greeting with the customer name, invoice number, date, amount, and balance due.
3. Automatically launches WhatsApp Desktop or Web via `wa.me` deep link.
4. Simply attach the organized PDF from your local vault and send.

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` | Universal Global Search (invoices, customers, suppliers) |
| `Escape` | Close dialog / modal |
| `Enter` | Submit search or confirm action |
