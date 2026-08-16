const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'db', 'data.json');

// Helper function to read DB
async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, create it with default structure
      const defaultData = { totalBudget: 50000, monthlyBudgets: {}, expenses: [], trips: { members: [], expenses: [] } };
      // Ensure the 'db' directory exists
      await fs.mkdir(path.dirname(dbPath), { recursive: true });
      await writeDB(defaultData);
      return defaultData;
    }
    throw error;
  }
}

// Helper function to write DB
async function writeDB(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Aura API Backend (Local JSON DB)!' });
});

// GET: Fetch budget and expenses
app.get('/api/budget', async (req, res) => {
  try {
    const data = await readDB();
    res.json(data);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Update total budget
app.post('/api/budget', async (req, res) => {
  const { totalBudget, month } = req.body;
  if (totalBudget === undefined) {
    return res.status(400).json({ error: 'Total budget is required' });
  }

  try {
    const data = await readDB();
    if (!data.monthlyBudgets) data.monthlyBudgets = {};
    
    const numBudget = Number(totalBudget);
    if (month) {
      data.monthlyBudgets[month] = numBudget;
    }
    // Update the fallback global budget
    data.totalBudget = numBudget;
    
    await writeDB(data);
    res.json({ message: 'Budget updated successfully', monthlyBudgets: data.monthlyBudgets });
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Add new expense
app.post('/api/expenses', async (req, res) => {
  const { name, amount } = req.body;
  if (!name || amount === undefined) {
    return res.status(400).json({ error: 'Name and amount are required' });
  }

  const id = Date.now().toString();
  const numAmount = Number(amount);
  const newExpense = { id, name, amount: numAmount };

  try {
    const data = await readDB();
    data.expenses.push(newExpense);
    await writeDB(data);
    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Remove an expense
app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await readDB();
    data.expenses = data.expenses.filter(e => e.id !== id);
    await writeDB(data);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Update trips members
app.post('/api/trips/members', async (req, res) => {
  const { members } = req.body;
  try {
    const data = await readDB();
    if (!data.trips) data.trips = { members: [], expenses: [] };
    data.trips.members = members || [];
    await writeDB(data);
    res.json({ message: 'Members updated successfully' });
  } catch (err) {
    console.error('Error updating members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Add new trip expense
app.post('/api/trips/expenses', async (req, res) => {
  const { description, amount, paidBy } = req.body;
  if (!description || amount === undefined || !paidBy) {
    return res.status(400).json({ error: 'Description, amount and paidBy are required' });
  }

  const id = Date.now().toString();
  const numAmount = Number(amount);
  const newExpense = { id, description, amount: numAmount, paidBy };

  try {
    const data = await readDB();
    if (!data.trips) data.trips = { members: [], expenses: [] };
    data.trips.expenses.push(newExpense);
    await writeDB(data);
    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Error adding trip expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update a trip expense
app.put('/api/trips/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (amount === undefined) return res.status(400).json({ error: 'Amount is required' });

  try {
    const data = await readDB();
    if (data.trips && data.trips.expenses) {
      const expenseIndex = data.trips.expenses.findIndex(e => e.id === id);
      if (expenseIndex !== -1) {
        data.trips.expenses[expenseIndex].amount = Number(amount);
        await writeDB(data);
        return res.json(data.trips.expenses[expenseIndex]);
      }
    }
    res.status(404).json({ error: 'Expense not found' });
  } catch (err) {
    console.error('Error updating trip expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Remove a trip expense
app.delete('/api/trips/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await readDB();
    if (data.trips) {
      data.trips.expenses = data.trips.expenses.filter(e => e.id !== id);
      await writeDB(data);
    }
    res.json({ message: 'Trip expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting trip expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Fetch all splitwise trips
app.get('/api/splitwise', async (req, res) => {
  try {
    const data = await readDB();
    if (!data.splitwiseTrips) {
      data.splitwiseTrips = [];
      await writeDB(data);
    }
    res.json(data.splitwiseTrips);
  } catch (err) {
    console.error('Error fetching trips:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Create a new trip
app.post('/api/splitwise', async (req, res) => {
  const { name, date } = req.body;
  if (!name) return res.status(400).json({ error: 'Trip name is required' });

  const formattedDate = date ? date : new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const newTrip = { 
    id: Date.now().toString(), 
    name, 
    date: formattedDate,
    createdAt: new Date().toISOString(),
    members: [], 
    expenses: [] 
  };
  try {
    const data = await readDB();
    if (!data.splitwiseTrips) data.splitwiseTrips = [];
    data.splitwiseTrips.push(newTrip);
    await writeDB(data);
    res.status(201).json(newTrip);
  } catch (err) {
    console.error('Error creating trip:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Update trip members
app.post('/api/splitwise/:tripId/members', async (req, res) => {
  const { tripId } = req.params;
  const { members } = req.body;
  try {
    const data = await readDB();
    const trip = data.splitwiseTrips?.find(t => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    
    trip.members = members || [];
    await writeDB(data);
    res.json(trip);
  } catch (err) {
    console.error('Error updating members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Settle trip
app.post('/api/splitwise/:tripId/settle', async (req, res) => {
  const { tripId } = req.params;
  const { isSettled } = req.body;
  try {
    const data = await readDB();
    const trip = data.splitwiseTrips?.find(t => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    
    trip.isSettled = !!isSettled;
    await writeDB(data);
    res.json(trip);
  } catch (err) {
    console.error('Error settling trip:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Add new trip expense
app.post('/api/splitwise/:tripId/expenses', async (req, res) => {
  const { tripId } = req.params;
  const { description, amount, paidBy } = req.body;
  if (!description || amount === undefined || !paidBy) {
    return res.status(400).json({ error: 'Description, amount and paidBy are required' });
  }

  const id = Date.now().toString();
  const newExpense = { id, description, amount: Number(amount), paidBy };

  try {
    const data = await readDB();
    const trip = data.splitwiseTrips?.find(t => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    
    trip.historicalTotal = (trip.historicalTotal ?? trip.expenses.reduce((a, b) => a + b.amount, 0)) + newExpense.amount;
    trip.expenses.push(newExpense);
    await writeDB(data);
    res.status(201).json({ newExpense, historicalTotal: trip.historicalTotal });
  } catch (err) {
    console.error('Error adding trip expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update a trip expense
app.put('/api/splitwise/:tripId/expenses/:expId', async (req, res) => {
  const { tripId, expId } = req.params;
  const { amount } = req.body;
  if (amount === undefined) return res.status(400).json({ error: 'Amount is required' });

  try {
    const data = await readDB();
    const trip = data.splitwiseTrips?.find(t => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    
    const exp = trip.expenses.find(e => e.id === expId);
    if (!exp) return res.status(404).json({ error: 'Expense not found' });
    
    const diff = Number(amount) - exp.amount;
    trip.historicalTotal = (trip.historicalTotal ?? trip.expenses.reduce((a, b) => a + b.amount, 0)) + diff;
    exp.amount = Number(amount);
    
    await writeDB(data);
    res.json({ updatedExp: exp, historicalTotal: trip.historicalTotal });
  } catch (err) {
    console.error('Error updating trip expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Remove a trip expense
app.delete('/api/splitwise/:tripId/expenses/:expId', async (req, res) => {
  const { tripId, expId } = req.params;
  try {
    const data = await readDB();
    const trip = data.splitwiseTrips?.find(t => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    
    // Set historicalTotal to current sum if not exists, but do NOT subtract the deleted expense
    trip.historicalTotal = trip.historicalTotal ?? trip.expenses.reduce((a, b) => a + b.amount, 0);
    trip.expenses = trip.expenses.filter(e => e.id !== expId);
    
    await writeDB(data);
    res.json({ message: 'Trip expense deleted successfully', historicalTotal: trip.historicalTotal });
  } catch (err) {
    console.error('Error deleting trip expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE: Clear all data
app.delete('/api/clear', async (req, res) => {
  try {
    const defaultData = { totalBudget: 50000, monthlyBudgets: {}, expenses: [], trips: { members: [], expenses: [] }, splitwiseTrips: [], settings: { theme: 'light', notifications: false, currency: 'INR' } };
    await writeDB(defaultData);
    res.json({ message: 'All data cleared successfully' });
  } catch (err) {
    console.error('Error clearing data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Fetch settings
app.get('/api/settings', async (req, res) => {
  try {
    const data = await readDB();
    res.json(data.settings || { theme: 'light', notifications: false, currency: 'INR' });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Update settings
app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  try {
    const data = await readDB();
    data.settings = { ...data.settings, ...settings };
    await writeDB(data);
    res.json(data.settings);
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
