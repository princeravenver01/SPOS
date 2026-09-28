const db = require('./db');

async function createTables() {
    const conn = await db.getConnection();
    try {
        console.log("Creating inventory_counts table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS inventory_counts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ic_number VARCHAR(50) NOT NULL,
                branch_id INT NOT NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'Partial',
                status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                notes TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log("Creating inventory_count_items table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS inventory_count_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ic_id INT NOT NULL,
                product_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                sku VARCHAR(100),
                expected_stock DECIMAL(10,2) DEFAULT 0,
                counted_stock DECIMAL(10,2) NULL,
                cost DECIMAL(10,2) DEFAULT 0,
                FOREIGN KEY (ic_id) REFERENCES inventory_counts(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        console.log("Tables created successfully.");
    } catch (err) {
        console.error("Error creating tables:", err);
    } finally {
        conn.release();
        process.exit();
    }
}

createTables();
