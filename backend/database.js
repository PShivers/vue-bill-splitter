const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper to run column migrations safely
function addColumnIfNotExists(table, columnDefinition) {
  db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDefinition}`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      // Ignore error if column already exists
    }
  });
}

// Initialize database with tables and WAL mode for high concurrency
function initDatabase() {
  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA busy_timeout = 5000');

    // Roommates table
    db.run(`
      CREATE TABLE IF NOT EXISTS roommates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    addColumnIfNotExists('roommates', 'email TEXT');

    // Bills table
    db.run(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date TEXT,
        category TEXT DEFAULT 'other',
        notes TEXT,
        is_settled BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    addColumnIfNotExists('bills', "category TEXT DEFAULT 'other'");
    addColumnIfNotExists('bills', 'notes TEXT');
    addColumnIfNotExists('bills', 'is_settled BOOLEAN DEFAULT 0');

    // Bill assignments table
    db.run(`
      CREATE TABLE IF NOT EXISTS bill_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER,
        roommate_id INTEGER,
        is_paid BOOLEAN DEFAULT 0,
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE,
        FOREIGN KEY (roommate_id) REFERENCES roommates (id) ON DELETE CASCADE,
        UNIQUE(bill_id, roommate_id)
      )
    `);

    addColumnIfNotExists('bill_assignments', 'is_paid BOOLEAN DEFAULT 0');
    addColumnIfNotExists('bill_assignments', 'paid_at DATETIME');
  });
}

initDatabase();

module.exports = db;