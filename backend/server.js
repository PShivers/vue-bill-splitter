const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- ROOMMATE ROUTES ---

app.get('/api/roommates', (req, res) => {
  db.all('SELECT * FROM roommates WHERE is_active = 1 ORDER BY name ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/roommates', (req, res) => {
  const { name, email } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.run('INSERT INTO roommates (name, email) VALUES (?, ?)', [name.trim(), email ? email.trim() : null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, name: name.trim(), email: email ? email.trim() : null, is_active: 1 });
  });
});

app.delete('/api/roommates/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE roommates SET is_active = 0 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Roommate deactivated successfully' });
  });
});

// Roommate breakdown: list all bills assigned to this roommate with shares
app.get('/api/roommates/:id/breakdown', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      b.id as bill_id,
      b.name as bill_name,
      b.amount as total_amount,
      b.due_date,
      b.category,
      b.notes,
      b.is_settled as bill_is_settled,
      ba.is_paid,
      ba.paid_at,
      (
        SELECT COUNT(*) 
        FROM bill_assignments ba2 
        JOIN roommates r2 ON ba2.roommate_id = r2.id 
        WHERE ba2.bill_id = b.id AND r2.is_active = 1
      ) as split_count,
      ROUND(b.amount / (
        SELECT COUNT(*) 
        FROM bill_assignments ba3 
        JOIN roommates r3 ON ba3.roommate_id = r3.id 
        WHERE ba3.bill_id = b.id AND r3.is_active = 1
      ), 2) as share_amount
    FROM bill_assignments ba
    JOIN bills b ON ba.bill_id = b.id
    JOIN roommates r ON ba.roommate_id = r.id
    WHERE ba.roommate_id = ? AND b.is_active = 1 AND r.is_active = 1
    ORDER BY b.due_date ASC, b.id DESC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get all roommate totals (both owed and paid)
app.get('/api/roommates/totals', (req, res) => {
  const query = `
    SELECT 
      r.id,
      r.name,
      r.email,
      COALESCE(SUM(
        CASE WHEN ba.is_paid = 0 THEN
          b.amount / (
            SELECT COUNT(*) 
            FROM bill_assignments ba2 
            JOIN roommates r2 ON ba2.roommate_id = r2.id 
            WHERE ba2.bill_id = b.id AND r2.is_active = 1
          )
        ELSE 0 END
      ), 0) as total_owed,
      COALESCE(SUM(
        CASE WHEN ba.is_paid = 1 THEN
          b.amount / (
            SELECT COUNT(*) 
            FROM bill_assignments ba2 
            JOIN roommates r2 ON ba2.roommate_id = r2.id 
            WHERE ba2.bill_id = b.id AND r2.is_active = 1
          )
        ELSE 0 END
      ), 0) as total_paid
    FROM roommates r
    LEFT JOIN bill_assignments ba ON r.id = ba.roommate_id
    LEFT JOIN bills b ON ba.bill_id = b.id AND b.is_active = 1
    WHERE r.is_active = 1
    GROUP BY r.id, r.name, r.email
    ORDER BY r.name ASC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Also include 'total' mapped to 'total_owed' for backwards compatibility
    const formatted = rows.map(r => ({
      ...r,
      total_owed: parseFloat(Number(r.total_owed).toFixed(2)),
      total_paid: parseFloat(Number(r.total_paid).toFixed(2)),
      total: parseFloat(Number(r.total_owed).toFixed(2))
    }));
    res.json(formatted);
  });
});

app.get('/api/roommates/:id/total', (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      COALESCE(SUM(
        CASE WHEN ba.is_paid = 0 THEN
          b.amount / (
            SELECT COUNT(*) 
            FROM bill_assignments ba2 
            JOIN roommates r2 ON ba2.roommate_id = r2.id 
            WHERE ba2.bill_id = b.id AND r2.is_active = 1
          )
        ELSE 0 END
      ), 0) as total_owed,
      COALESCE(SUM(
        CASE WHEN ba.is_paid = 1 THEN
          b.amount / (
            SELECT COUNT(*) 
            FROM bill_assignments ba2 
            JOIN roommates r2 ON ba2.roommate_id = r2.id 
            WHERE ba2.bill_id = b.id AND r2.is_active = 1
          )
        ELSE 0 END
      ), 0) as total_paid
    FROM bill_assignments ba
    JOIN bills b ON ba.bill_id = b.id
    JOIN roommates r ON ba.roommate_id = r.id
    WHERE ba.roommate_id = ? AND b.is_active = 1 AND r.is_active = 1
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const owed = row ? parseFloat(Number(row.total_owed).toFixed(2)) : 0;
    const paid = row ? parseFloat(Number(row.total_paid).toFixed(2)) : 0;
    res.json({ total_owed: owed, total_paid: paid, total: owed });
  });
});

// --- BILL ROUTES ---

app.get('/api/bills', (req, res) => {
  const query = `
    SELECT 
      b.*,
      COALESCE((
        SELECT json_group_array(
          json_object('roommate_id', r.id, 'name', r.name, 'is_paid', ba.is_paid)
        )
        FROM bill_assignments ba
        JOIN roommates r ON ba.roommate_id = r.id
        WHERE ba.bill_id = b.id AND r.is_active = 1
      ), '[]') as assignments_json
    FROM bills b
    WHERE b.is_active = 1
    ORDER BY b.due_date ASC, b.id DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const bills = rows.map(row => {
      let assignments = [];
      try {
        assignments = JSON.parse(row.assignments_json || '[]');
      } catch (e) {
        assignments = [];
      }
      const { assignments_json, ...rest } = row;
      return {
        ...rest,
        assignments,
        roommate_ids: assignments.map(a => a.roommate_id)
      };
    });
    res.json(bills);
  });
});

