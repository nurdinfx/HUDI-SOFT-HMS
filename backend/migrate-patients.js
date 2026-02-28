const Database = require('better-sqlite3');
const db = new Database('hospital.db');

const addColumn = (table, column, type, def) => {
    try {
        const query = def !== undefined
            ? `ALTER TABLE ${table} ADD COLUMN ${column} ${type} DEFAULT '${def}'`
            : `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`;
        db.exec(query);
        console.log(`Added column ${column} to ${table}`);
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log(`Column ${column} already exists in ${table}`);
        } else {
            console.error(`Error adding ${column} to ${table}: ${e.message}`);
        }
    }
};

addColumn('patients', 'allergies', 'TEXT', '[]');
addColumn('patients', 'chronic_conditions', 'TEXT', '[]');
addColumn('patients', 'emergency_contact', 'TEXT');
addColumn('patients', 'emergency_phone', 'TEXT');
addColumn('patients', 'insurance_provider', 'TEXT');
addColumn('patients', 'insurance_policy_number', 'TEXT');

console.log('Migration complete.');
