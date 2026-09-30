const { execFileSync } = require('node:child_process');
const path = require('node:path');
const mysql = require('mysql2/promise');

const backendDir = path.resolve(__dirname, '..');

function getAdminConfig() {
  const host = process.env.SPOS_TEST_DB_HOST;
  const user = process.env.SPOS_TEST_DB_USER;

  if (!host || !user) {
    throw new Error(
      'Set SPOS_TEST_DB_HOST, SPOS_TEST_DB_PORT, SPOS_TEST_DB_USER, and SPOS_TEST_DB_PASSWORD before running database tests.',
    );
  }

  return {
    host,
    port: Number(process.env.SPOS_TEST_DB_PORT || 3306),
    user,
    password: process.env.SPOS_TEST_DB_PASSWORD || '',
  };
}

function uniqueName(prefix) {
  return `${prefix}_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function environmentFor(database, overrides = {}) {
  const admin = getAdminConfig();
  return {
    ...process.env,
    DB_HOST: admin.host,
    DB_PORT: String(admin.port),
    DB_USER: admin.user,
    DB_PASSWORD: admin.password,
    DB_NAME: database,
    ...overrides,
  };
}

function runSetup(database, overrides = {}) {
  return execFileSync(process.execPath, ['setup_db.js'], {
    cwd: backendDir,
    env: environmentFor(database, overrides),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function dropDatabase(database) {
  if (!/^spos_(?:contract|dashboard|legacy|limited)_test_/.test(database)) {
    throw new Error(`Refusing to drop non-test database: ${database}`);
  }
  const admin = await mysql.createConnection(getAdminConfig());
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
  } finally {
    await admin.end();
  }
}

module.exports = {
  environmentFor,
  getAdminConfig,
  runSetup,
  uniqueName,
  dropDatabase,
};
