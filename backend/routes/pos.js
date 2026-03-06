const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/pos/checkout
// Payload: { patientId, patientName, items: [{type, id, name, unitPrice, quantity}], discount, paymentMethod, amountPaid, notes }
router.post('/checkout', async (req, res) => {
    console.log('📦 POS Checkout Request:', {
        patient: req.body.patientName,
        itemsCount: req.body.items?.length,
        total: req.body.amountPaid
    });
    const { patientId, patientName, items, discount, paymentMethod, amountPaid, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    try {
        // 1. Calculate totals
        let subtotal = 0;
        for (const item of items) {
            subtotal += (item.unitPrice * item.quantity);
        }

        const settings = await db.prepare('SELECT tax_rate FROM hospital_settings WHERE id = 1').get();
        const taxRate = settings ? settings.tax_rate : 10;
        const disc = parseFloat(discount) || 0;
        const tax = subtotal * (taxRate / 100);
        const total = Math.max(0, subtotal + tax - disc);
        const paidAmount = (amountPaid !== undefined && amountPaid !== null && !isNaN(parseFloat(amountPaid)))
            ? parseFloat(amountPaid)
            : total;

        // 2. Resolve Patient Information (Walk-ins allow null patientId)
        let actualPatientId = patientId || null;
        let actualPatientName = patientName || 'Walk-In Patient';

        if (actualPatientId) {
            const p = await db.prepare('SELECT first_name, last_name FROM patients WHERE id = ?').get(actualPatientId);
            if (p) actualPatientName = `${p.first_name} ${p.last_name}`;
        }

        const invoiceItems = [];
        const today = new Date().toISOString().split('T')[0];

        // Prepare Invoice Record
        const invCountData = await db.prepare('SELECT COUNT(*) as c FROM invoices').get();
        const invoiceUID = `INV-${String(parseInt(invCountData.c) + 1).padStart(4, '0')}`;
        const invoiceDbId = uuidv4();

        // 3. Process each item (Atomically reduce stock or trigger service logic)
        for (const item of items) {
            if (item.type === 'medicine') {
                // Check stock
                const med = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(item.id);
                if (!med) throw new Error(`Medicine "${item.name}" not found in database`);
                if (med.quantity < item.quantity) throw new Error(`Insufficient stock for ${item.name}. Available: ${med.quantity}`);

                const newQty = med.quantity - item.quantity;
                const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= med.reorder_level ? 'low-stock' : 'in-stock';

                await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?')
                    .run(newQty, newStatus, item.id);

                invoiceItems.push({
                    id: item.id,
                    description: item.name,
                    category: 'Pharmacy',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.unitPrice * item.quantity
                });
            } else if (item.type === 'lab') {
                // Generate Lab Order
                const labCountData = await db.prepare('SELECT COUNT(*) as c FROM lab_tests').get();
                const testIdStr = `LAB-${String(parseInt(labCountData.c) + 1).padStart(4, '0')}`;
                const labTestDbId = uuidv4();

                const catInfo = await db.prepare('SELECT * FROM lab_catalog WHERE id = ?').get(item.id);

                await db.prepare(`INSERT INTO lab_tests (id, test_id, patient_id, patient_name, doctor_name, test_name, test_category, sample_type, priority, status, ordered_at, cost, is_billed, invoice_id, ordered_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(
                        labTestDbId,
                        testIdStr,
                        actualPatientId,
                        actualPatientName,
                        'POS Walk-in',
                        item.name,
                        catInfo ? catInfo.category : 'General',
                        catInfo ? catInfo.sample_type : 'Blood',
                        'normal',
                        'ordered',
                        new Date().toISOString(),
                        item.unitPrice * item.quantity,
                        1,
                        invoiceDbId,
                        req.user.name
                    );

                invoiceItems.push({
                    id: item.id,
                    description: `Lab Test: ${item.name}`,
                    category: 'Laboratory',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.unitPrice * item.quantity
                });
            } else {
                // General Services or unknown types
                invoiceItems.push({
                    id: item.id || uuidv4(),
                    description: item.name,
                    category: item.category || 'Service',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.unitPrice * item.quantity
                });
            }
        }

        // 4. Create master Invoice
        let invoiceStatus = 'unpaid';
        if (paidAmount >= total) invoiceStatus = 'paid';
        else if (paidAmount > 0) invoiceStatus = 'partial';

        await db.prepare(`INSERT INTO invoices (id, invoice_id, patient_id, patient_name, date, due_date, items, subtotal, tax, discount, total, paid_amount, status, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(invoiceDbId, invoiceUID, actualPatientId, actualPatientName, today, today, JSON.stringify(invoiceItems), subtotal, tax, disc, total, paidAmount, invoiceStatus, paymentMethod || 'cash', notes || 'POS Transaction');

        // 5. Inject account entry for payment
        if (paidAmount > 0) {
            const entryId = uuidv4();
            await db.prepare(`
                INSERT INTO account_entries (id, date, type, category, description, amount, payment_method, reference_id, department, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                entryId,
                today,
                'income',
                'POS Checkout',
                `POS Payment for Invoice ${invoiceUID} (${actualPatientName})`,
                paidAmount,
                paymentMethod || 'cash',
                invoiceUID,
                'Billing',
                'completed',
                req.user.id
            );
        }

        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'POS', `POS Checkout completed: Invoice ${invoiceUID}`, req.ip);

        const savedInvoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceDbId);

        res.status(201).json({
            id: savedInvoice.id,
            invoiceId: savedInvoice.invoice_id,
            patientId: savedInvoice.patient_id,
            patientName: savedInvoice.patient_name,
            date: savedInvoice.date,
            items: JSON.parse(savedInvoice.items || '[]'),
            subtotal: savedInvoice.subtotal,
            tax: savedInvoice.tax,
            discount: savedInvoice.discount,
            total: savedInvoice.total,
            paidAmount: savedInvoice.paid_amount,
            status: savedInvoice.status,
            paymentMethod: savedInvoice.payment_method
        });

    } catch (err) {
        console.error('POS Checkout Error:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error during checkout' });
    }
});

module.exports = router;
