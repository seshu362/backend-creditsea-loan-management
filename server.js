const express = require("express");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const app = express();
app.use(express.json());
app.use(cors());

// Database setup
let db;

async function initializeDatabase() {
  db = await sqlite.open({
    filename: "loan_manager.db",
    driver: sqlite3.Database
  });

  console.log("Connected to SQLite database");

  // Create tables for the application
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'verifier', 'user')) DEFAULT 'user',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS loan_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    fullName TEXT NOT NULL,
    amount REAL NOT NULL,
    tenure INTEGER NOT NULL,
    employmentStatus TEXT NOT NULL,
    reason TEXT NOT NULL,
    employmentAddress TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'verified')) DEFAULT 'pending',
    loanOfficerId INTEGER,
    disbursedDate TEXT,
    repaymentDate TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (loanOfficerId) REFERENCES users(id)
  )`);

  await db.exec(`CREATE TABLE IF NOT EXISTS repayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loanId INTEGER NOT NULL,
    amount REAL NOT NULL,
    paymentDate TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loanId) REFERENCES loan_applications(id)
  )`);

  // Seed initial data
  await seedDefaultUsers();
  await seedSampleLoans();
  await seedSampleRepayments();
}

// Seed default users (admin, verifier, and regular user)
async function seedDefaultUsers() {
  const count = await db.get(`SELECT COUNT(*) AS count FROM users`);
  
  if (count.count === 0) {
    const defaultUsers = [
      {
        fullName: "John Deo",
        email: "admin@loanmanager.com",
        password: "admin123",
        role: "admin"
      },
      {
        fullName: "John Okoh",
        email: "verifier@loanmanager.com",
        password: "verifier123",
        role: "verifier"
      },
      {
        fullName: "Regular User",
        email: "user@loanmanager.com",
        password: "user123",
        role: "user"
      }
    ];

    for (const user of defaultUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.run(
        `INSERT INTO users (fullName, email, password, role) VALUES (?, ?, ?, ?)`,
        [user.fullName, user.email, hashedPassword, user.role]
      );
    }
    console.log("Default users added successfully.");
  }
}

// Seed sample loan applications for demonstration
async function seedSampleLoans() {
  const count = await db.get(`SELECT COUNT(*) AS count FROM loan_applications`);
  
  if (count.count === 0) {
    const sampleLoans = [
      {
        userId: 3, // regular user
        fullName: "Tom Cruise",
        amount: 50000,
        tenure: 12,
        employmentStatus: "Employed",
        reason: "Home renovation",
        employmentAddress: "123 Hollywood Blvd, Los Angeles",
        status: "pending",
        createdAt: "2021-06-09"
      },
      {
        userId: 3,
        fullName: "Robert Downey",
        amount: 60000,
        tenure: 24,
        employmentStatus: "Employed",
        reason: "When will I be charged this month?",
        employmentAddress: "789 Malibu, CA",
        status: "pending",
        createdAt: "2021-06-08"
      },
      {
        userId: 3,
        fullName: "Christian Bale",
        amount: 40000,
        tenure: 12,
        employmentStatus: "Self-employed",
        reason: "Payment not going through",
        employmentAddress: "101 Gotham City",
        status: "verified",
        loanOfficerId: 2,
        createdAt: "2021-06-08"
      },
      {
        userId: 3,
        fullName: "Henry Cavill",
        amount: 55000,
        tenure: 24,
        employmentStatus: "Employed",
        reason: "Unable to add replies",
        employmentAddress: "202 Metropolis",
        status: "approved",
        loanOfficerId: 2,
        createdAt: "2021-06-08"
      },
      {
        userId: 3,
        fullName: "Sam Smith",
        amount: 30000,
        tenure: 12,
        employmentStatus: "Self-employed",
        reason: "Referral Bonus",
        employmentAddress: "404 London, UK",
        status: "pending",
        createdAt: "2021-06-08"
      },
      {
        userId: 3,
        fullName: "Regular User",
        amount: 100000,
        tenure: 24,
        employmentStatus: "Self-employed",
        reason: "Business expansion",
        employmentAddress: "456 Main St, New York",
        status: "rejected",
        loanOfficerId: 2,
        createdAt: "2021-06-07"
      },
      {
        userId: 3,
        fullName: "Regular User",
        amount: 100000,
        tenure: 24,
        employmentStatus: "Self-employed",
        reason: "Business expansion",
        employmentAddress: "456 Main St, New York",
        status: "approved",
        loanOfficerId: 2,
        disbursedDate: "2021-05-27",
        repaymentDate: "2023-05-27",
        createdAt: "2021-05-27"
      }
    ];

    for (const loan of sampleLoans) {
      await db.run(
        `INSERT INTO loan_applications (
          userId, fullName, amount, tenure, employmentStatus, reason, 
          employmentAddress, status, loanOfficerId, disbursedDate, repaymentDate, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          loan.userId,
          loan.fullName,
          loan.amount,
          loan.tenure,
          loan.employmentStatus,
          loan.reason,
          loan.employmentAddress,
          loan.status,
          loan.loanOfficerId || null,
          loan.disbursedDate || null,
          loan.repaymentDate || null,
          loan.createdAt || null
        ]
      );
    }
    console.log("Sample loan applications added successfully.");
  }
}

