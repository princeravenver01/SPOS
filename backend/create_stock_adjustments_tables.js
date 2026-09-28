const db = require('./db');

async function createTables() {
    const conn = await db.getConnection();
    try {
        console.log("Creating stock_adjustments table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS stock_adjustments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sa_number VARCHAR(50) NOT NULL,
                branch_id INT NOT NULL,
                reason VARCHAR(50) NOT NULL,
                sa_date DATE,
                notes TEXT,
                adjusted_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log("Creating stock_adjustment_items table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS stock_adjustment_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sa_id INT NOT NULL,
                product_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                sku VARCHAR(100),
                in_stock_before DECIMAL(10,2) DEFAULT 0,
                quantity_adjusted DECIMAL(10,2) DEFAULT 0,
                cost DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sa_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
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
