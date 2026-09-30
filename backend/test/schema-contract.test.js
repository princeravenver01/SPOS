const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { after, before, test } = require('node:test');
const mysql = require('mysql2/promise');
const { dropDatabase, environmentFor, getAdminConfig, runSetup, uniqueName } = require('./test-database');

const database = uniqueName('spos_contract_test');
const limitedDatabase = uniqueName('spos_limited_test');
const legacyDatabase = uniqueName('spos_legacy_test');
const limitedUser = `spos_test_${process.pid}_${Date.now()}`.slice(0, 32);
const limitedPassword = 'contract-password';
const connectionOptions = (name = database) => ({ ...getAdminConfig(), database: name });

before(() => assert.match(runSetup(database), /Database setup completed successfully/));
after(async () => {
  const admin = await mysql.createConnection(getAdminConfig());
  try { await admin.query(`DROP USER IF EXISTS '${limitedUser}'@'%'`); } finally { await admin.end(); }
  await dropDatabase(database);
  await dropDatabase(limitedDatabase);
  await dropDatabase(legacyDatabase);
});

test('fresh setup creates the complete schema, seeds, and table merge support', async () => {
  const db = await mysql.createConnection(connectionOptions());
  try {
    const requiredColumns = {
      users: ['pin_hash', 'password_hash', 'role_id'], customers: ['branch_id'],
      products: ['branch_id', 'use_production', 'track_stock', 'in_stock'],
      orders: ['branch_id', 'dining_option_id', 'ticket_name', 'pax', 'gross_amount', 'discount_amount', 'refund_amount', 'net_amount'],
      order_items: ['price_at_time', 'cost_at_time'], pos_shifts: ['branch_id', 'cashier_id'],
      tables: ['merged_with_table_id'], table_reservations: ['branch_id', 'table_id', 'reservation_time', 'status'],
      printers: ['type', 'ip_address', 'branch_id', 'auto_print'],
    };
    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      const [rows] = await db.query('SHOW COLUMNS FROM ??', [tableName]);
      const actual = new Set(rows.map((row) => row.Field));
      for (const column of columns) assert.ok(actual.has(column), `${tableName}.${column} is required`);
    }

    const requiredTables = ['access_roles', 'branches', 'user_branches', 'receipt_settings', 'areas', 'tables', 'taxes', 'tax_branches', 'tax_dining_options', 'payment_types', 'dining_options', 'pos_devices', 'categories', 'modifiers', 'modifier_options', 'product_modifiers', 'settings', 'discounts', 'suppliers', 'purchase_orders', 'purchase_order_items', 'orders', 'order_items', 'payments', 'pos_pages', 'pos_page_items', 'inventory_history', 'inventory_counts', 'inventory_count_items', 'stock_adjustments', 'stock_adjustment_items', 'transfer_orders', 'transfer_order_items', 'productions', 'production_items'];
    const [tables] = await db.query('SHOW TABLES');
    const actualTables = new Set(tables.map((row) => Object.values(row)[0]));
    for (const tableName of requiredTables) assert.ok(actualTables.has(tableName), `${tableName} must be created`);

    const [[adminUser]] = await db.query('SELECT username, pin_hash, password_hash FROM users WHERE username = ?', ['admin']);
    assert.deepEqual(adminUser, { username: 'admin', pin_hash: '1234', password_hash: 'admin123' });

    const [area] = await db.query('INSERT INTO areas (branch_id, name) VALUES (1, ?)', ['Contract Area']);
    const [first] = await db.query('INSERT INTO tables (area_id, name) VALUES (?, ?)', [area.insertId, 'T1']);
    const [second] = await db.query('INSERT INTO tables (area_id, name) VALUES (?, ?)', [area.insertId, 'T2']);
    await db.query('UPDATE tables SET merged_with_table_id = ? WHERE id = ?', [second.insertId, first.insertId]);
    const [[merged]] = await db.query('SELECT merged_with_table_id FROM tables WHERE id = ?', [first.insertId]);
    assert.equal(merged.merged_with_table_id, second.insertId);
  } finally { await db.end(); }
});

test('setup rerun preserves existing records', async () => {
  const beforeConnection = await mysql.createConnection(connectionOptions());
  await beforeConnection.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['contract_test', JSON.stringify({ preserved: true })]);
  await beforeConnection.end();
  assert.doesNotThrow(() => runSetup(database));
  const afterConnection = await mysql.createConnection(connectionOptions());
  const [[row]] = await afterConnection.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['contract_test']);
  assert.deepEqual(row.setting_value, { preserved: true });
  await afterConnection.end();
});

test('setup works with an application user limited to its database', async () => {
  const admin = await mysql.createConnection(getAdminConfig());
  try {
    await admin.query(`CREATE DATABASE \`${limitedDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await admin.query(`CREATE USER '${limitedUser}'@'%' IDENTIFIED BY '${limitedPassword}'`);
    await admin.query(`GRANT ALL PRIVILEGES ON \`${limitedDatabase}\`.* TO '${limitedUser}'@'%'`);
  } finally { await admin.end(); }
  assert.doesNotThrow(() => runSetup(limitedDatabase, { DB_USER: limitedUser, DB_PASSWORD: limitedPassword }));
  const limited = await mysql.createConnection({ ...connectionOptions(limitedDatabase), user: limitedUser, password: limitedPassword });
  const [tables] = await limited.query('SHOW TABLES');
  assert.ok(tables.length > 30);
  await limited.end();
});

test('setup refuses an incompatible legacy schema with actionable guidance', async () => {
  const admin = await mysql.createConnection(getAdminConfig());
  try {
    await admin.query(`CREATE DATABASE \`${legacyDatabase}\``);
    await admin.query(`CREATE TABLE \`${legacyDatabase}\`.users (id INT PRIMARY KEY)`);
  } finally { await admin.end(); }
  assert.throws(() => execFileSync(process.execPath, ['setup_db.js'], {
    cwd: path.resolve(__dirname, '..'), env: environmentFor(legacyDatabase), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }), /older, incompatible schema/);
});
