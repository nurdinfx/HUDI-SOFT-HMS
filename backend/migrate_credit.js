/**
 * Migration script to create tables for Customer Credit & Loan Management.
 * Run this with node execute_migration.js
 */
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    console.log('🚀 Starting Credit Module Migration...');
    
    try {
        await db.exec('BEGIN');

        // 1. Credit Customers Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS credit_customers (
                id TEXT PRIMARY KEY,
                customer_id TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                patient_id TEXT,
                credit_limit DECIMAL(12,2) DEFAULT 1000.00,
                outstanding_balance DECIMAL(12,2) DEFAULT 0.00,
                total_credit_taken DECIMAL(12,2) DEFAULT 0.00,
                total_payments_made DECIMAL(12,2) DEFAULT 0.00,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created credit_customers table');

        // 2. Credit Transactions Table (Linked to POS/Invoices)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS credit_transactions (
                id TEXT PRIMARY KEY,
                transaction_id TEXT UNIQUE NOT NULL,
                customer_id TEXT NOT NULL,
                invoice_id TEXT,
                invoice_number TEXT,
                items_summary TEXT,
                total_amount DECIMAL(12,2) NOT NULL,
                amount_paid DECIMAL(12,2) DEFAULT 0.00,
                remaining_balance DECIMAL(12,2) NOT NULL,
                status TEXT DEFAULT 'unpaid',
                staff_id TEXT,
                staff_name TEXT,
                date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES credit_customers(id)
            )
        `);
        console.log('✅ Created credit_transactions table');

        // 3. Credit Payments Table (Repayments)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS credit_payments (
                id TEXT PRIMARY KEY,
                payment_id TEXT UNIQUE NOT NULL,
                customer_id TEXT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                payment_method TEXT NOT NULL,
                reference_notes TEXT,
                date DATE DEFAULT CURRENT_DATE,
                staff_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES credit_customers(id)
            )
        `);
        console.log('✅ Created credit_payments table');

        // 4. Credit Ledger Table (Professional Double-Entry Style)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS credit_ledger (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                date DATE DEFAULT CURRENT_DATE,
                description TEXT NOT NULL,
                type TEXT NOT NULL, -- 'debit' (purchase) or 'credit' (payment)
                amount DECIMAL(12,2) NOT NULL,
                running_balance DECIMAL(12,2) NOT NULL,
                reference_id TEXT, -- transaction_id or payment_id
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES credit_customers(id)
            )
        `);
        console.log('✅ Created credit_ledger table');

        await db.exec('COMMIT');
        console.log('✨ Migration completed successfully!');
    } catch (err) {
        await db.exec('ROLLBACK');
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
