const db = require('./db');

async function updateAdmin() {
  try {
    await db.query(`UPDATE users SET pin_hash='123123' WHERE username='admin'`);
    console.log('Admin password updated successfully.');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

updateAdmin();
