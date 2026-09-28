const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/SPOS/backend/.env' });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'spos_db'
    });

    try {
        console.log('Creating pos_pages table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS pos_pages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);

        console.log('Creating pos_page_items table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS pos_page_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                page_id INT NOT NULL,
                grid_index INT NOT NULL,
                type ENUM('product', 'category', 'discount') NOT NULL,
                reference_id INT NOT NULL,
                FOREIGN KEY (page_id) REFERENCES pos_pages(id) ON DELETE CASCADE,
                UNIQUE KEY unique_grid_slot (page_id, grid_index)
            ) ENGINE=InnoDB;
        `);

        // Create a default first page
        const [pages] = await connection.query('SELECT COUNT(*) as count FROM pos_pages');
        if (pages[0].count === 0) {
            console.log('Creating default Page 1...');
            await connection.query('INSERT INTO pos_pages (name, sort_order) VALUES ("Page 1", 0)');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
