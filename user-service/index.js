const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('../shared/database');
const { authenticateToken } = require('./middleware/auth');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Get all users (protected)
app.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await database.query(
      'SELECT id, email, name, created_at, updated_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by id (protected)
app.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const users = await database.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (protected)
app.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email } = req.body;

    // Check if user exists
    const existingUser = await database.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    await database.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email, userId]
    );

    const updatedUser = await database.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?', 
      [userId]
    );

    res.json({
      message: 'User updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (protected)
app.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    const existingUser = await database.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await database.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'User Service is running' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 User Service running on port ${PORT}`);
});