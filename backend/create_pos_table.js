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
      CREATE TABLE IF NOT EXISTS pos_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        branch_id INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    console.log('pos_devices table created successfully');
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
