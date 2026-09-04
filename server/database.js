const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "inner-circle.db");

const db = new DatabaseSync(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        membership TEXT DEFAULT 'Pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        membership_tier TEXT DEFAULT 'Loyalty Seal'
    )
`);
try {
    db.exec(`
        ALTER TABLE members
        ADD COLUMN membership_tier TEXT
        DEFAULT 'Loyalty Seal'
    `);
} catch (error) {
    // Column already exists
}
db.exec(`
    CREATE TABLE IF NOT EXISTS event_interests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        event_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(member_id, event_name)
    )
`);
module.exports = db;