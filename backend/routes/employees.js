const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.username, u.role_id, ar.name as role, u.name, u.email, u.phone, u.created_at,
                   GROUP_CONCAT(ub.branch_id) as branch_ids
            FROM users u 
            LEFT JOIN access_roles ar ON u.role_id = ar.id
            LEFT JOIN user_branches ub ON u.id = ub.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        // Format branch_ids to array
        const formattedRows = rows.map(r => ({
            ...r,
            branch_ids: r.branch_ids ? String(r.branch_ids).split(',').map(Number) : []
        }));
        res.json(formattedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { username, pin, role_id, name, email, phone, branch_ids } = req.body;
        const pin_hash = pin; 
        
        const [result] = await pool.query(
            'INSERT INTO users (username, pin_hash, role_id, name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [username, pin_hash, role_id, name, email, phone]
        );
        
        if (branch_ids && branch_ids.length > 0) {
            const values = branch_ids.map(id => [result.insertId, id]);
            await pool.query('INSERT INTO user_branches (user_id, branch_id) VALUES ?', [values]);
        }
        
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { username, pin, role_id, name, email, phone, branch_ids } = req.body;
        const userId = req.params.id;
        
        let query = 'UPDATE users SET username=?, role_id=?, name=?, email=?, phone=? WHERE id=?';
        let params = [username, role_id, name, email, phone, userId];

        if (pin) {
            query = 'UPDATE users SET username=?, pin_hash=?, role_id=?, name=?, email=?, phone=? WHERE id=?';
            params = [username, pin, role_id, name, email, phone, userId];
        }

        await pool.query(query, params);
        
        // Update branches
        await pool.query('DELETE FROM user_branches WHERE user_id = ?', [userId]);
        if (branch_ids && branch_ids.length > 0) {
            const values = branch_ids.map(id => [userId, id]);
            await pool.query('INSERT INTO user_branches (user_id, branch_id) VALUES ?', [values]);
        }
        
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
