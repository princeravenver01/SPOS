const mysql = require('mysql2/promise');
require('dotenv').config();

async function createShiftsTable() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'SPOS_db'
  });

  await db.query(`
    CREATE TABLE IF NOT EXISTS pos_shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cashier_id INT NOT NULL,
      cashier_name VARCHAR(255) NOT NULL,
      starting_cash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      cash_payments DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      cash_refunds DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      paid_in DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      paid_out DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      expected_cash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      actual_cash DECIMAL(10,2) NULL,
      difference DECIMAL(10,2) NULL,
      status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP NULL,
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    ) ENGINE=InnoDB;
  `);

  console.log("Table pos_shifts created!");
  await db.end();
}

createShiftsTable().catch(console.error);
