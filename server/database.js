const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

async function initDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            membership TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            membership_tier TEXT DEFAULT 'Loyalty Seal'
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS event_interests (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL,
            event_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(member_id, event_name)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_requests (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL,
            membership TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            confirmed_at TIMESTAMP
        )
    `);

    console.log("Database tables ready.");
}

module.exports = {
    pool,
    initDatabase
};