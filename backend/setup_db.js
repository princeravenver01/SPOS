const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setup() {
    try {
        // Connect without database selected first
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            multipleStatements: true
        });

        console.log('Connected to MySQL server.');

        const schemaPath = path.join(__dirname, 'spos_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema script...');
        await connection.query(schema);

        console.log('SPOS_db and tables created successfully!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Failed to setup database:', err);
        process.exit(1);
    }
}

setup();
