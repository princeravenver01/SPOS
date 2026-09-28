const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const conn = await mysql.createConnection({ 
        host: process.env.DB_HOST || 'localhost', 
        user: process.env.DB_USER || 'root', 
        password: process.env.DB_PASSWORD || '', 
        database: 'spos_db' 
    });
    
    // Create access_roles table with detailed JSON permissions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS access_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        permissions JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Insert Default Roles if they don't exist
    const defaultPermissions = JSON.stringify({
        pos_access: true,
        void_orders: true,
        apply_discounts: true,
        manage_inventory: true,
        manage_employees: true,
        manage_settings: true,
        view_reports: true,
        refund_payments: true
    });
    
    const cashierPermissions = JSON.stringify({
        pos_access: true,
        void_orders: false,
        apply_discounts: false,
        manage_inventory: false,
        manage_employees: false,
        manage_settings: false,
        view_reports: false,
        refund_payments: false
    });

    await conn.query(`INSERT IGNORE INTO access_roles (name, permissions) VALUES ('Administrator', ?)`, [defaultPermissions]);
    await conn.query(`INSERT IGNORE INTO access_roles (name, permissions) VALUES ('Cashier', ?)`, [cashierPermissions]);

    // Check if users table has role_id column
    const [columns] = await conn.query(`SHOW COLUMNS FROM users LIKE 'role_id'`);
    if (columns.length === 0) {
        console.log("Altering users table to add role_id...");
        // Add role_id column
        await conn.query(`ALTER TABLE users ADD COLUMN role_id INT DEFAULT NULL`);
        // Map existing text roles to role_id
        await conn.query(`
            UPDATE users u 
            JOIN access_roles ar ON LOWER(u.role) = LOWER(ar.name) 
            SET u.role_id = ar.id
        `);
        // For any null role_ids (unmapped), default to Cashier
        await conn.query(`
            UPDATE users SET role_id = (SELECT id FROM access_roles WHERE name = 'Cashier') WHERE role_id IS NULL
        `);
        // Set Foreign Key constraint
        await conn.query(`ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES access_roles(id) ON DELETE SET NULL`);
        // Drop the old role string column (Optional but good for cleanliness. Let's keep it for rollback safety for now or drop it)
        await conn.query(`ALTER TABLE users DROP COLUMN role`);
    }

    console.log('Access Roles setup successfully completed.');
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
