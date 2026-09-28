const db = require('./db');

async function migrate() {
    const connection = await db.getConnection();
    try {
        console.log("Starting migration...");
        
        // Disable foreign key checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0;');

        // Create Orders table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`orders\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`user_id\` INT NOT NULL,
                \`table_id\` INT DEFAULT NULL,
                \`customer_id\` INT DEFAULT NULL,
                \`status\` ENUM('open', 'paid', 'cancelled', 'refunded') DEFAULT 'open',
                \`gross_amount\` DECIMAL(10,2) DEFAULT 0.00,
                \`discount_amount\` DECIMAL(10,2) DEFAULT 0.00,
                \`refund_amount\` DECIMAL(10,2) DEFAULT 0.00,
                \`net_amount\` DECIMAL(10,2) DEFAULT 0.00,
                \`total_amount\` DECIMAL(10,2) DEFAULT 0.00,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`),
                FOREIGN KEY (\`table_id\`) REFERENCES \`tables\`(\`id\`),
                FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`),
                INDEX \`idx_status_created\` (\`status\`, \`created_at\`)
            ) ENGINE=InnoDB;
        `);
        console.log("Created orders table.");

        // Create Order Items table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`order_items\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`order_id\` INT NOT NULL,
                \`product_id\` INT NOT NULL,
                \`variant_id\` INT DEFAULT NULL,
                \`quantity\` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
                \`price_at_time\` DECIMAL(10,2) NOT NULL,
                \`cost_at_time\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                \`notes\` VARCHAR(255),
                FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
                FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`),
                FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`id\`)
            ) ENGINE=InnoDB;
        `);
        console.log("Created order_items table.");

        // Create Payments table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`payments\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`order_id\` INT NOT NULL,
                \`amount_paid\` DECIMAL(10,2) NOT NULL,
                \`payment_method\` ENUM('cash', 'card', 'digital', 'other') NOT NULL,
                \`payment_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
                INDEX \`idx_payment_date\` (\`payment_date\`)
            ) ENGINE=InnoDB;
        `);
        console.log("Created payments table.");

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1;');
        console.log("Migration complete!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
