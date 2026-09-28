const pool = require('./db');

async function createPrintersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS printers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type ENUM('counter', 'kitchen') NOT NULL DEFAULT 'counter',
        ip_address VARCHAR(45) NOT NULL,
        port INT NOT NULL DEFAULT 9100,
        paper_width VARCHAR(10) NOT NULL DEFAULT '58mm',
        branch_id INT DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        auto_print TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_branch_type (branch_id, type)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ Printers table verified or created successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create printers table:', err);
    process.exit(1);
  }
}

createPrintersTable();
