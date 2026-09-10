require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const path = require("path");
const crypto = require("crypto");

const database = require("./database");

const pool = database.pool;
const initDatabase = database.initDatabase;

const app = express();

const sessions = new Map();
const adminSessions = new Map();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "..")));


// ========================================
// STATUS
// ========================================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "Inner Circle backend is running."
    });
});


// ========================================
// MEMBER REGISTRATION
// ========================================

app.post("/api/register", async (req, res) => {

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

        const salt = crypto.randomBytes(16).toString("hex");

        const hash = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

        const passwordHash = `${salt}:${hash}`;

        await pool.query(
            `
            INSERT INTO members
            (full_name, email, password_hash, membership_tier)
            VALUES ($1, $2, $3, $4)
            `,
            [
                fullName,
                email,
                passwordHash,
                membershipTier || "Loyalty Seal"
            ]
        );

        res.json({
            success: true,
            message: "Member registered successfully."
        });

    } catch (error) {

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        console.error("REGISTRATION ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});


// ========================================
// MEMBER LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM members
            WHERE email = $1
            `,
            [email]
        );

        const member = result.rows[0];

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

        const sessionToken =
            crypto.randomBytes(32).toString("hex");

        sessions.set(sessionToken, {
            id: member.id,
            fullName: member.full_name,
            email: member.email,
            membership: member.membership,
            membershipTier: member.membership_tier,
            createdAt: member.created_at
        });
await pool.query(`
    INSERT INTO sessions
    (token, member_id)
    VALUES ($1, $2)
    ON CONFLICT (token) DO NOTHING
`, [sessionToken, member.id]);
        res.json({
            success: true,
            message: "Login successful.",
            token: sessionToken,

            member: {
                id: member.id,
                fullName: member.full_name,
                email: member.email,
                membership: member.membership,
                membershipTier: member.membership_tier,
                createdAt: member.created_at
            }
        });

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});


// ========================================
// CURRENT MEMBER
// ========================================

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


// ========================================
// UPDATE MEMBERSHIP
// ========================================

app.post("/api/membership", async (req, res) => {

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

        await pool.query(
            `
            UPDATE members
            SET membership = $1,
                membership_tier = $1
            WHERE id = $2
            `,
            [membership, member.id]
        );

        member.membership = membership;
        member.membershipTier = membership;

        sessions.set(token, member);

        res.json({
            success: true,
            message: "Membership updated successfully.",
            membership: membership
        });

    } catch (error) {

        console.error("MEMBERSHIP ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update membership."
        });
    }
});


// ========================================
// ADMIN LOGIN
// ========================================

app.post("/api/admin/login", async (req, res) => {

    const { username, password } = req.body;

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
await pool.query(`
    INSERT INTO admin_sessions
    (token, username)
    VALUES ($1, $2)
    ON CONFLICT (token) DO NOTHING
`, [adminToken, ADMIN_USERNAME]);
    res.json({
        success: true,
        message: "Admin login successful.",
        token: adminToken
    });
});


// ========================================
// ADMIN - VIEW MEMBERS
// ========================================

app.get("/api/admin/members", async (req, res) => {

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

        const result = await pool.query(
            `
            SELECT
                id,
                full_name,
                email,
                membership,
                membership_tier,
                created_at
            FROM members
            ORDER BY created_at DESC
            `
        );

        res.json({
            success: true,
            members: result.rows
        });

    } catch (error) {

        console.error("ADMIN MEMBERS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load members."
        });
    }
});


// ========================================
// EVENT INTEREST
// ========================================

app.post("/api/event-interest", async (req, res) => {

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

        await pool.query(
            `
            INSERT INTO event_interests
            (member_id, event_name)
            VALUES ($1, $2)
            `,
            [member.id, event]
        );

        res.json({
            success: true,
            message: "Interest recorded successfully."
        });

    } catch (error) {

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "You have already expressed interest in this event."
            });
        }

        console.error("EVENT INTEREST ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to record your interest."
        });
    }
});


// ========================================
// ADMIN - EVENT INTERESTS
// ========================================

app.get("/api/admin/event-interests", async (req, res) => {

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

        const result = await pool.query(
            `
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
            `
        );

        res.json({
            success: true,
            interests: result.rows
        });

    } catch (error) {

        console.error("EVENT INTERESTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load event interests."
        });
    }
});


// ========================================
// PAYMENT REQUEST
// ========================================

app.post("/api/payment-request", async (req, res) => {

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

        const existingResult = await pool.query(
            `
            SELECT id
            FROM payment_requests
            WHERE member_id = $1
            AND membership = $2
            AND status = 'Pending'
            `,
            [member.id, membership]
        );

        const existing = existingResult.rows[0];

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "A payment request is already pending."
            });
        }

        await pool.query(
            `
            INSERT INTO payment_requests
            (member_id, membership)
            VALUES ($1, $2)
            `,
            [member.id, membership]
        );

        res.json({
            success: true,
            message: "Payment confirmation request sent to the admin."
        });

    } catch (error) {

        console.error("PAYMENT REQUEST ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to submit payment request."
        });
    }
});


// ========================================
// ADMIN - PAYMENT REQUESTS
// ========================================

app.get("/api/admin/payment-requests", async (req, res) => {

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

        const result = await pool.query(
            `
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
            `
        );

        res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {

        console.error("PAYMENT REQUESTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load payment requests."
        });
    }
});


// ========================================
// ADMIN - CONFIRM PAYMENT
// ========================================

app.post("/api/admin/confirm-payment", async (req, res) => {

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

        const requestResult = await pool.query(
            `
            SELECT *
            FROM payment_requests
            WHERE id = $1
            `,
            [requestId]
        );

        const request = requestResult.rows[0];

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Payment request not found."
            });
        }

        await pool.query(
            `
            UPDATE payment_requests
            SET status = 'Confirmed',
                confirmed_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [requestId]
        );

        await pool.query(
            `
            UPDATE members
            SET membership = $1,
                membership_tier = $1
            WHERE id = $2
            `,
            [request.membership, request.member_id]
        );

        res.json({
            success: true,
            message: "Payment confirmed successfully."
        });

    } catch (error) {

        console.error("CONFIRM PAYMENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to confirm payment."
        });
    }
});


