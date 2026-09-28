const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const { branch_id, date } = req.query;
        let query = `
            SELECT 
                p.id, p.name, p.category_id, p.cost, p.price, p.in_stock, p.branch_id,
                c.name as category_name
        `;
        const queryParams = [];

        if (date) {
            // Target end of the selected day
            const targetDate = `${date} 23:59:59`;
            query += `,
                p.in_stock - COALESCE((
                    SELECT SUM(adjustment) 
                    FROM inventory_history ih 
                    WHERE ih.product_id = p.id 
                    AND ih.created_at > ?
                ), 0) as calculated_stock
            `;
            queryParams.push(targetDate);
        } else {
            query += `, p.in_stock as calculated_stock `;
        }

        query += `
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;

        if (branch_id) {
            query += ` AND p.branch_id = ? `;
            queryParams.push(branch_id);
        }

        query += ` ORDER BY p.name ASC `;

        const [products] = await pool.query(query, queryParams);

        // Map and calculate valuation metrics
        const valuationData = products.map(p => {
            const stock = parseFloat(p.calculated_stock) || 0;
            const cost = parseFloat(p.cost) || 0;
            const price = parseFloat(p.price) || 0;

            // Only positive stock counts towards value in typical POS systems (like Loyverse)
            const inventoryValue = stock > 0 ? stock * cost : 0;
            const retailValue = stock > 0 ? stock * price : 0;
            const potentialProfit = retailValue - inventoryValue;
            const margin = retailValue > 0 ? (potentialProfit / retailValue) * 100 : 0;

            return {
                id: p.id,
                name: p.name,
                category_name: p.category_name,
                branch_id: p.branch_id,
                in_stock: stock,
                cost: cost,
                price: price,
                inventory_value: inventoryValue,
                retail_value: retailValue,
                potential_profit: potentialProfit,
                margin: margin
            };
        });

        res.json(valuationData);
    } catch (err) {
        console.error('Failed to fetch inventory valuation', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
