const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function migratePurchaseHub() {
    console.log('🚀 Starting Pharmacy Purchase Hub Migration...');
    try {
        // 1. Suppliers
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_suppliers (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                contact_person TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Purchase Orders
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_purchase_orders (
                id UUID PRIMARY KEY,
                po_number TEXT UNIQUE NOT NULL,
                supplier_id UUID REFERENCES pharmacy_suppliers(id),
                order_date DATE DEFAULT CURRENT_DATE,
                total_amount DECIMAL(15,2) DEFAULT 0,
                status TEXT DEFAULT 'pending', -- pending, received, cancelled
                notes TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Purchase Items
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_purchase_items (
                id UUID PRIMARY KEY,
                po_id UUID REFERENCES pharmacy_purchase_orders(id) ON DELETE CASCADE,
                medicine_id UUID REFERENCES medicines(id),
                medicine_name TEXT,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(15,2) NOT NULL,
                total_price DECIMAL(15,2) NOT NULL
            )
        `);

        // 4. Batches (Inventory tracking)
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_batches (
                id UUID PRIMARY KEY,
                medicine_id UUID REFERENCES medicines(id),
                batch_number TEXT NOT NULL,
                quantity_received INTEGER NOT NULL,
                quantity_remaining INTEGER NOT NULL,
                expiry_date DATE NOT NULL,
                po_id UUID REFERENCES pharmacy_purchase_orders(id),
                supplier_id UUID REFERENCES pharmacy_suppliers(id),
                status TEXT DEFAULT 'valid', -- valid, near-expiry, expired
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Supplier Returns
        await db.query(`
            CREATE TABLE IF NOT EXISTS pharmacy_supplier_returns (
                id UUID PRIMARY KEY,
                supplier_id UUID REFERENCES pharmacy_suppliers(id),
                batch_id UUID REFERENCES pharmacy_batches(id),
                item_name TEXT,
                quantity INTEGER NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                reason TEXT,
                return_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✨ Pharmacy Purchase Hub Migration completed successfully!');
    } catch (err) {
        console.error('❌ Pharmacy Purchase Hub Migration Error:', err.message);
        throw err;
    }
}

module.exports = migratePurchaseHub;
