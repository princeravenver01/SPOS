const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'SPOS_db'
    });

    const poSql = `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id INT,
        branch_id INT,
        status ENUM('Draft', 'Pending', 'Partially Received', 'Closed') DEFAULT 'Draft',
        po_date DATE,
        expected_on DATE,
        notes TEXT,
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `;
    
    const poItemsSql = `
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        received INT NOT NULL DEFAULT 0,
        cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    
    await conn.query(poSql);
    console.log('purchase_orders table created.');
    await conn.query(poItemsSql);
    console.log('purchase_order_items table created.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

run();
