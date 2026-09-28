const pool = require('./db');

async function createProductionsTables() {
  try {
    // 1. Add use_production to products if it doesn't exist
    try {
      const [columns] = await pool.query(`SHOW COLUMNS FROM products LIKE 'use_production'`);
      if (columns.length === 0) {
        await pool.query(`ALTER TABLE products ADD COLUMN use_production BOOLEAN DEFAULT FALSE AFTER is_composite`);
        console.log("Added use_production column to products table.");
      } else {
        console.log("use_production column already exists in products table.");
      }
    } catch (err) {
       console.error("Error modifying products table:", err.message);
    }

    // 2. Create productions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS productions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        production_number VARCHAR(50) NOT NULL UNIQUE,
        branch_id BIGINT NOT NULL,
        created_by INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log("productions table created or already exists.");

    // 3. Create production_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS production_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        production_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (production_id) REFERENCES productions(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log("production_items table created or already exists.");

  } catch (err) {
    console.error('Error creating productions tables:', err);
  } finally {
    pool.end();
  }
}

createProductionsTables();
