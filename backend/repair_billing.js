const db = require('./database');

async function repair() {
  try {
    console.log('🔍 Starting database repair for Billing data...');
    const invoices = await db.prepare("SELECT * FROM invoices").all();
    let fixedCount = 0;

    for (const inv of invoices) {
      const subtotal = parseFloat(inv.subtotal) || 0;
      const tax = parseFloat(inv.tax) || 0;
      const discount = parseFloat(inv.discount) || 0;
      const paidAmount = parseFloat(inv.paid_amount) || 0;
      
      const correctTotal = Math.round((subtotal + tax - discount) * 100) / 100;
      const storedTotal = parseFloat(inv.total) || 0;

      // Detection: If stored total is exactly the concatenation of subtotal and tax (minus discount)
      // or if it's just plain wrong and much larger than subtotal + tax.
      if (Math.abs(storedTotal - correctTotal) > 1.0) {
        console.log(`🛠️ Fixing Invoice ${inv.invoice_id}: Stored Total $${storedTotal} -> Correct Total $${correctTotal}`);
        
        let newStatus = 'unpaid';
        if (paidAmount >= correctTotal - 0.01) newStatus = 'paid';
        else if (paidAmount > 0) newStatus = 'partial';

        // Also fix the case where paid_amount was concatenated and is higher than total
        let correctedPaid = paidAmount;
        if (paidAmount > correctTotal && Math.abs(paidAmount - correctTotal) > 1000) {
             // If paidAmount is huge but actually should have been equal to something smaller
             // This is harder to guess, but often if paidAmount > correctTotal, it should just be correctTotal
             correctedPaid = correctTotal;
             console.log(`   └─ Fixing Paid Amount: $${paidAmount} -> $${correctTotal}`);
             if (newStatus !== 'paid') newStatus = 'paid';
        }

        await db.prepare("UPDATE invoices SET total = ?, paid_amount = ?, status = ? WHERE id = ?")
          .run(correctTotal, correctedPaid, newStatus, inv.id);
        
        fixedCount++;
      }
    }

    console.log(`✅ Repair complete. Fixed ${fixedCount} invoices.`);
  } catch (err) {
    console.error('❌ Repair failed:', err);
  }
}

repair();
