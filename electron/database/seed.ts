import Database from 'better-sqlite3';

export function seedData(db: Database.Database): void {
  // Only seed if tables are empty
  const hsnCount = db.prepare('SELECT COUNT(*) as count FROM hsn_master').get() as { count: number };
  if (hsnCount.count > 0) return;

  console.log('[Seed] Inserting default data...');

  const insertHsn = db.prepare('INSERT OR IGNORE INTO hsn_master (code, description, default_gst_rate) VALUES (?, ?, ?)');
  const insertSac = db.prepare('INSERT OR IGNORE INTO sac_master (code, description, default_gst_rate) VALUES (?, ?, ?)');
  const insertTax = db.prepare('INSERT OR IGNORE INTO tax_rates (name, rate, hsn_code, sac_code, category) VALUES (?, ?, ?, ?, ?)');
  const insertSetting = db.prepare('INSERT OR IGNORE INTO app_settings (key, value, category, description) VALUES (?, ?, ?, ?)');

  const seedTransaction = db.transaction(() => {
    // HSN Codes for Gold/Jewellery
    insertHsn.run('7113', 'Articles of jewellery and parts thereof', 3);
    insertHsn.run('71131100', 'Silver jewellery', 3);
    insertHsn.run('71131910', 'Gold jewellery - studded with precious stones', 3);
    insertHsn.run('71131920', 'Gold jewellery - unstudded', 3);
    insertHsn.run('71131990', 'Gold jewellery - other', 3);
    insertHsn.run('7108', 'Gold (including gold plated with platinum) unwrought or in semi-manufactured forms, or in powder form', 3);
    insertHsn.run('71081200', 'Gold - other unwrought forms', 3);
    insertHsn.run('71081300', 'Gold - other semi-manufactured forms', 3);
    insertHsn.run('7114', 'Articles of goldsmiths or silversmiths wares', 3);
    insertHsn.run('7118', 'Coin', 3);

    // SAC Codes for Services
    insertSac.run('9988', 'Manufacturing services on physical inputs', 5);
    insertSac.run('998891', 'Jewellery manufacturing services', 5);
    insertSac.run('9954', 'Construction services', 18);
    insertSac.run('9971', 'Financial and related services', 18);
    insertSac.run('9972', 'Real estate services', 18);
    insertSac.run('9982', 'Legal and accounting services', 18);
    insertSac.run('9983', 'Other professional services', 18);
    insertSac.run('9985', 'Support services', 18);
    insertSac.run('9987', 'Maintenance and repair services', 18);
    insertSac.run('9991', 'Public administration services', 18);
    insertSac.run('9995', 'Services of membership organizations', 18);
    insertSac.run('9997', 'Other services', 18);

    // Default Tax Rates
    insertTax.run('GST 3% - Gold/Jewellery', 3, '7113', null, 'goods');
    insertTax.run('GST 5%', 5, null, null, 'goods');
    insertTax.run('GST 12%', 12, null, null, 'goods');
    insertTax.run('GST 18%', 18, null, null, 'services');
    insertTax.run('GST 28%', 28, null, null, 'goods');
    insertTax.run('GST 0.25%', 0.25, null, null, 'goods');
    insertTax.run('GST 0% - Exempt', 0, null, null, 'goods');
    insertTax.run('GST 5% - Services', 5, null, '9988', 'services');

    // Default App Settings
    insertSetting.run('sales_prefix', 'AGC/S', 'billing', 'Sales invoice prefix');
    insertSetting.run('purchase_prefix', 'AGC/P', 'billing', 'Dealer purchase prefix');
    insertSetting.run('service_prefix', 'AGC/SV', 'billing', 'Service invoice prefix');
    insertSetting.run('customer_prefix', 'AGC-CUS', 'billing', 'Customer reference prefix');
    insertSetting.run('supplier_prefix', 'AGC-SUP', 'billing', 'Supplier reference prefix');
    insertSetting.run('company_state', 'Karnataka', 'gst', 'Company state for GST');
    insertSetting.run('company_state_code', '29', 'gst', 'Company state code');
    insertSetting.run('session_timeout', '480', 'security', 'Session timeout in minutes');
    insertSetting.run('auto_backup', 'true', 'backup', 'Enable automatic backup');
    insertSetting.run('backup_interval', '24', 'backup', 'Backup interval in hours');
    insertSetting.run('draft_consumes_number', 'false', 'billing', 'Whether drafts consume permanent invoice numbers');
    insertSetting.run('show_customer_signature', 'false', 'invoice', 'Show customer acknowledgement on invoice');
    insertSetting.run('show_bank_details', 'true', 'invoice', 'Show bank details on invoice');
    insertSetting.run('show_signature', 'true', 'invoice', 'Show authorized signature on invoice');

    // Default Terms & Conditions for Sales
    insertSetting.run('terms_sales', `TERMS & CONDITIONS

1. Customers are requested to verify the description, quantity, weight and invoice details at the time of purchase.

2. Goods sold are not eligible for return or refund, except where required by applicable law or where a confirmed manufacturing defect is covered by the seller's applicable policy.

3. Exchange requests, where permitted under the company's policy, must be made within the specified period with the original invoice and subject to applicable conditions.

4. Special offers and discounted items may be subject to separate exchange conditions, which will be communicated at the time of purchase.

5. Payments made by cheque are subject to successful realization.

6. Any applicable charges or deductions on exchanges or returns will be communicated before processing.

7. All disputes shall be subject to the jurisdiction of the competent courts at Bengaluru, Karnataka, subject to applicable law.`, 'invoice', 'Sales invoice terms and conditions');

    insertSetting.run('terms_service', `TERMS & CONDITIONS

1. Service charges are as agreed and mentioned in this invoice.

2. Any additional work beyond the agreed scope will be charged separately after prior communication.

3. Payment is due upon completion of service unless otherwise agreed.

4. All disputes shall be subject to the jurisdiction of the competent courts at Bengaluru, Karnataka, subject to applicable law.`, 'invoice', 'Service invoice terms and conditions');

    insertSetting.run('terms_purchase', 'INTERNAL PURCHASE RECORD - NOT A TAX INVOICE', 'invoice', 'Purchase record disclaimer');
  });

  seedTransaction();
  console.log('[Seed] Default data inserted');
}
