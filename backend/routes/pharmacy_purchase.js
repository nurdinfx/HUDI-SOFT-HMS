const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, logAction } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── Suppliers ───────────────────────────────────────────────────
router.get('/suppliers', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM pharmacy_suppliers ORDER BY name').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/suppliers', async (req, res) => {
    const { name, contact_person, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    try {
        const id = uuidv4();
        await db.prepare('INSERT INTO pharmacy_suppliers (id, name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, name, contact_person || null, phone || null, email || null, address || null);
        res.status(201).json({ id, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/suppliers/:id', async (req, res) => {
    const { name, contact_person, phone, email, address } = req.body;
    try {
        await db.prepare('UPDATE pharmacy_suppliers SET name=?, contact_person=?, phone=?, email=?, address=? WHERE id=?')
            .run(name, contact_person, phone, email, address, req.params.id);
        res.json({ message: 'Supplier updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Purchase Orders ──────────────────────────────────────────────
router.get('/orders', async (req, res) => {
    const { status, supplier_id } = req.query;
    let q = 'SELECT o.*, s.name as supplier_name FROM pharmacy_purchase_orders o LEFT JOIN pharmacy_suppliers s ON o.supplier_id = s.id WHERE 1=1';
    const params = [];
    if (status) { q += ' AND status = ?'; params.push(status); }
    if (supplier_id) { q += ' AND supplier_id = ?'; params.push(supplier_id); }
    q += ' ORDER BY created_at DESC';
    try {
        const rows = await db.prepare(q).all(...params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/orders/:id', async (req, res) => {
    try {
        const order = await db.prepare('SELECT o.*, s.name as supplier_name FROM pharmacy_purchase_orders o LEFT JOIN pharmacy_suppliers s ON o.supplier_id = s.id WHERE o.id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        const items = await db.prepare('SELECT * FROM pharmacy_purchase_items WHERE po_id = ?').all(req.params.id);
        res.json({ ...order, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/orders', async (req, res) => {
    const { supplier_id, order_date, total_amount, items, notes } = req.body;
    if (!supplier_id || !items || items.length === 0) return res.status(400).json({ error: 'Supplier and items required' });
    
    try {
        await db.exec('BEGIN');
        const poId = uuidv4();
        const maxPoData = await db.prepare('SELECT po_number FROM pharmacy_purchase_orders ORDER BY po_number DESC LIMIT 1').get();
        let nextPoNumber = 1;
        if (maxPoData && maxPoData.po_number) {
            const lastPoNumber = parseInt(maxPoData.po_number.split('-').pop());
            if (!isNaN(lastPoNumber)) nextPoNumber = lastPoNumber + 1;
        }
        const poNumber = `PO-${String(nextPoNumber).padStart(5, '0')}`;

        
        await db.prepare('INSERT INTO pharmacy_purchase_orders (id, po_number, supplier_id, order_date, total_amount, status, notes, created_by, payment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(poId, poNumber, supplier_id, order_date || new Date().toISOString().split('T')[0], total_amount, 'pending', notes || null, req.user.name, req.body.payment_type || 'cash');

        for (const item of items) {
            await db.prepare('INSERT INTO pharmacy_purchase_items (id, po_id, medicine_id, medicine_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), poId, item.medicine_id, item.medicine_name, item.quantity, item.unit_price, item.total_price);
        }

        await db.exec('COMMIT');
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'PharmacyPurchase', `Purchase order created: ${poNumber}`, req.ip);
        res.status(201).json({ id: poId, poNumber });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

/**
 * Update PO Status & Handle Goods Receiving
 * When status changes to 'received', we auto-create batches and update stock.
 */
router.put('/orders/:id/status', async (req, res) => {
    const { status, receiveData } = req.body; // receiveData: array of { itemId, batchNumber, expiryDate }
    try {
        const order = await db.prepare('SELECT * FROM pharmacy_purchase_orders WHERE id = ?').get(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.status === 'received') return res.status(400).json({ error: 'Order already received' });

        await db.exec('BEGIN');
        await db.prepare('UPDATE pharmacy_purchase_orders SET status = ? WHERE id = ?').run(status, req.params.id);

        if (status === 'received' && receiveData) {
            const items = await db.prepare('SELECT * FROM pharmacy_purchase_items WHERE po_id = ?').all(req.params.id);
            for (const item of items) {
                const rInfo = receiveData.find(r => r.medicine_id === item.medicine_id) || {};
                const batchId = uuidv4();
                
                // Create Batch
                await db.prepare(`INSERT INTO pharmacy_batches 
                    (id, medicine_id, batch_number, quantity_received, quantity_remaining, expiry_date, po_id, supplier_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(batchId, item.medicine_id, rInfo.batchNumber || `AUTO-${item.medicine_name}-${Date.now()}`, item.quantity, item.quantity, rInfo.expiryDate || '2030-01-01', order.id, order.supplier_id);

                // Update Medicine Total Stock
                await db.prepare('UPDATE medicines SET quantity = quantity + ?, status = \'in-stock\' WHERE id = ?').run(item.quantity, item.medicine_id);
            }
            
            // Record as Expense if confirmed
            await db.prepare('INSERT INTO account_entries (id, type, category, description, amount, department, reference_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), 'expense', 'Pharmacy Inventory', `Purchase Order Reception: ${order.po_number}`, order.total_amount, 'Pharmacy', order.po_number, req.user.id);
        }

        await db.exec('COMMIT');
        logAction(req.user.id, req.user.name, req.user.role, 'UPDATE', 'PharmacyPurchase', `Purchase order ${order.po_number} status updated to ${status}`, req.ip);
        res.json({ message: 'Status updated' });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// ─── Batches & Expiry ─────────────────────────────────────────────
router.get('/batches', async (req, res) => {
    const { medicine_id, status } = req.query;
    let q = 'SELECT b.*, m.name as medicine_name FROM pharmacy_batches b JOIN medicines m ON b.medicine_id = m.id WHERE b.quantity_remaining > 0';
    const params = [];
    if (medicine_id) { q += ' AND b.medicine_id = ?'; params.push(medicine_id); }
    if (status) { q += ' AND b.status = ?'; params.push(status); }
    q += ' ORDER BY b.expiry_date ASC';
    try {
        const rows = await db.prepare(q).all(...params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Detect and update expiry status (valid, near-expiry, expired)
router.post('/batches/refresh-status', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const nearExpiryDate = new Date();
        nearExpiryDate.setDate(nearExpiryDate.getDate() + 60);
        const nearExpiryStr = nearExpiryDate.toISOString().split('T')[0];

        await db.prepare('UPDATE pharmacy_batches SET status = \'expired\' WHERE expiry_date <= ?').run(today);
        await db.prepare('UPDATE pharmacy_batches SET status = \'near-expiry\' WHERE expiry_date > ? AND expiry_date <= ?').run(today, nearExpiryStr);
        await db.prepare('UPDATE pharmacy_batches SET status = \'valid\' WHERE expiry_date > ?').run(nearExpiryStr);

        res.json({ message: 'Batch statuses refreshed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Returns ──────────────────────────────────────────────────────
const fmtReturn = (r) => ({
    id: r.id,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    medicineId: r.medicine_id,
    batchId: r.batch_id,
    itemName: r.item_name,
    quantity: r.quantity,
    amount: r.amount,
    reason: r.reason,
    returnDate: r.return_date,
    createdAt: r.created_at
});

router.get('/returns', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT r.*, s.name as supplier_name FROM pharmacy_supplier_returns r JOIN pharmacy_suppliers s ON r.supplier_id = s.id ORDER BY r.created_at DESC').all();
        res.json(rows.map(fmtReturn));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/returns', async (req, res) => {
    const { supplier_id, medicine_id, quantity, amount, reason } = req.body;
    if (!supplier_id || !medicine_id || !quantity) return res.status(400).json({ error: 'Required fields missing' });

    try {
        await db.exec('BEGIN');

        // 1. Fetch medicine details
        const med = await db.prepare('SELECT * FROM medicines WHERE id = ?').get(medicine_id);
        if (!med || med.quantity < quantity) {
            throw new Error('Insufficient stock for return');
        }

        const returnId = uuidv4();
        // Insert return record (batch_id is now optional/null initially)
        await db.prepare('INSERT INTO pharmacy_supplier_returns (id, supplier_id, medicine_id, item_name, quantity, amount, reason) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(returnId, supplier_id, medicine_id, med.name, quantity, amount, reason || null);

        // 2. FIFO Batch Deduction
        let remainingToDeduct = quantity;
        const batches = await db.prepare('SELECT * FROM pharmacy_batches WHERE medicine_id = ? AND quantity_remaining > 0 ORDER BY expiry_date ASC, created_at ASC').all(medicine_id);
        
        for (const batch of batches) {
            if (remainingToDeduct === 0) break;
            const deduct = Math.min(batch.quantity_remaining, remainingToDeduct);
            
            await db.prepare('UPDATE pharmacy_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?').run(deduct, batch.id);
            remainingToDeduct -= deduct;
        }

        // 3. Deduct from total medicine stock
        const newQty = med.quantity - quantity;
        const newStatus = newQty === 0 ? 'out-of-stock' : newQty <= (med.reorder_level || 10) ? 'low-stock' : 'in-stock';
        await db.prepare('UPDATE medicines SET quantity = ?, status = ? WHERE id = ?').run(newQty, newStatus, medicine_id);

        // 4. Record as Income/Financial entry (reclaiming money from supplier)
        await db.prepare('INSERT INTO account_entries (id, type, category, description, amount, department, reference_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), 'income', 'Supplier Return', `Return processed: ${med.name} (x${quantity})`, amount, 'Pharmacy', returnId, req.user.id);

        await db.exec('COMMIT');
        logAction(req.user.id, req.user.name, req.user.role, 'CREATE', 'PharmacyPurchase', `Supplier return processed: ${quantity} units of ${med.name}`, req.ip);
        res.status(201).json({ id: returnId });
    } catch (err) {
        await db.exec('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// ─── Reports & Dashboard ──────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const totalPurchases = (await db.prepare("SELECT SUM(total_amount) as s FROM pharmacy_purchase_orders WHERE status = 'received'").get()).s || 0;
        const totalCash = (await db.prepare("SELECT SUM(total_amount) as s FROM pharmacy_purchase_orders WHERE status = 'received' AND payment_type = 'cash'").get()).s || 0;
        const totalLoan = (await db.prepare("SELECT SUM(total_amount) as s FROM pharmacy_purchase_orders WHERE status = 'received' AND payment_type = 'loan'").get()).s || 0;
        const expiringCount = (await db.prepare("SELECT COUNT(*) as c FROM pharmacy_batches WHERE status = 'near-expiry' AND quantity_remaining > 0").get()).c || 0;
        const expiredCount = (await db.prepare("SELECT COUNT(*) as c FROM pharmacy_batches WHERE status = 'expired' AND quantity_remaining > 0").get()).c || 0;
        const returnedAmount = (await db.prepare("SELECT SUM(amount) as s FROM pharmacy_supplier_returns").get()).s || 0;
        
        // Stock Value Calculation based on batch unit prices
        const stockValueRes = await db.prepare(`
            SELECT SUM(b.quantity_remaining * pi.unit_price) as v
            FROM pharmacy_batches b
            LEFT JOIN pharmacy_purchase_items pi ON b.po_id = pi.po_id AND b.medicine_id = pi.medicine_id
            WHERE b.quantity_remaining > 0
        `).get();
        const stockValue = stockValueRes.v || 0;

        res.json({
            totalPurchases,
            totalCash,
            totalLoan,
            expiringCount,
            expiredCount,
            returnedAmount,
            stockValue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
