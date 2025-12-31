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

// Roommate routes
app.get('/api/roommates', (req, res) => {
  db.all('SELECT * FROM roommates WHERE is_active = 1', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/roommates', (req, res) => {
  const { name, email } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.run('INSERT INTO roommates (name, email) VALUES (?, ?)', [name.trim(), email || null], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name: name.trim(), email: email || null, is_active: 1 });
  });
});

app.delete('/api/roommates/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE roommates SET is_active = 0 WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Roommate deactivated successfully' });
  });
});

// Bill routes
app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills WHERE is_active = 1', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/bills', (req, res) => {
  const { name, amount, due_date } = req.body;
  
  if (!name || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Name and valid amount are required' });
  }

  db.run(
    'INSERT INTO bills (name, amount, due_date) VALUES (?, ?, ?)',
    [name.trim(), parseFloat(amount), due_date || null],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID, 
        name: name.trim(), 
        amount: parseFloat(amount),
        due_date: due_date || null,
        is_active: 1 
      });
    }
  );
});

app.put('/api/bills/:id', (req, res) => {
  const { id } = req.params;
  const { name, amount, due_date } = req.body;

  if (!name || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Name and valid amount are required' });
  }

  db.run(
    'UPDATE bills SET name = ?, amount = ?, due_date = ? WHERE id = ? AND is_active = 1',
    [name.trim(), parseFloat(amount), due_date || null, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        id: parseInt(id),
        name: name.trim(),
        amount: parseFloat(amount),
        due_date: due_date || null,
        is_active: 1
      });
    }
  );
});

app.delete('/api/bills/:id', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE bills SET is_active = 0 WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Bill deactivated successfully' });
  });
});

// Bill assignment routes
app.get('/api/bills/:billId/assignments', (req, res) => {
  const { billId } = req.params;
  
  const query = `
    SELECT ba.*, r.name as roommate_name 
    FROM bill_assignments ba
    JOIN roommates r ON ba.roommate_id = r.id
    WHERE ba.bill_id = ? AND r.is_active = 1
  `;
  
  db.all(query, [billId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
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
        res.status(500).json({ error: err.message });
        return;
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
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Bill assignment removed successfully' });
    }
  );
});

// Get roommate totals
app.get('/api/roommates/:id/total', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT COALESCE(SUM(b.amount / 
      (SELECT COUNT(*) FROM bill_assignments ba2 WHERE ba2.bill_id = b.id)
    ), 0) as total
    FROM bill_assignments ba
    JOIN bills b ON ba.bill_id = b.id
    WHERE ba.roommate_id = ? AND b.is_active = 1
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ total: row.total || 0 });
  });
});

// Get all roommate totals
app.get('/api/roommates/totals', (req, res) => {
  const query = `
    SELECT 
      r.id,
      r.name,
      COALESCE(SUM(b.amount / 
        (SELECT COUNT(*) FROM bill_assignments ba2 WHERE ba2.bill_id = b.id)
      ), 0) as total
    FROM roommates r
    LEFT JOIN bill_assignments ba ON r.id = ba.roommate_id
    LEFT JOIN bills b ON ba.bill_id = b.id AND b.is_active = 1
    WHERE r.is_active = 1
    GROUP BY r.id, r.name
    ORDER BY r.name
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});