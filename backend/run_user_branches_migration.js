const db = require('./db');

async function migrate() {
    try {
        console.log('Creating user_branches table...');
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_branches (
                user_id INT NOT NULL,
                branch_id INT NOT NULL,
                PRIMARY KEY (user_id, branch_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        console.log('user_branches table created successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
