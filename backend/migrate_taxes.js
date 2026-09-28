const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: 'spos_db'
        });

        console.log('Connected to DB');
        
        await conn.query('DROP TABLE IF EXISTS tax_dining_options;');
        console.log('Dropped legacy tax_dining_options');

        await conn.end();
        console.log('Migration complete');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