// Seed sample repayments for demonstration
async function seedSampleRepayments() {
  const count = await db.get(`SELECT COUNT(*) AS count FROM repayments`);
  
  if (count.count === 0) {
    const sampleRepayments = [
      {
        loanId: 5, // Henry Cavill's loan
        amount: 10000,
        paymentDate: "2021-07-08",
        status: "completed"
      },
      {
        loanId: 6, // Chris Evans' loan
        amount: 15000,
        paymentDate: "2021-07-08",
        status: "completed"
      },
      {
        loanId: 10, // Regular User's approved loan
        amount: 25000,
        paymentDate: "2021-06-27",
        status: "completed"
      }
    ];

    for (const repayment of sampleRepayments) {
      await db.run(
        `INSERT INTO repayments (loanId, amount, paymentDate, status) VALUES (?, ?, ?, ?)`,
        [repayment.loanId, repayment.amount, repayment.paymentDate, repayment.status]
      );
    }
    console.log("Sample repayments added successfully.");
  }
}

// Helper function to generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, "your_jwt_secret_key", { expiresIn: "1h" });
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, "your_jwt_secret_key", (err, decoded) => {
    if (err) return res.status(400).json({ error: "Invalid token." });
    req.user = decoded;
    next();
  });
};

// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }
  next();
};

// Middleware to check if user has verifier role
const isVerifier = (req, res, next) => {
  if (req.user.role !== 'verifier' && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Verifier or admin role required." });
  }
  next();
};

// Authentication routes
// =======================================================================

// User Signup
app.post(
  "/signup",
  [
    body("fullName").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Invalid email"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { fullName, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.run(
        `INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)`,
        [fullName, email, hashedPassword]
      );

      res.status(201).json({ 
        id: result.lastID, 
        fullName, 
        email, 
        role: 'user' 
      });
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Email already exists" });
      } else {
        next(err);
      }
    }
  }
);

