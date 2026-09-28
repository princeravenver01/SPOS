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
    
    // 1. Categories
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20) DEFAULT '#fbbd05',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Products
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        category_id INT,
        description TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        sold_by ENUM('each', 'weight', 'volume') DEFAULT 'each',
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
        sku VARCHAR(100),
        barcode VARCHAR(100),
        is_composite BOOLEAN DEFAULT FALSE,
        track_stock BOOLEAN DEFAULT FALSE,
        in_stock DECIMAL(10, 2) DEFAULT 0,
        low_stock DECIMAL(10, 2) DEFAULT 0,
        label_color VARCHAR(20) DEFAULT '#fbbd05',
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        UNIQUE KEY unique_branch_sku (branch_id, sku)
      ) ENGINE=InnoDB;
    `);

    // 3. Product Components (for composites)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_components (
        parent_product_id INT NOT NULL,
        component_product_id INT NOT NULL,
        quantity DECIMAL(10, 4) NOT NULL DEFAULT 1,
        cost DECIMAL(10, 2) DEFAULT 0,
        PRIMARY KEY (parent_product_id, component_product_id),
        FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 4. Product Variants
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        sku VARCHAR(100),
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        stock DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('Products tables setup successfully completed.');
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
