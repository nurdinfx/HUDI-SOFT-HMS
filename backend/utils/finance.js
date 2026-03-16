const { v4: uuidv4 } = require('uuid');
const db = require('../database');

/**
 * Split a payment amount proportionally among invoice items and create account entries.
 * @param {Object} params
 * @param {string} params.invoiceId - The invoice ID (HUDI-XXXX)
 * @param {string} params.dbInvoiceId - The database UUID of the invoice
 * @param {string} params.patientName - Patient name for description
 * @param {number} params.paymentAmount - The actual amount paid in this transaction
 * @param {string} params.paymentMethod - cash, zaad, etc.
 * @param {string} params.userId - The user recording the payment
 * @param {string} params.defaultDept - Fallback department if item has none
 */
async function recordGranularPayment({
    invoiceId,
    dbInvoiceId,
    patientName,
    paymentAmount,
    paymentMethod,
    userId,
    defaultDept = 'Billing'
}) {
    if (paymentAmount <= 0) return;

    // Get invoice items
    const row = await db.prepare('SELECT items, subtotal, total FROM invoices WHERE id = ?').get(dbInvoiceId);
    if (!row) return;

    const items = JSON.parse(row.items || '[]');
    const subtotal = parseFloat(row.subtotal) || 1; // avoid div by zero
    const total = parseFloat(row.total) || 1;

    // We split the payment based on the item's contribution to the subtotal
    // If there's a discount, it's applied proportionally.
    const today = new Date().toISOString().split('T')[0];

    for (const item of items) {
        const itemTotal = parseFloat(item.total) || (parseFloat(item.unitPrice) * parseFloat(item.quantity)) || 0;
        if (itemTotal <= 0) continue;

        // Proportional share of the payment
        // (Item Total / Subtotal) * Payment Amount
        // This handles both partial payments and discounts (if subtotal != total)
        // Actually, we should use total if we want to include tax/discount in the proportions
        const share = (itemTotal / subtotal) * paymentAmount;

        await db.prepare(`
            INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            uuidv4(),
            today,
            'income',
            item.category || 'Service',
            `Payment for ${item.description} (Inv: ${invoiceId}, Patient: ${patientName})`,
            Math.round(share * 100) / 100,
            paymentMethod,
            invoiceId,
            item.department || defaultDept,
            'completed',
            userId
        );
    }
}

/**
 * Record a simple account entry for daily operations or other single-category transactions.
 */
async function recordSimpleEntry({
    date,
    type = 'income',
    category,
    description,
    amount,
    paymentMethod = 'cash',
    referenceId,
    department,
    userId,
    userName
}) {
    if (amount === 0) return;

    await db.prepare(`
        INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(),
        date || new Date().toISOString().split('T')[0],
        type,
        category,
        description,
        Math.abs(amount),
        paymentMethod,
        referenceId,
        department,
        'completed',
        userId
    );
}

module.exports = {
    recordGranularPayment,
    recordSimpleEntry
};
