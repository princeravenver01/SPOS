const pool = require('./backend/db');

async function test() {
    try {
        const values = [[1, 1]];
        await pool.query('INSERT INTO user_branches (user_id, branch_id) VALUES ?', [values]);
        console.log('Success 1 layer array');
    } catch (e) {
        console.error('Error 1 layer array:', e.message);
    }
    
    try {
        const values = [[1, 1]];
        await pool.query('INSERT INTO user_branches (user_id, branch_id) VALUES ?', [[values]]);
        console.log('Success 2 layer array');
    } catch (e) {
        console.error('Error 2 layer array:', e.message);
    }
    process.exit(0);
}
test();
