const db = require('./db');

async function migrate() {
    const conn = await db.getConnection();
    try {
        console.log("Updating products table...");
        await conn.query(`
            ALTER TABLE products 
            ADD COLUMN use_production BOOLEAN DEFAULT FALSE;
        `);

        console.log("Creating product_components table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS product_components (
                id INT AUTO_INCREMENT PRIMARY KEY,
                composite_product_id INT NOT NULL,
                component_product_id INT NOT NULL,
                quantity DECIMAL(10,3) NOT NULL,
                FOREIGN KEY (composite_product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log("Creating productions table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS productions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pr_number VARCHAR(50) NOT NULL,
                branch_id INT NOT NULL,
                type ENUM('Production', 'Disassembly') NOT NULL DEFAULT 'Production',
                notes TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log("Creating production_items table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS production_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                production_id INT NOT NULL,
                product_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                sku VARCHAR(100),
                quantity DECIMAL(10,2) NOT NULL,
                cost DECIMAL(10,2) DEFAULT 0,
                FOREIGN KEY (production_id) REFERENCES productions(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        console.log("Migration successful.");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        conn.release();
        process.exit();
    }
}

migrate();
