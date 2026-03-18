import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'weather.db');
const initSqlPath = path.join(__dirname, '..', 'sql', 'init.sql');

sqlite3.verbose();

export function createDb() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new sqlite3.Database(dbPath, (error) => {
      if (error) {
        console.error('Error opening database:', error);
        reject(error);
        return;
      }
      resolve(db);
    });
  });
}

export function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        console.error('Database error:', error);
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        console.error('Database error:', error);
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

export function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        console.error('Database error:', error);
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

export function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        console.error('Database error:', error);
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function initializeSchema(db) {
  const initSql = fs.readFileSync(initSqlPath, 'utf8');
  await exec(db, initSql);
}
