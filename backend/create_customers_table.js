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
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(50),
        address VARCHAR(255),
        province VARCHAR(100),
        city VARCHAR(100),
        barangay VARCHAR(100),
        zip_code VARCHAR(20),
        customer_code VARCHAR(50) UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    
    console.log('customers table created successfully');
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
