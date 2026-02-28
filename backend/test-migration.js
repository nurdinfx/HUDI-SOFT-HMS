const db = require('./database').db;

const tryMigrate = (query) => {
    try {
        db.exec(query);
        console.log('SUCCESS:', query);
    } catch (e) {
        console.log('ERROR:', query, '->', e.message);
    }
};

tryMigrate("ALTER TABLE patients ADD COLUMN allergies TEXT DEFAULT '[]'");
tryMigrate("ALTER TABLE patients ADD COLUMN chronic_conditions TEXT DEFAULT '[]'");
tryMigrate("ALTER TABLE patients ADD COLUMN emergency_contact TEXT");
tryMigrate("ALTER TABLE patients ADD COLUMN emergency_phone TEXT");
tryMigrate("ALTER TABLE patients ADD COLUMN insurance_provider TEXT");
tryMigrate("ALTER TABLE patients ADD COLUMN insurance_policy_number TEXT");

require('./database').saveDb();
