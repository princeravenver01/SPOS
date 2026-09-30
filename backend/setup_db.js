const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function getDatabaseConfig() {
  const database = process.env.DB_NAME || 'SPOS_db';

  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
  };
}

async function assertExistingSchemaCompatible(connection, database) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?`,
    [database],
  );

  if (rows.length === 0) return;

  const columnsByTable = new Map();
  for (const row of rows) {
    if (!columnsByTable.has(row.TABLE_NAME)) columnsByTable.set(row.TABLE_NAME, new Set());
    columnsByTable.get(row.TABLE_NAME).add(row.COLUMN_NAME);
  }

  const compatibilityColumns = {
    users: ['pin_hash', 'password_hash', 'role_id'],
    customers: ['branch_id'],
    products: ['branch_id', 'use_production', 'track_stock', 'in_stock'],
    orders: ['branch_id', 'gross_amount', 'discount_amount', 'refund_amount', 'net_amount'],
    tables: ['merged_with_table_id'],
  };

  const missing = [];
  for (const [table, requiredColumns] of Object.entries(compatibilityColumns)) {
    const existingColumns = columnsByTable.get(table);
    if (!existingColumns) continue;
    for (const column of requiredColumns) {
      if (!existingColumns.has(column)) missing.push(`${table}.${column}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `The existing database uses an older, incompatible schema (missing: ${missing.join(', ')}). ` +
      'Back it up and use a fresh database for this pilot, or apply a release-specific migration.',
    );
  }
}

async function setup() {
  const config = getDatabaseConfig();
  let serverConnection;
  let databaseConnection;

  try {
    serverConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    await serverConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );

    const schemaPath = path.join(__dirname, 'database', 'bootstrap.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    databaseConnection = await mysql.createConnection({
      ...config,
      multipleStatements: true,
    });
    await assertExistingSchemaCompatible(databaseConnection, config.database);
    await databaseConnection.query(schema);

    console.log(`Database setup completed successfully: ${config.database}`);
  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (databaseConnection) await databaseConnection.end();
    if (serverConnection) await serverConnection.end();
  }
}

if (require.main === module) {
  setup();
}

module.exports = { assertExistingSchemaCompatible, getDatabaseConfig, setup };