app.post('/api/bills', (req, res) => {
  const { name, amount, due_date, category, notes, roommate_ids } = req.body;

  if (!name || name.trim().length === 0 || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid name and amount are required' });
  }

  const billName = name.trim();
  const billAmount = parseFloat(amount);
  const billDueDate = due_date || null;
  const billCategory = category || 'other';
  const billNotes = notes ? notes.trim() : null;
  const ids = Array.isArray(roommate_ids) ? roommate_ids : [];

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      'INSERT INTO bills (name, amount, due_date, category, notes) VALUES (?, ?, ?, ?, ?)',
      [billName, billAmount, billDueDate, billCategory, billNotes],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        const billId = this.lastID;

        if (ids.length === 0) {
          db.run('COMMIT');
          return res.json({
            id: billId,
            name: billName,
            amount: billAmount,
            due_date: billDueDate,
            category: billCategory,
            notes: billNotes,
            is_settled: 0,
            is_active: 1,
            roommate_ids: []
          });
        }

        const stmt = db.prepare('INSERT OR IGNORE INTO bill_assignments (bill_id, roommate_id) VALUES (?, ?)');
        for (const rId of ids) {
          stmt.run(billId, rId);
        }
        stmt.finalize((stmtErr) => {
          if (stmtErr) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: stmtErr.message });
          }
          db.run('COMMIT');
          res.json({
            id: billId,
            name: billName,
            amount: billAmount,
            due_date: billDueDate,
            category: billCategory,
            notes: billNotes,
            is_settled: 0,
            is_active: 1,
            roommate_ids: ids
          });
        });
      }
    );
  });
});

