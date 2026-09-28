const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all reservations for a branch, optionally filtered by status or date
router.get('/', async (req, res) => {
    try {
        const branchId = req.query.branch_id;
        let query = `
            SELECT r.*, t.name as table_name, t.area_id
            FROM table_reservations r
            JOIN tables t ON r.table_id = t.id
            WHERE 1=1
        `;
        const params = [];
        
        if (branchId) {
            query += ' AND r.branch_id = ?';
            params.push(branchId);
        }

        if (req.query.status) {
            query += ' AND r.status = ?';
            params.push(req.query.status);
        }

        query += ' ORDER BY r.reservation_time ASC';

        const [reservations] = await db.execute(query, params);
        res.json(reservations);
    } catch (error) {
        console.error("Failed to fetch reservations:", error);
        res.status(500).json({ error: 'Failed to fetch reservations.' });
    }
});

// Create a new reservation
router.post('/', async (req, res) => {
    try {
        const { branch_id, table_id, customer_name, pax, reservation_time } = req.body;
        
        if (!branch_id || !table_id || !customer_name || !reservation_time) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        const [result] = await db.execute(
            'INSERT INTO table_reservations (branch_id, table_id, customer_name, pax, reservation_time) VALUES (?, ?, ?, ?, ?)',
            [branch_id, table_id, customer_name, pax || 1, reservation_time]
        );

        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        console.error("Failed to create reservation:", error);
        res.status(500).json({ error: 'Failed to create reservation.' });
    }
});

// Update reservation status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['upcoming', 'seated', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        await db.execute('UPDATE table_reservations SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to update reservation status:", error);
        res.status(500).json({ error: 'Failed to update reservation status.' });
    }
});

// Delete reservation
router.delete('/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM table_reservations WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete reservation:", error);
        res.status(500).json({ error: 'Failed to delete reservation.' });
    }
});

module.exports = router;
