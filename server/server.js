require("dotenv").config();
const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();
const crypto = require("crypto");

const sessions = new Map();
const adminSessions = new Map();
const PORT = process.env.PORT || 3000;
// PAYMENT CONFIRMATION TABLE

db.prepare(`
    CREATE TABLE IF NOT EXISTS payment_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        membership TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME
    )
`).run();
// Allow the server to receive JSON
app.use(express.json());

// Serve the website
app.use(express.static(path.join(__dirname, "..")));


// Test route
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "Inner Circle backend is running."
    });
});


// MEMBER REGISTRATION
app.post("/api/register", (req, res) => {

    const {
    fullName,
    email,
    password,
    membershipTier
} = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters."
        });
    }

    try {

        const crypto = require("crypto");

        const salt = crypto.randomBytes(16).toString("hex");

        const hash = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

        const passwordHash = `${salt}:${hash}`;

        const statement = db.prepare(`
         INSERT INTO members
         (full_name, email, password_hash, membership_tier)
         VALUES (?, ?, ?, ?)
        `);

        statement.run(
            fullName,
            email,
            passwordHash,
            membershipTier
        );

        res.json({
            success: true,
            message: "Member registered successfully."
        });

    } catch (error) {

        if (error.message.includes("UNIQUE")) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});
app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    try {

        const crypto = require("crypto");

        const statement = db.prepare(`
            SELECT *
            FROM members
            WHERE email = ?
        `);

        const member = statement.get(email);

        if (!member || !member.password_hash) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const [salt, storedHash] =
            member.password_hash.split(":");

        const suppliedHash = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

        const passwordMatches =
            crypto.timingSafeEqual(
                Buffer.from(storedHash, "hex"),
                Buffer.from(suppliedHash, "hex")
            );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

    const sessionToken = crypto.randomBytes(32).toString("hex");

sessions.set(sessionToken, {
    id: member.id,
    fullName: member.full_name,
    email: member.email,
    membershipTier: member.membership_tier,
    createdAt: member.created_at
});

res.json({
    success: true,
    message: "Login successful.",
    token: sessionToken,
    member: {
    id: member.id,
    fullName: member.full_name,
    email: member.email,
    createdAt: member.created_at,
    membershipTier: member.membership_tier
}
});

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});
app.get("/api/me", (req, res) => {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Not logged in."
        });
    }

    const member = sessions.get(token);

    if (!member) {
        return res.status(401).json({
            success: false,
            message: "Session expired or invalid."
        });
    }

    res.json({
        success: true,
        member: member
    });
});
// UPDATE MEMBERSHIP

app.post("/api/membership", (req, res) => {

    const token = req.headers.authorization;
    const { membership } = req.body;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    const member = sessions.get(token);

    if (!member) {
        return res.status(401).json({
            success: false,
            message: "Session expired or invalid."
        });
    }

    const allowedMemberships = [
        "Loyalty Seal",
        "Trust Bond",
        "Eternal Circle"
    ];

    if (!allowedMemberships.includes(membership)) {
        return res.status(400).json({
            success: false,
            message: "Invalid membership selection."
        });
    }

    try {

        const statement = db.prepare(`
            UPDATE members
            SET membership_tier = ?
            WHERE id = ?
        `);

        statement.run(membership, member.id);

        member.membershipTier = membership;

        sessions.set(token, member);

        res.json({
            success: true,
            message: "Membership updated successfully.",
            membershipTier: membership
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to update membership."
        });
    }
});
// ADMIN - VIEW MEMBERS

app.get("/api/admin/members", (req, res) => {
const adminToken =
        req.headers.authorization;

    if (!adminToken ||
        !adminSessions.has(adminToken)) {

        return res.status(401).json({
            success: false,
            message: "Admin authentication required."
        });

    }
    try {

        const statement = db.prepare(`
            SELECT
                id,
                full_name,
                email,
                membership_tier,
                created_at
            FROM members
            ORDER BY created_at DESC
        `);

        const members = statement.all();

        res.json({
            success: true,
            members: members
        });

    } catch (error) {

        console.error(
            "ADMIN MEMBERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load members."
        });

    }

});
// EVENT INTEREST

app.post("/api/event-interest", (req, res) => {

    const token = req.headers.authorization;
    const { event } = req.body;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    const member = sessions.get(token);

    if (!member) {
        return res.status(401).json({
            success: false,
            message: "Your session has expired."
        });
    }

    if (!event) {
        return res.status(400).json({
            success: false,
            message: "Event information is required."
        });
    }

    try {

        const statement = db.prepare(`
            INSERT INTO event_interests
            (member_id, event_name)
            VALUES (?, ?)
        `);

        statement.run(
            member.id,
            event
        );

        res.json({
            success: true,
            message: "Interest recorded successfully."
        });

    } catch (error) {

        if (error.message.includes("UNIQUE")) {
            return res.status(409).json({
                success: false,
                message: "You have already expressed interest in this event."
            });
        }

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to record your interest."
        });
    }
}),
// ADMIN - VIEW EVENT INTERESTS