app.put('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  const { name, amount, due_date, category, notes, roommate_ids } = req.body;

  if (!name || name.trim().length === 0 || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid name and amount are required' });
  }

  const billName = name.trim();
  const billAmount = parseFloat(amount);
  const billDueDate = due_date || null;
  const billCategory = category || 'other';
  const billNotes = notes ? notes.trim() : null;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      'UPDATE bills SET name = ?, amount = ?, due_date = ?, category = ?, notes = ? WHERE id = ? AND is_active = 1',
      [billName, billAmount, billDueDate, billCategory, billNotes, id],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        // If roommate_ids is provided, synchronize assignments
        if (Array.isArray(roommate_ids)) {
          // Keep payment status for existing assignments
          db.all('SELECT roommate_id, is_paid, paid_at FROM bill_assignments WHERE bill_id = ?', [id], (assignErr, existing) => {
            if (assignErr) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: assignErr.message });
            }

            const existingMap = new Map();
            existing.forEach(e => existingMap.set(e.roommate_id, e));

            db.run('DELETE FROM bill_assignments WHERE bill_id = ?', [id], (delErr) => {
              if (delErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: delErr.message });
              }

              if (roommate_ids.length === 0) {
                db.run('COMMIT');
                return res.json({
                  id: parseInt(id),
                  name: billName,
                  amount: billAmount,
                  due_date: billDueDate,
                  category: billCategory,
                  notes: billNotes,
                  is_active: 1,
                  roommate_ids: []
                });
              }

              const insertStmt = db.prepare(
                'INSERT INTO bill_assignments (bill_id, roommate_id, is_paid, paid_at) VALUES (?, ?, ?, ?)'
              );
              for (const rId of roommate_ids) {
                const prev = existingMap.get(rId);
                const isPaid = prev ? prev.is_paid : 0;
                const paidAt = prev ? prev.paid_at : null;
                insertStmt.run(id, rId, isPaid, paidAt);
              }
              insertStmt.finalize((finalizeErr) => {
                if (finalizeErr) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: finalizeErr.message });
                }
                db.run('COMMIT');
                res.json({
                  id: parseInt(id),
                  name: billName,
                  amount: billAmount,
                  due_date: billDueDate,
                  category: billCategory,
                  notes: billNotes,
                  is_active: 1,
                  roommate_ids
                });
              });
            });
          });
        } else {
          db.run('COMMIT');
          res.json({
            id: parseInt(id),
            name: billName,
            amount: billAmount,
            due_date: billDueDate,
            category: billCategory,
            notes: billNotes,
            is_active: 1
          });
        }
      }
    );
  });
});

app.delete('/api/bills/:id', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE bills SET is_active = 0 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Bill deactivated successfully' });
  });
});

// Toggle bill settled status
app.post('/api/bills/:id/toggle-settled', (req, res) => {
  const { id } = req.params;

  db.get('SELECT is_settled FROM bills WHERE id = ? AND is_active = 1', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Bill not found' });

    const newSettled = row.is_settled ? 0 : 1;

    db.serialize(() => {
      db.run('UPDATE bills SET is_settled = ? WHERE id = ?', [newSettled, id], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        // Also update all assignments to match
        const paidAtVal = newSettled ? new Date().toISOString() : null;
        db.run(
          'UPDATE bill_assignments SET is_paid = ?, paid_at = ? WHERE bill_id = ?',
          [newSettled, paidAtVal, id],
          (baErr) => {
            if (baErr) return res.status(500).json({ error: baErr.message });
            res.json({ is_settled: newSettled });
          }
        );
      });
    });
  });
});

// --- ASSIGNMENTS & SHARE SETTLEMENT ---

