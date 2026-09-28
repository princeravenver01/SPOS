const db = require('./db');

async function migrate() {
    try {
        console.log('Adding discount columns to orders table...');
        
        // Add discount_id
        try {
            await db.execute('ALTER TABLE orders ADD COLUMN discount_id INT DEFAULT NULL');
            console.log('Added discount_id successfully');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('discount_id already exists');
            } else {
                throw e;
            }
        }

        // Add discount_amount
        try {
            await db.execute('ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00');
            console.log('Added discount_amount successfully');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('discount_amount already exists');
            } else {
                throw e;
            }
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
