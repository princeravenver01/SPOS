const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { after, before, test } = require('node:test');
const mysql = require('mysql2/promise');
const { dropDatabase, environmentFor, getAdminConfig, runSetup, uniqueName } = require('./test-database');

const backendDir = path.resolve(__dirname, '..');
const database = uniqueName('spos_dashboard_test');
before(() => runSetup(database));
after(() => dropDatabase(database));

function startServer(port) {
  const child = spawn(process.execPath, ['server.js'], { cwd: backendDir, env: { ...environmentFor(database), PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  const ready = new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Server did not start:\n${output}`)), 10_000);
    const collect = (chunk) => { output += chunk.toString(); if (output.includes(`Server running on port ${port}`)) { clearTimeout(timeout); resolve(); } };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Server exited with ${code}:\n${output}`)); });
  });
  return { child, ready };
}

test('branch performance does not multiply gross sales by item count', async (t) => {
  const db = await mysql.createConnection({ ...getAdminConfig(), database });
  const [category] = await db.query('INSERT INTO categories (branch_id, name) VALUES (1, ?)', ['Dashboard Test']);
  const [product1] = await db.query('INSERT INTO products (branch_id, category_id, name, price) VALUES (1, ?, ?, ?)', [category.insertId, 'Item One', 40]);
  const [product2] = await db.query('INSERT INTO products (branch_id, category_id, name, price) VALUES (1, ?, ?, ?)', [category.insertId, 'Item Two', 30]);
  const [order] = await db.query("INSERT INTO orders (user_id, branch_id, total_amount, gross_amount, net_amount, status) VALUES (1, 1, 100, 100, 100, 'paid')");
  await db.query('INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, 1, 40), (?, ?, 2, 30)', [order.insertId, product1.insertId, order.insertId, product2.insertId]);
  await db.end();

  const { child, ready } = startServer(55123); t.after(() => child.kill()); await ready;
  const response = await fetch('http://127.0.0.1:55123/api/dashboard/branch-performance');
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.performance[0].transactionsToday, 1);
  assert.equal(body.performance[0].grossSalesToday, 100);
  assert.equal(Number(body.performance[0].itemsSoldToday), 3);
});

test('API accepts browser requests from private-LAN frontend ports', async (t) => {
  const { child, ready } = startServer(55124); t.after(() => child.kill()); await ready;
  const origin = 'http://192.168.254.161:5173';
  const response = await fetch('http://127.0.0.1:55124/api/branches', { headers: { Origin: origin } });
  const body = await response.text();
  assert.equal(response.status, 200, body);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});