// User Login
app.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;

      const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);

      if (!user) return res.status(404).json({ error: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

      const token = generateToken(user.id, user.role);
      res.json({ 
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// User Dashboard & Loan Application routes
// =======================================================================

// Get loan application form details for User Dashboard - App Form
app.get("/loan-application-form", authenticateToken, async (req, res) => {
  res.json({
    fields: [
      { name: "fullName", label: "Full name as it appears on bank account", type: "text", required: true },
      { name: "amount", label: "How much do you need?", type: "number", required: true, min: 1000 },
      { name: "tenure", label: "Loan tenure (in months)", type: "number", required: true, min: 1 },
      { name: "employmentStatus", label: "Employment status", type: "select", required: true, 
        options: ["Employed", "Self-employed", "Unemployed", "Student", "Retired"] },
      { name: "reason", label: "Reason for loan", type: "textarea", required: true },
      { name: "employmentAddress", label: "Employment address", type: "text", required: true },
    ],
    terms: "I have read the important information and accept that by completing the application I will be bound by the terms. Additional credit information obtained may be disclosed from time to time to other lenders, credit bureaus or other credit reporting agencies."
  });
});

// Submit Loan Application - For User Dashboard - App Form
app.post(
  "/loans",
  authenticateToken,
  [
    body("fullName").notEmpty().withMessage("Full name is required"),
    body("amount").isFloat({ min: 1000 }).withMessage("Amount must be at least 1000"),
    body("tenure").isInt({ min: 1 }).withMessage("Tenure must be at least 1 month"),
    body("employmentStatus").notEmpty().withMessage("Employment status is required"),
    body("reason").notEmpty().withMessage("Reason for loan is required"),
    body("employmentAddress").notEmpty().withMessage("Employment address is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { fullName, amount, tenure, employmentStatus, reason, employmentAddress } = req.body;

      const result = await db.run(
        `INSERT INTO loan_applications (
          userId, fullName, amount, tenure, employmentStatus, reason, employmentAddress
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, fullName, amount, tenure, employmentStatus, reason, employmentAddress]
      );

      res.status(201).json({ 
        id: result.lastID,
        userId: req.user.id,
        fullName,
        amount,
        tenure,
        employmentStatus,
        reason,
        employmentAddress,
        status: 'pending'
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get user loans - For User Dashboard - Loans
app.get("/user/loans", authenticateToken, async (req, res, next) => {
  try {
    const loans = await db.all(
      `SELECT 
        la.*,
        u.fullName as loanOfficerName
       FROM loan_applications la
       LEFT JOIN users u ON la.loanOfficerId = u.id
       WHERE la.userId = ?
       ORDER BY la.createdAt DESC`,
      [req.user.id]
    );

    res.json(loans);
  } catch (err) {
    next(err);
  }
});

// Admin & Verifier Dashboard routes
// =======================================================================

// Get all loans - For Admin & Verifier Dashboard
app.get("/loans", authenticateToken, isVerifier, async (req, res, next) => {
  try {
    const loans = await db.all(
      `SELECT 
        la.*,
        u.fullName AS userFullName, 
        u.email AS userEmail,
        v.fullName AS verifierName
       FROM loan_applications la
       JOIN users u ON la.userId = u.id
       LEFT JOIN users v ON la.loanOfficerId = v.id
       ORDER BY la.createdAt DESC`
    );

    res.json(loans);
  } catch (err) {
    next(err);
  }
});

// Get recent loans - For Admin & Verifier Dashboard
app.get("/loans/recent", authenticateToken, isVerifier, async (req, res, next) => {
  try {
    const loans = await db.all(
      `SELECT 
        la.*,
        u.fullName as userFullName,
        u.email as userEmail,
        v.fullName as verifierName
       FROM loan_applications la
       JOIN users u ON la.userId = u.id
       LEFT JOIN users v ON la.loanOfficerId = v.id
       ORDER BY la.createdAt DESC
       LIMIT 20`
    );

    res.json(loans);
  } catch (err) {
    next(err);
  }
});

// Admin Dashboard Statistics
app.get("/dashboard/admin", authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const stats = await db.get(
      `SELECT 
        COUNT(DISTINCT users.id) AS activeUsers,
        COUNT(DISTINCT loan_applications.userId) AS borrowers,
        SUM(CASE WHEN loan_applications.status = 'approved' THEN loan_applications.amount ELSE 0 END) AS cashDisbursed,
        (SELECT SUM(amount) FROM repayments WHERE status = 'completed') AS cashReceived,
        (SELECT SUM(amount) FROM repayments WHERE status = 'completed') AS savings,
        COUNT(CASE WHEN loan_applications.status = 'approved' AND 
          (SELECT COUNT(*) FROM repayments WHERE repayments.loanId = loan_applications.id AND repayments.status = 'completed') > 0 
          THEN 1 ELSE NULL END) AS repaidLoans,
        COUNT(loan_applications.id) AS totalLoans,
        COUNT(CASE WHEN loan_applications.status != 'approved' AND loan_applications.status != 'rejected' 
          THEN 1 ELSE NULL END) AS otherAccounts
       FROM users
       LEFT JOIN loan_applications ON users.id = loan_applications.userId`
    );

    res.json({
      activeUsers: stats.activeUsers || 0,
      borrowers: stats.borrowers || 0,
      cashDisbursed: stats.cashDisbursed || 0,
      cashReceived: stats.cashReceived || 0,
      savings: stats.savings || 0,
      repaidLoans: stats.repaidLoans || 0,
      loans: stats.totalLoans || 0,
      otherAccounts: stats.otherAccounts || 0
    });
  } catch (err) {
    next(err);
  }
});

// Verifier Dashboard Statistics
app.get("/dashboard/verifier", authenticateToken, isVerifier, async (req, res, next) => {
  try {
    const stats = await db.get(
      `SELECT 
        COUNT(*) AS totalLoans,
        COUNT(DISTINCT userId) AS borrowers,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) AS cashDisbursed,
        (SELECT SUM(amount) FROM repayments WHERE status = 'completed') AS savings,
        COUNT(CASE WHEN status = 'approved' AND 
          (SELECT COUNT(*) FROM repayments WHERE repayments.loanId = loan_applications.id AND repayments.status = 'completed') > 0 
          THEN 1 ELSE NULL END) AS repaidLoans,
        (SELECT SUM(amount) FROM repayments WHERE status = 'completed') AS cashReceived
       FROM loan_applications`
    );

    res.json({
      loans: stats.totalLoans || 0,
      borrowers: stats.borrowers || 0,
      cashDisbursed: stats.cashDisbursed || 0,
      savings: stats.savings || 0,
      repaidLoans: stats.repaidLoans || 0,
      cashReceived: stats.cashReceived || 0
    });
  } catch (err) {
    next(err);
  }
});

// Verifier-only verify endpoint
app.put("/loans/:id/verify", authenticateToken, isVerifier, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.run(
      `UPDATE loan_applications SET 
        status = 'verified', 
        loanOfficerId = ? 
       WHERE id = ? AND status = 'pending'`,
      [req.user.id, id]
    );

    if (result.changes === 0) return res.status(400).json({ error: "Loan not found or not pending" });
    res.json({ message: "Loan verified successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin status update endpoint
app.put("/loans/:id/status", authenticateToken, isAdmin, [
  body("status").isIn(["approved", "rejected", "verified"]),
  body("disbursedDate").optional().isISO8601(),
  body("repaymentDate").optional().isISO8601()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, disbursedDate, repaymentDate } = req.body;
    
    // Get current loan status
    const loan = await db.get("SELECT status FROM loan_applications WHERE id = ?", [id]);
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    
    // Validate status transition
    if (status === "verified" && loan.status !== "pending") {
      return res.status(400).json({ error: "Only pending loans can be verified" });
    }

    const result = await db.run(
      `UPDATE loan_applications SET
        status = ?,
        loanOfficerId = ?,
        disbursedDate = ?,
        repaymentDate = ?
       WHERE id = ?`,
      [status, req.user.id, disbursedDate, repaymentDate, id]
    );

    if (result.changes === 0) return res.status(404).json({ error: "Loan not found" });
    res.json({ message: "Loan status updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();