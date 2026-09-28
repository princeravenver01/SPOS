const fs = require('fs');
const pool = require('./db');

async function runSchema() {
    try {
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        
        // Remove comments and split by semicolon
        const queries = schema
            .replace(/--.*$/gm, '')
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);
            
        for (let query of queries) {
            console.log(`Executing: ${query.substring(0, 50)}...`);
            await pool.query(query);
        }
        
        console.log('Schema executed successfully!');
    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        process.exit();
    }
}

runSchema();