// ========================================
// MEMBER PAYMENT STATUS
// ========================================

app.get("/api/payment-status", async (req, res) => {

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

        const paymentResult = await pool.query(
            `
            SELECT
                membership,
                status,
                created_at,
                confirmed_at
            FROM payment_requests
            WHERE member_id = $1
            ORDER BY id DESC
            LIMIT 1
            `,
            [member.id]
        );

        const payment = paymentResult.rows[0];

        res.json({
            success: true,
            payment: payment || null
        });

    } catch (error) {

        console.error("PAYMENT STATUS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load payment status."
        });
    }
});

// ========================================
// RESTORE SESSIONS FROM DATABASE
// ========================================

async function restoreSessions() {

    const memberSessions = await pool.query(`
        SELECT
            sessions.token,
            members.id,
            members.full_name,
            members.email,
            members.membership,
            members.membership_tier,
            members.created_at
        FROM sessions
        JOIN members
            ON sessions.member_id = members.id
    `);

    for (const member of memberSessions.rows) {

        sessions.set(member.token, {
            id: member.id,
            fullName: member.full_name,
            email: member.email,
            membership: member.membership,
            membershipTier: member.membership_tier,
            createdAt: member.created_at
        });
    }

    const adminResult = await pool.query(`
        SELECT token, username
        FROM admin_sessions
    `);

    for (const admin of adminResult.rows) {

        adminSessions.set(admin.token, {
            username: admin.username
        });
    }

    console.log(
        `Restored ${memberSessions.rows.length} member session(s).`
    );

    console.log(
        `Restored ${adminResult.rows.length} admin session(s).`
    );
}

// ========================================
// START SERVER
// ========================================

initDatabase()
    .then(async () => {

        await restoreSessions();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `Inner Circle server running on port ${PORT}`
            );
        });

    })
    .catch((error) => {

        console.error(
            "Database initialization failed:",
            error
        );

    });