app.get("/api/admin/event-interests", (req, res) => {
const adminToken =
        req.headers.authorization;

    if (!adminToken ||
        !adminSessions.has(adminToken)) {

        return res.status(401).json({
            success: false,
            message: "Admin authentication required."
        });

    }
    try {

        const statement = db.prepare(`
            SELECT
                event_interests.id,
                members.full_name,
                members.email,
                event_interests.event_name,
                event_interests.created_at
            FROM event_interests
            JOIN members
                ON event_interests.member_id = members.id
            ORDER BY event_interests.created_at DESC
        `);

        const interests = statement.all();

        res.json({
            success: true,
            interests: interests
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load event interests."
        });
    }

}),
// ========================================
// ADMIN LOGIN
// ========================================

app.post("/api/admin/login", (req, res) => {

    const { username, password } = req.body;

    // Development credentials
    // Change these before production.
    const ADMIN_USERNAME =
    process.env.ADMIN_USERNAME;

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD;

    if (
        username !== ADMIN_USERNAME ||
        password !== ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid admin credentials."
        });
    }

    const adminToken =
        crypto.randomBytes(32).toString("hex");

    adminSessions.set(adminToken, {
        username: ADMIN_USERNAME
    });

    res.json({
        success: true,
        message: "Admin login successful.",
        token: adminToken
    });

});
// ========================================
// PAYMENT REQUEST
// ========================================

app.post("/api/payment-request", (req, res) => {

    const token = req.headers.authorization;
    const { membership } = req.body;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    const member = sessions.get(token);

    if (!member) {
        return res.status(401).json({
            success: false,
            message: "Your session has expired."
        });
    }

    const allowedMemberships = [
        "Loyalty Seal",
        "Trust Bond",
        "Eternal Circle"
    ];

    if (!allowedMemberships.includes(membership)) {
        return res.status(400).json({
            success: false,
            message: "Invalid membership."
        });
    }

    try {

        const existing = db.prepare(`
            SELECT id
            FROM payment_requests
            WHERE member_id = ?
            AND membership = ?
            AND status = 'Pending'
        `).get(member.id, membership);

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "A payment request is already pending."
            });
        }

        const statement = db.prepare(`
            INSERT INTO payment_requests
            (member_id, membership)
            VALUES (?, ?)
        `);

        statement.run(
            member.id,
            membership
        );

        res.json({
            success: true,
            message: "Payment confirmation request sent to the admin."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to submit payment request."
        });
    }
});

// ========================================
// ADMIN - PAYMENT REQUESTS
// ========================================

app.get("/api/admin/payment-requests", (req, res) => {

    const adminToken =
        req.headers.authorization;

    if (
        !adminToken ||
        !adminSessions.has(adminToken)
    ) {
        return res.status(401).json({
            success: false,
            message: "Admin authentication required."
        });
    }

    try {

        const statement = db.prepare(`
            SELECT
                payment_requests.id,
                members.full_name,
                members.email,
                payment_requests.membership,
                payment_requests.status,
                payment_requests.created_at,
                payment_requests.confirmed_at
            FROM payment_requests
            JOIN members
                ON payment_requests.member_id = members.id
            ORDER BY payment_requests.created_at DESC
        `);

        const requests = statement.all();

        res.json({
            success: true,
            requests: requests
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load payment requests."
        });
    }
});
// ========================================
// ADMIN - CONFIRM PAYMENT
// ========================================

app.post("/api/admin/confirm-payment", (req, res) => {

    const adminToken =
        req.headers.authorization;

    const { requestId } = req.body;

    if (
        !adminToken ||
        !adminSessions.has(adminToken)
    ) {
        return res.status(401).json({
            success: false,
            message: "Admin authentication required."
        });
    }

    if (!requestId) {
        return res.status(400).json({
            success: false,
            message: "Payment request ID is required."
        });
    }

    try {

        const request = db.prepare(`
            SELECT *
            FROM payment_requests
            WHERE id = ?
        `).get(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Payment request not found."
            });
        }

        db.prepare(`
            UPDATE payment_requests
            SET status = 'Confirmed',
                confirmed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(requestId);

        db.prepare(`
            UPDATE members
            SET membership = ?
            WHERE id = ?
        `).run(
            request.membership,
            request.member_id
        );

        res.json({
            success: true,
            message: "Payment confirmed successfully."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to confirm payment."
        });
    }
});

// ========================================
// MEMBER PAYMENT STATUS
// ========================================

app.get("/api/payment-status", (req, res) => {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    const member = sessions.get(token);

    if (!member) {
        return res.status(401).json({
            success: false,
            message: "Session expired or invalid."
        });
    }

    try {

        const payment = db.prepare(`
            SELECT
                membership,
                status,
                created_at,
                confirmed_at
            FROM payment_requests
            WHERE member_id = ?
            ORDER BY id DESC
            LIMIT 1
        `).get(member.id);

        res.json({
            success: true,
            payment: payment || null
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load payment status."
        });
    }
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Inner Circle server running on http://localhost:${PORT}`
    );
})