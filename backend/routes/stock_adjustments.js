const express = require('express');
const router = express.Router();
const db = require('../db');

// Utility to fetch items for an SA
async function getSaWithItems(saId) {
    const [[sa]] = await db.query(`
        SELECT sa.*, b.name as branch_name 
        FROM stock_adjustments sa
        LEFT JOIN branches b ON sa.branch_id = b.id
        WHERE sa.id = ?
    `, [saId]);
    if (!sa) return null;

    const [items] = await db.query(`
        SELECT * FROM stock_adjustment_items WHERE sa_id = ?
    `, [saId]);
    
    const total_adjusted = items.reduce((sum, item) => sum + Math.abs(item.quantity_adjusted || 0), 0);
    
    return { ...sa, items, total_adjusted };
}

// Get all SAs
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT sa.*, b.name as branch_name 
            FROM stock_adjustments sa
            LEFT JOIN branches b ON sa.branch_id = b.id
            ORDER BY sa.id DESC
        `);
        
        for (let row of rows) {
            const [[{ total_adjusted }]] = await db.query(`
                SELECT SUM(ABS(quantity_adjusted)) as total_adjusted 
                FROM stock_adjustment_items 
                WHERE sa_id = ?
            `, [row.id]);
            row.total_adjusted = parseInt(total_adjusted) || 0;
        }

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stock adjustments' });
    }
});

// Get single SA by ID
router.get('/:id', async (req, res) => {
    try {
        const sa = await getSaWithItems(req.params.id);
        if (!sa) return res.status(404).json({ error: 'Stock Adjustment not found' });
        res.json(sa);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stock adjustment' });
    }
});

// Create SA
router.post('/', async (req, res) => {
    const { 
        branch_id, reason, sa_date, notes, adjusted_by, items
    } = req.body;
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // Generate a SA number (e.g., SA000001)
        const [[{ max_seq }]] = await conn.query(`
            SELECT MAX(CAST(SUBSTRING(sa_number, 3) AS UNSIGNED)) as max_seq 
            FROM stock_adjustments 
            WHERE sa_number LIKE 'SA%'
        `);
        const nextSeq = (max_seq || 0) + 1;
        const sa_number = `SA${String(nextSeq).padStart(6, '0')}`;

        const [saResult] = await conn.query(
            `INSERT INTO stock_adjustments (sa_number, branch_id, reason, sa_date, notes, adjusted_by) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [sa_number, branch_id, reason, sa_date || null, notes || null, adjusted_by || 'Admin']
        );
        
        const saId = saResult.insertId;

        // Insert items and adjust stock instantly
        if (items && items.length > 0) {
            for (let item of items) {
                await conn.query(
                    `INSERT INTO stock_adjustment_items (sa_id, product_id, product_name, sku, in_stock_before, quantity_adjusted, cost) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [saId, item.product_id, item.product_name, item.sku, item.in_stock_before, item.quantity_adjusted, item.cost]
                );

                // Fetch current stock to be accurate
                const [[currentProduct]] = await conn.query('SELECT in_stock FROM products WHERE id = ?', [item.product_id]);
                const currentStock = currentProduct ? parseFloat(currentProduct.in_stock) : 0;
                let adjustment = 0;
                let stockAfter = currentStock;

                if (reason === 'Receive items') {
                    adjustment = parseFloat(item.quantity_adjusted);
                    stockAfter = currentStock + adjustment;
                } else if (reason === 'Loss' || reason === 'Damage') {
                    adjustment = -parseFloat(item.quantity_adjusted);
                    stockAfter = currentStock + adjustment;
                } else if (reason === 'Inventory count') {
                    stockAfter = parseFloat(item.quantity_adjusted);
                    adjustment = stockAfter - currentStock;
                }

                if (adjustment !== 0 || reason === 'Inventory count') {
                    await conn.query(`UPDATE products SET in_stock = ? WHERE id = ?`, [stockAfter, item.product_id]);
                    
                    await conn.query(
                        `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                        [item.product_id, branch_id, adjusted_by || 'Admin', `${reason} #${sa_number}`, adjustment, stockAfter]
                    );
                }
            }
        }

        await conn.commit();
        res.status(201).json({ id: saId, sa_number, message: 'Stock Adjustment created and inventory updated' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to create stock adjustment' });
    } finally {
        conn.release();
    }
});

module.exports = router;
