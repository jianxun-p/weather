PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  registered_at INTEGER NOT NULL
);

-- this user should never be logged in
INSERT OR IGNORE INTO users (id, username, pw_hash, pw_salt, registered_at) VALUES (1, "admin_exporter", "", "", 0);

CREATE UNIQUE INDEX IF NOT EXISTS username_index ON users (username);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  notes TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  weather TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS uid_index ON history (uid);

CREATE TABLE IF NOT EXISTS exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  url TEXT NOT NULL,
  notes TEXT DEFAULT '',
  FOREIGN KEY (uid) REFERENCES users(id)
);
