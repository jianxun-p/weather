import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { all, createDb, get, initializeSchema, run } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import util from 'util';
import morgan from 'morgan';
import { getWeather, validateWeatherRequest } from './weather.js';
import { validateExportAuth, exportHistory } from './dataExport.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', '..', 'Client', 'dist')));
app.use(cors());
app.use(express.json());
app.use(session({
  secret: crypto.generateKeySync('hmac', {length: 512}),        // A strong, random string for signing the session ID cookie
  resave: false,              // Don't save session if unmodified
  saveUninitialized: false,   // Don't create session until something stored
  rolling: true,              // Resets maxAge on each response
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60000, 
    httpOnly: true, 
    sameSite: 'strict' 
  }
}));
app.use(morgan('combined'));

let db;

const scrypt = util.promisify(crypto.scrypt);


async function registerUser(username, password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  await run(
    db,
    `INSERT INTO users (username, pw_hash, pw_salt, registered_at) VALUES (?, ?, ?, ?)`,
    [username, hash.toString('base64'), salt.toString('base64'), Date.now()]
  );
  return await get(
      db,
      `SELECT id, pw_hash, pw_salt
       FROM users
       WHERE username = ?`,
      [username]
  );
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }
  const pw = Buffer.from(password, 'utf-8');

  let userRow = await get(
      db,
      `SELECT id, pw_hash, pw_salt
       FROM users
       WHERE username = ?`,
      [username]
  );
  if (!userRow) {
    userRow = await registerUser(username, pw);
    req.session.uid = userRow.id;
    return res.status(201).json({ ok: true, message: 'User successfully registered. Please log in again.' });
  }
  req.session.uid = userRow.id;

  const hashed = await scrypt(pw, Buffer.from(userRow.pw_salt, 'base64'), 64);

  const storedHash = Buffer.from(userRow.pw_hash, 'base64');

  if (hashed.length != storedHash.length || !crypto.timingSafeEqual(hashed, storedHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  return res.json({ 
    ok: true,
    user: {
      id: userRow.id,
      username
    },
  });
});

app.post('/logout', async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to log out.', error_code: 500, ok: false });
    }
  });
  res.status(200).json({ ok: true });
});

app.get('/userinfo', async (req, res) => {
  if (typeof req.session.uid !== 'number') {
    res.status(401).json({ error: 'Unauthorized. Please log in.', error_code: 401 });
    return;
  }
  const userRow = await get(
    db,
    `SELECT id AS uid, username, registered_at
    FROM users
    WHERE id = ?`,
    [req.session.uid]
  );
  if (!userRow) {
    res.status(404).json({ error: 'User not registered.', error_code: 404 });
    return;
  } else {
    res.json({ ok: true, id: userRow.id, username: userRow.username, registered_at: userRow.registered_at });
  }
});

app.get('/history', async (req, res) => {
  if (typeof req.session.uid !== 'number') {
    return res.status(401).json({ error: 'Unauthorized. Please log in.', error_code: 401 });
  }
  try {
    let rows = await all(
      db,
      `SELECT id, name, latitude, longitude, notes, created_at, updated_at, weather
       FROM history
       WHERE uid = ?
       ORDER BY id DESC`,
      [req.session.uid]
    );
    rows = rows.map(r => {
      r.weather = JSON.parse(r.weather);
      return r;
    });
    return res.status(200).json({ok: true, history: rows});
  } catch (error) {
    console.error('Error retrieving history:', error);
    return res.status(500).json({ error: 'Failed to retrieve history.', error_code: 500 });
  }
});

app.delete('/history', async (req, res) => {
  if (!req.session?.uid) {
    res.status(401).json({ error: 'Unauthorized. Please log in.', error_code: 401, ok: false });
    return;
  }
  try {    
    await run(db, 'DELETE FROM history WHERE uid = ?', [req.session.uid]);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history.', ok: false, error_code: 500 });
  } 
});

