const mysql = require('mysql2/promise');
async function run() {
    try {
        const conn = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'SPOS_db'});
        await conn.query(`
            CREATE TABLE IF NOT EXISTS discounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type ENUM('percentage', 'amount') DEFAULT 'percentage',
                value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                restricted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('Created discounts table');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