app.get('/api/bills/:billId/assignments', (req, res) => {
  const { billId } = req.params;

  const query = `
    SELECT ba.*, r.name as roommate_name, r.email as roommate_email
    FROM bill_assignments ba
    JOIN roommates r ON ba.roommate_id = r.id
    WHERE ba.bill_id = ? AND r.is_active = 1
    ORDER BY r.name ASC
  `;

  db.all(query, [billId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/bills/:billId/assign/:roommateId', (req, res) => {
  const { billId, roommateId } = req.params;

  db.run(
    'INSERT OR IGNORE INTO bill_assignments (bill_id, roommate_id) VALUES (?, ?)',
    [billId, roommateId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Bill assigned successfully' });
    }
  );
});

app.delete('/api/bills/:billId/assign/:roommateId', (req, res) => {
  const { billId, roommateId } = req.params;

  db.run(
    'DELETE FROM bill_assignments WHERE bill_id = ? AND roommate_id = ?',
    [billId, roommateId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Bill assignment removed successfully' });
    }
  );
});

// Toggle individual share payment status
app.post('/api/bills/:billId/assignments/:roommateId/toggle-paid', (req, res) => {
  const { billId, roommateId } = req.params;

  db.get(
    'SELECT is_paid FROM bill_assignments WHERE bill_id = ? AND roommate_id = ?',
    [billId, roommateId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Assignment not found' });

      const newPaid = row.is_paid ? 0 : 1;
      const paidAt = newPaid ? new Date().toISOString() : null;

      db.run(
        'UPDATE bill_assignments SET is_paid = ?, paid_at = ? WHERE bill_id = ? AND roommate_id = ?',
        [newPaid, paidAt, billId, roommateId],
        function(updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          // Check if all assigned roommates have now paid
          db.all(
            `SELECT ba.is_paid 
             FROM bill_assignments ba 
             JOIN roommates r ON ba.roommate_id = r.id 
             WHERE ba.bill_id = ? AND r.is_active = 1`,
            [billId],
            (allErr, assignRows) => {
              if (allErr) return res.status(500).json({ error: allErr.message });

              const allPaid = assignRows.length > 0 && assignRows.every(a => a.is_paid === 1);
              db.run('UPDATE bills SET is_settled = ? WHERE id = ?', [allPaid ? 1 : 0, billId], () => {
                res.json({ is_paid: newPaid, paid_at: paidAt, bill_is_settled: allPaid ? 1 : 0 });
              });
            }
          );
        }
      );
    }
  );
});

// --- DASHBOARD / STATS ---

app.get('/api/stats', (req, res) => {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM bills WHERE is_active = 1) as total_bills,
      (SELECT COALESCE(SUM(amount), 0) FROM bills WHERE is_active = 1) as total_amount,
      (SELECT COUNT(*) FROM roommates WHERE is_active = 1) as roommates_count,
      (
        SELECT COALESCE(SUM(
          b.amount / (
            SELECT COUNT(*) 
            FROM bill_assignments ba2 
            JOIN roommates r2 ON ba2.roommate_id = r2.id 
            WHERE ba2.bill_id = b.id AND r2.is_active = 1
          )
        ), 0)
        FROM bill_assignments ba
        JOIN bills b ON ba.bill_id = b.id
        JOIN roommates r ON ba.roommate_id = r.id
        WHERE b.is_active = 1 AND r.is_active = 1 AND ba.is_paid = 0
      ) as total_outstanding,
      (
        SELECT COALESCE(SUM(
          b.amount / (
            SELECT COUNT(*) 
            FROM bill_assignments ba2 
            JOIN roommates r2 ON ba2.roommate_id = r2.id 
            WHERE ba2.bill_id = b.id AND r2.is_active = 1
          )
        ), 0)
        FROM bill_assignments ba
        JOIN bills b ON ba.bill_id = b.id
        JOIN roommates r ON ba.roommate_id = r.id
        WHERE b.is_active = 1 AND r.is_active = 1 AND ba.is_paid = 1
      ) as total_settled,
      (
        SELECT COUNT(*) 
        FROM bills 
        WHERE is_active = 1 
          AND is_settled = 0 
          AND due_date IS NOT NULL 
          AND due_date <= date('now', '+7 days')
      ) as due_soon_count
  `;

  db.get(query, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      total_bills: row.total_bills || 0,
      total_amount: parseFloat(Number(row.total_amount).toFixed(2)),
      roommates_count: row.roommates_count || 0,
      total_outstanding: parseFloat(Number(row.total_outstanding).toFixed(2)),
      total_settled: parseFloat(Number(row.total_settled).toFixed(2)),
      due_soon_count: row.due_soon_count || 0
    });
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;