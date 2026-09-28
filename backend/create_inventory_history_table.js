const db = require('./db');

async function migrate() {
    try {
        console.log('Starting migration for inventory history...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS inventory_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                branch_id BIGINT NOT NULL,
                employee_name VARCHAR(100) DEFAULT 'Admin',
                reason VARCHAR(255) NOT NULL,
                adjustment DECIMAL(10,2) NOT NULL,
                stock_after DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                INDEX idx_product (product_id),
                INDEX idx_branch (branch_id)
            ) ENGINE=InnoDB;
        `);
        console.log('Created inventory_history table.');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
