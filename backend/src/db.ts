import duckdb from "duckdb";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(__dirname, "..", "data", "elec.duckdb");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new duckdb.Database(DB_PATH);

export function getConnection(): duckdb.Connection {
  return new duckdb.Connection(db);
}

function run(conn: duckdb.Connection, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function query<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const conn = getConnection();
    conn.all(sql, ...params, (err: Error | null, rows: unknown) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function execute(sql: string, ...params: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = getConnection();
    conn.run(sql, ...params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function initializeDatabase(): Promise<void> {
  const conn = getConnection();

  await run(
    conn,
    `
    CREATE TABLE IF NOT EXISTS sites (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR,
      api_base_url VARCHAR NOT NULL,
      username VARCHAR NOT NULL DEFAULT '',
      enc_key VARCHAR NOT NULL,
      iv_key VARCHAR NOT NULL,
      user_agent VARCHAR DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  );

  // Migration: add username column to existing sites table
  try {
    await run(conn, `ALTER TABLE sites ADD COLUMN username VARCHAR NOT NULL DEFAULT ''`);
  } catch {
    // Column already exists, ignore
  }

  await run(
    conn,
    `
    CREATE TABLE IF NOT EXISTS site_credentials (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id VARCHAR NOT NULL,
      username VARCHAR NOT NULL,
      password VARCHAR NOT NULL,
      fcm_id VARCHAR DEFAULT '',
      input_type VARCHAR,
      auth_token VARCHAR,
      refresh_token VARCHAR,
      user_id INTEGER,
      flat_id INTEGER,
      meter_sn VARCHAR,
      logged_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  );

  await run(
    conn,
    `
    CREATE TABLE IF NOT EXISTS dashboard_details (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id VARCHAR NOT NULL,
      avg_energy DOUBLE,
      avg_cost DOUBLE,
      balance DOUBLE,
      exp_recharge_days INTEGER,
      polled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  );

  await run(
    conn,
    `
    CREATE TABLE IF NOT EXISTS live_updates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id VARCHAR NOT NULL,
      supply INTEGER,
      present_load DOUBLE,
      balance DOUBLE,
      eb DOUBLE,
      dg DOUBLE,
      sanction_eb DOUBLE,
      sanction_dg DOUBLE,
      updated_on VARCHAR,
      polled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  );

  await run(
    conn,
    `
    CREATE TABLE IF NOT EXISTS home_data (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id VARCHAR NOT NULL,
      device_id INTEGER,
      meter_sn VARCHAR,
      eb_dg_status INTEGER,
      rel_status VARCHAR,
      current_day_eb DOUBLE,
      current_day_dg DOUBLE,
      current_month_eb DOUBLE,
      current_month_dg DOUBLE,
      meter_bal DOUBLE,
      polled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  );

  await run(
    conn,
    `
    CREATE TABLE IF NOT EXISTS recharge_history (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id VARCHAR NOT NULL,
      serial_no INTEGER,
      datetime TIMESTAMP,
      amount DOUBLE,
      status VARCHAR,
      polled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  );

  console.log("Database initialized successfully");
}

export default db;
