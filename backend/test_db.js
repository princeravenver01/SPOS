const mysql = require('mysql2/promise');

async function test() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'SPOS_db'
  });

  const [rows] = await db.query(`
    SELECT u.username, u.name, ar.name as role_name, ar.permissions 
    FROM users u 
    JOIN access_roles ar ON u.role_id = ar.id 
  `);

  console.log("All users:");
  console.log(JSON.stringify(rows, null, 2));

  const posUsers = rows.filter(row => {
    let perms = row.permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch (e) { return false; }
    }
    return perms && (perms.pos_access === true || perms.pos_access === 'true' || perms.pos_access === 1);
  });

  console.log("\nPOS users after filter:");
  console.log(JSON.stringify(posUsers, null, 2));

  await db.end();
}

test().catch(console.error);
