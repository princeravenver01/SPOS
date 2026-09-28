const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'SPOS_db'
    });

    const sql = `
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255),
        address_1 VARCHAR(255),
        address_2 VARCHAR(255),
        province VARCHAR(100),
        city VARCHAR(100),
        barangay VARCHAR(100),
        zip_code VARCHAR(20),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    
    await conn.query(sql);
    console.log('Suppliers table created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating suppliers table:', error);
    process.exit(1);
  }
}

run();
