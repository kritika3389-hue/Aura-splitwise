const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let db;

async function initDB() {
  try {
    // Ensure db folder exists
    await fs.mkdir(path.join(__dirname, 'db'), { recursive: true });

    // Initialize connection
    db = await open({
      filename: path.join(__dirname, 'db', 'aura_db.sqlite'),
      driver: sqlite3.Database
    });

    console.log('Connected to SQLite Database!');

    // Create Tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS global_settings (
        id INTEGER PRIMARY KEY,
        total_budget REAL DEFAULT 50000,
        theme TEXT DEFAULT 'light',
        notifications INTEGER DEFAULT 0,
        currency TEXT DEFAULT 'INR'
      )
    `);

    await db.run(`
      INSERT OR IGNORE INTO global_settings (id, total_budget, theme, notifications, currency)
      VALUES (1, 50000, 'light', 0, 'INR')
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS monthly_budgets (
        month TEXT PRIMARY KEY,
        amount REAL NOT NULL
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS splitwise_trips (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT,
        created_at TEXT,
        is_settled INTEGER DEFAULT 0,
        historical_total REAL DEFAULT 0
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS trip_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES splitwise_trips(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS trip_expenses (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        paid_by TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES splitwise_trips(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_name TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        trip_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // One-time Migration from data.json
    try {
      const existingTrips = await db.get('SELECT COUNT(*) as count FROM splitwise_trips');
      const existingExpenses = await db.get('SELECT COUNT(*) as count FROM expenses');

      if (existingTrips.count === 0 && existingExpenses.count === 0) {
        const jsonPath = path.join(__dirname, 'db', 'data.json');
        const fileData = await fs.readFile(jsonPath, 'utf8').catch(() => null);

        if (fileData) {
          const parsed = JSON.parse(fileData);
          console.log('Migrating initial records from data.json to SQLite...');

          if (parsed.totalBudget) {
            await db.run('UPDATE global_settings SET total_budget = ? WHERE id = 1', [parsed.totalBudget]);
          }

          if (parsed.settings?.theme) {
            await db.run('UPDATE global_settings SET theme = ? WHERE id = 1', [parsed.settings.theme]);
          }

          if (Array.isArray(parsed.expenses)) {
            for (const exp of parsed.expenses) {
              await db.run('INSERT OR IGNORE INTO expenses (id, name, amount) VALUES (?, ?, ?)', [exp.id, exp.name, exp.amount]);
            }
          }

          if (Array.isArray(parsed.splitwiseTrips)) {
            for (const trip of parsed.splitwiseTrips) {
              await db.run(
                'INSERT OR IGNORE INTO splitwise_trips (id, name, date, created_at, is_settled, historical_total) VALUES (?, ?, ?, ?, ?, ?)',
                [trip.id, trip.name, trip.date, trip.createdAt || new Date().toISOString(), trip.isSettled ? 1 : 0, trip.historicalTotal || 0]
              );

              if (Array.isArray(trip.members)) {
                for (const m of trip.members) {
                  await db.run('INSERT INTO trip_members (trip_id, member_name) VALUES (?, ?)', [trip.id, m]);
                }
              }

              if (Array.isArray(trip.expenses)) {
                for (const te of trip.expenses) {
                  await db.run('INSERT OR IGNORE INTO trip_expenses (id, trip_id, description, amount, paid_by) VALUES (?, ?, ?, ?, ?)', [te.id, trip.id, te.description, te.amount, te.paidBy]);
                }
              }
            }
          }
          console.log('Migration from data.json completed!');
        }
      }
    } catch (migErr) {
      console.warn('Migration note:', migErr.message);
    }

    console.log('SQLite Schema initialized successfully!');
  } catch (err) {
    console.error('SQLite Connection/Init Error:', err.message);
  }
}

initDB();

// ---------------- ROUTES ----------------

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Aura API Backend (SQLite Database)!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/budget', async (req, res) => {
  try {
    const settings = await db.get('SELECT total_budget FROM global_settings WHERE id = 1');
    const budgetRows = await db.all('SELECT * FROM monthly_budgets');
    const expenseRows = await db.all('SELECT id, name, amount FROM expenses ORDER BY id DESC');

    const monthlyBudgets = {};
    budgetRows.forEach(row => {
      monthlyBudgets[row.month] = row.amount;
    });

    res.json({
      totalBudget: settings?.total_budget || 50000,
      monthlyBudgets,
      expenses: expenseRows
    });
  } catch (err) {
    console.error('Error fetching budget:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/budget', async (req, res) => {
  const { totalBudget, month } = req.body;
  if (totalBudget === undefined) return res.status(400).json({ error: 'Total budget is required' });

  try {
    const numBudget = Number(totalBudget);
    await db.run('UPDATE global_settings SET total_budget = ? WHERE id = 1', [numBudget]);

    if (month) {
      await db.run(`
        INSERT INTO monthly_budgets (month, amount)
        VALUES (?, ?)
        ON CONFLICT(month) DO UPDATE SET amount = excluded.amount
      `, [month, numBudget]);
    }

    const budgetRows = await db.all('SELECT * FROM monthly_budgets');
    const monthlyBudgets = {};
    budgetRows.forEach(r => { monthlyBudgets[r.month] = r.amount; });

    res.json({ message: 'Budget updated successfully', monthlyBudgets });
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { name, amount } = req.body;
  if (!name || amount === undefined) return res.status(400).json({ error: 'Name and amount are required' });

  const id = Date.now().toString();
  const numAmount = Number(amount);

  try {
    await db.run('INSERT INTO expenses (id, name, amount) VALUES (?, ?, ?)', [id, name, numAmount]);
    res.status(201).json({ id, name, amount: numAmount });
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/splitwise', async (req, res) => {
  try {
    const trips = await db.all('SELECT * FROM splitwise_trips ORDER BY id DESC');
    const members = await db.all('SELECT * FROM trip_members');
    const expenses = await db.all('SELECT * FROM trip_expenses');

    const formatted = trips.map(t => {
      const tripMembers = members.filter(m => m.trip_id === t.id).map(m => m.member_name);
      const tripExpenses = expenses.filter(e => e.trip_id === t.id).map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        paidBy: e.paid_by
      }));
      return {
        id: t.id,
        name: t.name,
        date: t.date,
        createdAt: t.created_at,
        isSettled: !!t.is_settled,
        historicalTotal: t.historical_total || 0,
        members: tripMembers,
        expenses: tripExpenses
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching splitwise trips:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/splitwise', async (req, res) => {
  const { name, date } = req.body;
  if (!name) return res.status(400).json({ error: 'Trip name is required' });

  const id = Date.now().toString();
  const formattedDate = date ? date : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const createdAt = new Date().toISOString();

  try {
    await db.run(
      'INSERT INTO splitwise_trips (id, name, date, created_at, is_settled, historical_total) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, formattedDate, createdAt, 0, 0]
    );

    res.status(201).json({ id, name, date: formattedDate, createdAt, members: [], expenses: [], isSettled: false, historicalTotal: 0 });
  } catch (err) {
    console.error('Error creating trip:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/splitwise/:tripId/members', async (req, res) => {
  const { tripId } = req.params;
  const { members = [] } = req.body;

  try {
    await db.run('DELETE FROM trip_members WHERE trip_id = ?', [tripId]);
    for (const member of members) {
      await db.run('INSERT INTO trip_members (trip_id, member_name) VALUES (?, ?)', [tripId, member]);
    }

    const trip = await db.get('SELECT * FROM splitwise_trips WHERE id = ?', [tripId]);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    res.json({ ...trip, members, isSettled: !!trip.is_settled });
  } catch (err) {
    console.error('Error updating trip members:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/splitwise/:tripId/settle', async (req, res) => {
  const { tripId } = req.params;
  const { isSettled } = req.body;

  try {
    await db.run('UPDATE splitwise_trips SET is_settled = ? WHERE id = ?', [isSettled ? 1 : 0, tripId]);
    res.json({ success: true, isSettled: !!isSettled });
  } catch (err) {
    console.error('Error settling trip:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/splitwise/:tripId/expenses', async (req, res) => {
  const { tripId } = req.params;
  const { description, amount, paidBy, addedBy } = req.body;
  if (!description || amount === undefined || !paidBy) {
    return res.status(400).json({ error: 'Description, amount and paidBy are required' });
  }

  const id = Date.now().toString();
  const numAmount = Number(amount);

  try {
    await db.run(
      'INSERT INTO trip_expenses (id, trip_id, description, amount, paid_by) VALUES (?, ?, ?, ?, ?)',
      [id, tripId, description, numAmount, paidBy]
    );

    await db.run('UPDATE splitwise_trips SET historical_total = historical_total + ? WHERE id = ?', [numAmount, tripId]);
    const trip = await db.get('SELECT historical_total FROM splitwise_trips WHERE id = ?', [tripId]);

    try {
      const members = await db.all('SELECT member_name FROM trip_members WHERE trip_id = ?', [tripId]);
      for (const m of members) {
        if (addedBy && m.member_name !== addedBy) {
          await db.run('INSERT INTO notifications (recipient_name, message, trip_id) VALUES (?, ?, ?)', [m.member_name, `${addedBy} added an expense: ${description} for ₹${numAmount}`, tripId]);
        }
      }
    } catch(e) { console.error('Notification error', e); }

    res.status(201).json({
      newExpense: { id, description, amount: numAmount, paidBy },
      historicalTotal: trip?.historical_total || numAmount
    });
  } catch (err) {
    console.error('Error adding trip expense:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/splitwise/:tripId/expenses/:expId', async (req, res) => {
  const { tripId, expId } = req.params;
  const { amount, editedBy, description } = req.body;
  if (amount === undefined) return res.status(400).json({ error: 'Amount is required' });

  const numAmount = Number(amount);

  try {
    const existing = await db.get('SELECT amount FROM trip_expenses WHERE id = ? AND trip_id = ?', [expId, tripId]);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const diff = numAmount - existing.amount;
    await db.run('UPDATE trip_expenses SET amount = ? WHERE id = ? AND trip_id = ?', [numAmount, expId, tripId]);
    await db.run('UPDATE splitwise_trips SET historical_total = historical_total + ? WHERE id = ?', [diff, tripId]);

    const trip = await db.get('SELECT historical_total FROM splitwise_trips WHERE id = ?', [tripId]);

    try {
      if (editedBy) {
        const members = await db.all('SELECT member_name FROM trip_members WHERE trip_id = ?', [tripId]);
        for (const m of members) {
          if (m.member_name !== editedBy) {
            await db.run('INSERT INTO notifications (recipient_name, message, trip_id) VALUES (?, ?, ?)', [m.member_name, `${editedBy} updated the expense "${description || 'an expense'}" to ₹${numAmount}`, tripId]);
          }
        }
      }
    } catch(e) { console.error('Notification error', e); }

    res.json({
      updatedExp: { id: expId, amount: numAmount },
      historicalTotal: trip?.historical_total || 0
    });
  } catch (err) {
    console.error('Error updating trip expense:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/splitwise/:tripId/expenses/:expId', async (req, res) => {
  const { tripId, expId } = req.params;
  try {
    await db.run('DELETE FROM trip_expenses WHERE id = ? AND trip_id = ?', [expId, tripId]);
    const trip = await db.get('SELECT historical_total FROM splitwise_trips WHERE id = ?', [tripId]);
    res.json({ message: 'Trip expense deleted successfully', historicalTotal: trip?.historical_total || 0 });
  } catch (err) {
    console.error('Error deleting trip expense:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/clear', async (req, res) => {
  try {
    await db.run('DELETE FROM trip_expenses');
    await db.run('DELETE FROM trip_members');
    await db.run('DELETE FROM splitwise_trips');
    await db.run('DELETE FROM expenses');
    await db.run('DELETE FROM monthly_budgets');
    await db.run('UPDATE global_settings SET total_budget = 50000, theme = "light", notifications = 0, currency = "INR" WHERE id = 1');

    res.json({ message: 'All data cleared successfully' });
  } catch (err) {
    console.error('Error clearing data:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const row = await db.get('SELECT theme, notifications, currency FROM global_settings WHERE id = 1');
    res.json({
      theme: row?.theme || 'light',
      notifications: !!row?.notifications,
      currency: row?.currency || 'INR'
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/settings', async (req, res) => {
  const { theme, notifications, currency } = req.body;
  try {
    const updates = [];
    const values = [];
    if (theme !== undefined) { updates.push('theme = ?'); values.push(theme); }
    if (notifications !== undefined) { updates.push('notifications = ?'); values.push(notifications ? 1 : 0); }
    if (currency !== undefined) { updates.push('currency = ?'); values.push(currency); }

    if (updates.length > 0) {
      await db.run(`UPDATE global_settings SET ${updates.join(', ')} WHERE id = 1`, values);
    }
    const row = await db.get('SELECT theme, notifications, currency FROM global_settings WHERE id = 1');
    res.json({
      theme: row?.theme || 'light',
      notifications: !!row?.notifications,
      currency: row?.currency || 'INR'
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/notifications/:user', async (req, res) => {
  try {
    const notifs = await db.all('SELECT * FROM notifications WHERE recipient_name = ? ORDER BY id DESC LIMIT 50', [req.params.user]);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