app.post('/weather', async (req, res) => {

  const params = validateWeatherRequest(req, res);
  if (params === null) {
    return;
  }

  const weather = await getWeather(params.latitude, params.longitude, params.pastDays, params.forecastDays);
  if (!weather) {
    return res.status(503).json({ error: 'Weather service is temporarily unavailable. Please try again shortly.', error_code: 503 });
  }
  if (!req.session?.uid) {
    const response = Object.assign({ ok: true }, weather);
    return res.status(200).json(response);
  }
  try {
    const result = await run(
      db,
      `INSERT INTO history (uid, name, latitude, longitude, notes, created_at, updated_at, weather)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.uid, params.name, params.latitude, params.longitude, '', Date.now(), Date.now(), JSON.stringify(weather)]
    );

    const created = await get(
      db,
      `SELECT id, name, latitude, longitude, notes, created_at
        FROM history
        WHERE id = ?`,
      [result.lastID]
    );
    const response = Object.assign({ok: true, id: created.id}, weather);
    return res.status(201).json(response);
  } catch (error) {
    console.error('Error saving history to history:', error);
    return res.status(500).json({ error: 'Failed to save history.', error_code: 500 });
  }
});

app.get('/history/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid history id.' });
      return;
    }
    const row = await get(
      db,
      `SELECT id, name, latitude, longitude, notes, created_at, updated_at
       FROM history
       WHERE id = ?`,
      [id]
    );
    if (!row) {
      res.status(404).json({ error: 'History not found.' });
      return;
    }
    res.json(row);
  } catch (error) {
    next(error);
  }
});

app.put('/history/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid history id.' });
      return;
    }

    if (typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      res.status(400).json({ error: 'Invalid name.' });
      return;
    }

    const existing = await get(db, 'SELECT id, name, notes, latitude, longitude FROM history WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'History not found.' });
      return;
    }

    const name = req.body.name.trim() ?? existing.name;
    const notes = req.body.notes?.trim() ?? existing.notes;
    const lat = req.body.latitude ?? existing.latitude;
    const lon = req.body.longitude ?? existing.longitude;

    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      res.status(400).json({ error: 'Invalid latitude value.', ok: false, error_code: 400 });
      return null;
    }
    if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Invalid longitude value.', ok: false, error_code: 400 });
      return null;
    }

    await run(
      db,
      `UPDATE history
       SET name = ?, notes = ?, latitude, longitude, updated_at = ?
       WHERE id = ?`,
      [name, notes, latitude, longitude, Date.now(), id]
    );

    const updated = await get(
      db,
      `SELECT id, name, latitude, longitude, notes, created_at, updated_at
       FROM history
       WHERE id = ?`,
      [id]
    );

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/history/:id', async (req, res) => {
  if (!req.session?.uid) {
    res.status(401).json({ error: 'Unauthorized. Please log in.', error_code: 401, ok: false });
    return;
  }

  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid history id.', ok: false, error_code: 400 });
      return;
    }

    const result = await run(db, 'DELETE FROM history WHERE id = ? AND uid = ?', [id, req.session.uid]);
    if (result.changes === 0) {
      res.status(404).json({ error: 'History not found.', ok: false, error_code: 404 });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history.', ok: false, error_code: 500 });
  }
});

app.post('/export/admin', async (req, res) => {
  if (!validateExportAuth(req, res)) {
    return;
  }
  try {
    const history = await all(
      db,
      `SELECT id, uid, name, latitude, longitude, notes, created_at, updated_at, weather
       FROM history
       ORDER BY id DESC`,
      []
    );
    const url = exportHistory(history);
    await run(
      db, 
      `INSERT INTO exports (uid, url, created_at, notes) 
      VALUES (1, ?, ?, ?)`, 
      [url, Date.now(), (req.body.notes ?? '').toString()]
    );
    return res.status(200).json({ ok: true, export: { url } });
  } catch (error) {
    console.error('Error exporting history:', error);
    return res.status(500).json({ error: 'Failed to export history.', error_code: 500, ok: false });
  }
});

app.post('/export', async (req, res) => {
  if (!req.session?.uid) {
    res.status(401).json({ error: 'Unauthorized. Please log in.', error_code: 401, ok: false });
    return;
  }
  try {
    const history = await all(
      db,
      `SELECT id, uid, name, latitude, longitude, notes, created_at, updated_at, weather
       FROM history
       WHERE uid = ?
       ORDER BY id DESC`,
      [req.session.uid]
    );
    const url = exportHistory(history);
    await run(
      db, 
      `INSERT INTO exports (uid, url, created_at, notes) 
      VALUES (?, ?, ?, ?)`, 
      [req.session.uid, url, Date.now(), (req.body.notes ?? '').toString()]
    );
    return res.status(200).json({ ok: true, export: { url } });
  } catch (error) {
    console.error('Error exporting history:', error);
    return res.status(500).json({ error: 'Failed to export history.', error_code: 500, ok: false });
  }
});


app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error.', error_code: 500, ok: false });
});

async function start() {
  db = await createDb();
  await initializeSchema(db);

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
