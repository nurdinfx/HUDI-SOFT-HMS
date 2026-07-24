const db = require('./database');

async function check() {
  try {
    const i = await db.prepare("SELECT * FROM invoices WHERE invoice_id = 'INV-POS-00021'").get();
    
    if (i) {
        console.log('Invoice Data:', JSON.stringify(i, null, 2));
        const total = parseFloat(i.subtotal) + parseFloat(i.tax) - parseFloat(i.discount);
        console.log('Calculated Total (sub+tax-disc):', total);
        console.log('Stored Total field:', i.total);
        console.log('Paid Amount:', i.paid_amount);
        console.log('Condition (Paid >= Calculated Total):', parseFloat(i.paid_amount) >= total);
        console.log('Condition (Paid >= Stored Total):', parseFloat(i.paid_amount) >= parseFloat(i.total));
        console.log('Status:', i.status);
    } else {
        console.log('Invoice INV-POS-00021 not found');
    }

    const summary = await db.prepare("SELECT SUM(total) as billed, SUM(paid_amount) as collected FROM invoices").get();
    console.log('Billing Summary:', summary);

  } catch (err) {
    console.error(err);
  }
}
check();
