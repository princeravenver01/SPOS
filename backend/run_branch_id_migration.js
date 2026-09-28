const db = require('./db');

async function migrate() {
    try {
        console.log('Adding branch_id to orders and pos_shifts...');

        try {
            await db.execute('ALTER TABLE orders ADD COLUMN branch_id INT DEFAULT NULL');
            console.log('Added branch_id to orders successfully');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('branch_id already exists in orders');
            else throw e;
        }

        try {
            await db.execute('ALTER TABLE pos_shifts ADD COLUMN branch_id INT DEFAULT NULL');
            console.log('Added branch_id to pos_shifts successfully');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('branch_id already exists in pos_shifts');
            else throw e;
        }

        // Add foreign keys (optional but good practice, if possible)
        try {
            await db.execute('ALTER TABLE orders ADD CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL');
            console.log('Added foreign key to orders successfully');
        } catch (e) {
             console.log('Foreign key might already exist in orders or failed to add');
        }

        try {
            await db.execute('ALTER TABLE pos_shifts ADD CONSTRAINT fk_shifts_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL');
            console.log('Added foreign key to pos_shifts successfully');
        } catch (e) {
             console.log('Foreign key might already exist in pos_shifts or failed to add');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
