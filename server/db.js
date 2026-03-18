// ─── SQLite Database Setup ───
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'healhive.db')

const db = new Database(DB_PATH)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')

// ─── Create Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password_hash TEXT  NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('user', 'therapist', 'admin')),
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assessment_reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT    NOT NULL,
    user_message    TEXT    NOT NULL,
    therapist_report TEXT   NOT NULL,
    tool_used       TEXT,
    score           INTEGER,
    severity        TEXT,
    created_at      TEXT    DEFAULT (datetime('now'))
  );
`)

// ─── Seed Default Accounts ───
const seedUsers = [
  { name: 'Alex Morgan', email: 'user@healhive.com', password: 'user123', role: 'user' },
  { name: 'Dr. Sarah Chen', email: 'therapist@healhive.com', password: 'therapist123', role: 'therapist' },
  { name: 'HealHive Admin', email: 'admin@healhive.com', password: 'admin123', role: 'admin' },
]

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, password_hash, role)
  VALUES (@name, @email, @password_hash, @role)
`)

for (const u of seedUsers) {
  const hash = bcrypt.hashSync(u.password, 10)
  insertUser.run({ name: u.name, email: u.email, password_hash: hash, role: u.role })
}

console.log('✅ SQLite database ready at', DB_PATH)

export default db
