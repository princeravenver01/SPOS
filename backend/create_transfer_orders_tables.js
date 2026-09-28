const db = require('./db');

async function createTables() {
    const conn = await db.getConnection();
    try {
        console.log("Creating transfer_orders table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS transfer_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                to_number VARCHAR(50) NOT NULL,
                source_branch_id INT NOT NULL,
                dest_branch_id INT NOT NULL,
                to_date DATE,
                status VARCHAR(50) DEFAULT 'Draft',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (source_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
                FOREIGN KEY (dest_branch_id) REFERENCES branches(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log("Creating transfer_order_items table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS transfer_order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                to_id INT NOT NULL,
                source_product_id INT NOT NULL,
                dest_product_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                sku VARCHAR(100),
                quantity INT DEFAULT 1,
                received INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (to_id) REFERENCES transfer_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (source_product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (dest_product_id) REFERENCES products(id) ON DELETE CASCADE
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
