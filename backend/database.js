const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database with tables
function initDatabase() {
  db.serialize(() => {
    // Create roommates table
    db.run(`
      CREATE TABLE IF NOT EXISTS roommates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bills table
    db.run(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bill_assignments table (junction table for many-to-many relationship)
    db.run(`
      CREATE TABLE IF NOT EXISTS bill_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER,
        roommate_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE,
        FOREIGN KEY (roommate_id) REFERENCES roommates (id) ON DELETE CASCADE,
        UNIQUE(bill_id, roommate_id)
      )
    `);
  });
}

initDatabase();

module.exports = db;