const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all inventory history, optionally filtered
router.get('/', async (req, res) => {
    try {
        const { branch_id, start_date, end_date } = req.query;
        let query = `
            SELECT ih.*, p.name as product_name, b.name as branch_name
            FROM inventory_history ih
            JOIN products p ON ih.product_id = p.id
            LEFT JOIN branches b ON ih.branch_id = b.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (branch_id) {
            query += ` AND ih.branch_id = ? `;
            queryParams.push(branch_id);
        }

        if (start_date && end_date) {
            query += ` AND ih.created_at BETWEEN ? AND ? `;
            queryParams.push(start_date, end_date + ' 23:59:59');
        }

        query += ` ORDER BY ih.created_at DESC LIMIT 500 `; // Cap at 500 for safety

        const [history] = await db.query(query, queryParams);
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching inventory history' });
    }
});

// Get inventory history for a specific product
router.get('/product/:id', async (req, res) => {
    try {
        const { branch_id } = req.query;
        let query = `
            SELECT ih.*, p.name as product_name, b.name as branch_name
            FROM inventory_history ih
            JOIN products p ON ih.product_id = p.id
            LEFT JOIN branches b ON ih.branch_id = b.id
            WHERE ih.product_id = ?
        `;
        const queryParams = [req.params.id];

        if (branch_id) {
            query += ` AND ih.branch_id = ? `;
            queryParams.push(branch_id);
        }

        query += ` ORDER BY ih.created_at DESC `;

        const [history] = await db.query(query, queryParams);
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching product inventory history' });
    }
});

module.exports = router;
