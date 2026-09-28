const pool = require('./db');

async function verify() {
    try {
        const tables = ['settings', 'users', 'customers', 'categories', 'modifiers', 'modifier_options', 'discounts', 'products', 'product_variants', 'product_components'];
        
        for (const table of tables) {
            const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            const [sample] = await pool.query(`SELECT * FROM ${table} LIMIT 2`);
            console.log(`\n=== ${table.toUpperCase()} (${rows[0].count} rows) ===`);
            if (sample.length > 0) {
                sample.forEach(row => {
                    const keys = Object.keys(row);
                    const preview = keys.slice(0, 5).map(k => `${k}: ${row[k]}`).join(', ');
                    console.log(`  → ${preview}`);
                });
            } else {
                console.log('  (empty)');
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

verify();
