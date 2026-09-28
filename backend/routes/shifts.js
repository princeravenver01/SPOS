const express = require('express');
const router = express.Router();
const db = require('../db'); // Wait, earlier I saw db.js is in backend folder directly

// Check current open shift
router.get('/current', async (req, res) => {
    try {
        const branchId = req.query.branch_id;
        const cashierId = req.query.cashier_id;
        let query = 'SELECT * FROM pos_shifts WHERE status = "open"';
        const params = [];
        if (branchId) {
            query += ' AND branch_id = ?';
            params.push(branchId);
        }
        if (cashierId) {
            query += ' AND cashier_id = ?';
            params.push(cashierId);
        }
        query += ' ORDER BY opened_at DESC LIMIT 1';
        
        const [shifts] = await db.query(query, params);
        if (shifts.length > 0) {
            res.json({ success: true, shift: shifts[0] });
        } else {
            res.json({ success: false, message: 'No open shift' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Open a new shift
router.post('/open', async (req, res) => {
    const { cashier_id, cashier_name, starting_cash, branch_id } = req.body;
    if (!cashier_id || !cashier_name) {
        return res.status(400).json({ error: 'Cashier details required' });
    }

    try {
        // Check if one is already open
        const [existing] = await db.query('SELECT * FROM pos_shifts WHERE status = "open" AND branch_id = ? AND cashier_id = ?', [branch_id, cashier_id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'You already have an open shift for this branch' });
        }

        const [result] = await db.query(
            'INSERT INTO pos_shifts (cashier_id, cashier_name, starting_cash, branch_id) VALUES (?, ?, ?, ?)',
            [cashier_id, cashier_name, starting_cash || 0.00, branch_id || null]
        );
        
        const [newShift] = await db.query('SELECT * FROM pos_shifts WHERE id = ?', [result.insertId]);
        res.json({ success: true, shift: newShift[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Close shift
router.post('/close', async (req, res) => {
    const { shift_id, expected_cash, actual_cash, difference } = req.body;
    
    try {
        await db.query(
            'UPDATE pos_shifts SET expected_cash = ?, actual_cash = ?, difference = ?, status = "closed", closed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [expected_cash || 0, actual_cash || 0, difference || 0, shift_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
