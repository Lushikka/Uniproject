require('dotenv').config(); // Load .env variables
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection using Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test database connection
(async () => {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log('Database connected! Current time:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('Database connection error:', err);
    }
})();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
}));
app.use(bodyParser.json());

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Admin login
app.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM canteen_admins WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: 'Login successful',
                userData: {
                    id: result.rows[0].id,
                    username: result.rows[0].username,
                    canteenName: result.rows[0].canteen_name,
                },
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error occurred during login', error: err.message });
    }
});

// Super admin login
app.post('/super-admin-login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM super_admin WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: 'Super admin login successful',
                userData: {
                    id: result.rows[0].id,
                    username: result.rows[0].username,
                },
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid super admin credentials' });
        }
    } catch (err) {
        console.error('Super admin login error:', err);
        res.status(500).json({ success: false, message: 'Server error occurred during login', error: err.message });
    }
});

// Menu endpoints
app.post('/add-menu-item', async (req, res) => {
    const { item_name, price, type, status, canteen_id } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO menu_items (item_name, price, type, status, canteen_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [item_name, price, type, status, canteen_id]
        );

        res.json({ success: true, message: 'Menu item added successfully', item: result.rows[0] });
    } catch (err) {
        console.error('Error adding menu item:', err);
        res.status(500).json({ success: false, message: 'Failed to add menu item', error: err.message });
    }
});

app.get('/menu-items', async (req, res) => {
    const { canteen_id } = req.query;
    try {
        const params = [];
        let sql = 'SELECT * FROM menu_items';
        if (canteen_id) {
            sql += ' WHERE canteen_id = $1';
            params.push(canteen_id);
        }
        sql += ' ORDER BY id DESC';

        const result = await pool.query(sql, params);

        const statsSql = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'Available' THEN 1 END) as available,
                COUNT(CASE WHEN status = 'Unavailable' THEN 1 END) as unavailable
            FROM menu_items ${canteen_id ? 'WHERE canteen_id = $1' : ''}`;
        const stats = await pool.query(statsSql, params);

        res.json({ success: true, items: result.rows, stats: stats.rows[0] });
    } catch (err) {
        console.error('Error fetching menu items:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update menu item
app.put('/menu-items/:id', async (req, res) => {
    const { id } = req.params;
    const { item_name, price, type, status } = req.body;

    try {
        const result = await pool.query(
            `UPDATE menu_items 
             SET item_name = $1, price = $2, type = $3, status = $4
             WHERE id = $5 RETURNING *`,
            [item_name, price, type, status, id]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, item: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (err) {
        console.error('Error updating menu item:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Toggle menu item status
app.patch('/menu-items/:id/toggle', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE menu_items 
             SET status = CASE WHEN status = 'Available' THEN 'Unavailable' ELSE 'Available' END
             WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, item: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (err) {
        console.error('Error toggling item status:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete menu item
app.delete('/menu-items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Item deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single menu item
app.get('/menu-items/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM menu_items WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json({ success: true, item: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Item not found' });
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// 500 handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
});

