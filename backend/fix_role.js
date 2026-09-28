const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'SPOS_db'});
    await conn.query("ALTER TABLE users MODIFY role ENUM('admin', 'manager', 'cashier') DEFAULT 'cashier'");
    console.log('Fixed role column default value');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
