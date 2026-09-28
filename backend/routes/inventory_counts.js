const express = require('express');
const router = express.Router();
const db = require('../db');

// Utility to fetch items for an IC
async function getIcWithItems(icId) {
    const [[ic]] = await db.query(`
        SELECT ic.*, b.name as branch_name 
        FROM inventory_counts ic
        LEFT JOIN branches b ON ic.branch_id = b.id
        WHERE ic.id = ?
    `, [icId]);
    if (!ic) return null;

    const [items] = await db.query(`
        SELECT * FROM inventory_count_items WHERE ic_id = ?
    `, [icId]);
    
    return { ...ic, items };
}

// Get all ICs
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ic.*, b.name as branch_name 
            FROM inventory_counts ic
            LEFT JOIN branches b ON ic.branch_id = b.id
            ORDER BY ic.id DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch inventory counts' });
    }
});

// Get single IC by ID
router.get('/:id', async (req, res) => {
    try {
        const ic = await getIcWithItems(req.params.id);
        if (!ic) return res.status(404).json({ error: 'Inventory Count not found' });
        res.json(ic);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch inventory count' });
    }
});

// Create IC
router.post('/', async (req, res) => {
    const { 
        branch_id, type, notes, status, items
    } = req.body;
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // Generate IC number (e.g., IC-SL-000001)
        const [[{ max_seq }]] = await conn.query(`
            SELECT MAX(CAST(SUBSTRING(ic_number, 7) AS UNSIGNED)) as max_seq 
            FROM inventory_counts 
            WHERE ic_number LIKE 'IC-SL-%'
        `);
        const nextSeq = (max_seq || 0) + 1;
        const ic_number = `IC-SL-${String(nextSeq).padStart(6, '0')}`;

        const [icResult] = await conn.query(
            `INSERT INTO inventory_counts (ic_number, branch_id, type, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [ic_number, branch_id, type, status || 'Pending', notes || null, 'Admin']
        );
        
        const icId = icResult.insertId;

        // Insert items
        if (items && items.length > 0) {
            for (let item of items) {
                // If it's a full count, expected_stock is pulled fresh, or it's provided in items array.
                // We'll trust the items array for simplicity.
                await conn.query(
                    `INSERT INTO inventory_count_items (ic_id, product_id, product_name, sku, expected_stock, cost) VALUES (?, ?, ?, ?, ?, ?)`,
                    [icId, item.product_id, item.product_name, item.sku, item.expected_stock, item.cost]
                );
            }
        }

        await conn.commit();
        res.status(201).json({ id: icId, ic_number, message: 'Inventory Count saved' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to create inventory count' });
    } finally {
        conn.release();
    }
});

// Update IC (Save Counting Progress)
router.put('/:id', async (req, res) => {
    const { items, status } = req.body;
    const icId = req.params.id;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Update status if provided (e.g., "In Progress")
        if (status) {
            await conn.query(`UPDATE inventory_counts SET status = ? WHERE id = ?`, [status, icId]);
        }

        // Update counted stock for each item
        if (items && items.length > 0) {
            for (let item of items) {
                await conn.query(
                    `UPDATE inventory_count_items SET counted_stock = ? WHERE id = ?`,
                    [item.counted_stock === '' ? null : item.counted_stock, item.id]
                );
            }
        }

        await conn.commit();
        res.json({ message: 'Count progress saved' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to save count progress' });
    } finally {
        conn.release();
    }
});

// Complete IC (Apply differences to Stock Adjustments and real Inventory)
router.post('/:id/complete', async (req, res) => {
    const icId = req.params.id;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[ic]] = await conn.query(`SELECT * FROM inventory_counts WHERE id = ?`, [icId]);
        if (!ic || ic.status === 'Completed') {
            await conn.rollback();
            return res.status(400).json({ error: 'Invalid or already completed inventory count' });
        }

        const [items] = await conn.query(`SELECT * FROM inventory_count_items WHERE ic_id = ?`, [icId]);

        let hasDiscrepancy = false;
        
        for (let item of items) {
            const counted = item.counted_stock !== null ? parseFloat(item.counted_stock) : null;
            const expected = parseFloat(item.expected_stock) || 0;
            
            // If item was not counted, it defaults to expected if partial, or 0 if full? 
            // In typical POS, uncounted in a Full count means 0. Uncounted in Partial means ignored.
            // But we'll rely on the frontend to have populated `counted_stock`.
            if (counted !== null && counted !== expected) {
                hasDiscrepancy = true;
                
                // Modify actual product stock
                await conn.query(`UPDATE products SET in_stock = ? WHERE id = ?`, [counted, item.product_id]);
                
                // Insert into history
                const adjustment = counted - expected;
                await conn.query(
                    `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                    [item.product_id, ic.branch_id, 'Admin', `Inventory count #${ic.ic_number}`, adjustment, counted]
                );
            }
        }

        // Optional: Generate a Stock Adjustment record for the discrepancy
        if (hasDiscrepancy) {
            // Logic to create a SA record can go here, but since the IC record itself
            // serves as an audit trail with expected/counted/difference columns,
            // we will skip duplicate SA logging to keep it simple and clean.
        }

        // Mark IC as completed
        await conn.query(`UPDATE inventory_counts SET status = 'Completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [icId]);

        await conn.commit();
        res.json({ message: 'Inventory Count completed and stock updated successfully' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to complete inventory count' });
    } finally {
        conn.release();
    }
});

// Delete IC (only if not completed)
router.delete('/:id', async (req, res) => {
    const icId = req.params.id;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[ic]] = await conn.query(`SELECT status FROM inventory_counts WHERE id = ?`, [icId]);
        if (!ic) {
            await conn.rollback();
            return res.status(404).json({ error: 'Inventory Count not found' });
        }
        
        if (ic.status === 'Completed') {
            await conn.rollback();
            return res.status(400).json({ error: 'Cannot delete a completed inventory count' });
        }

        // Deleting the IC will cascade delete the items due to ON DELETE CASCADE
        await conn.query(`DELETE FROM inventory_counts WHERE id = ?`, [icId]);

        await conn.commit();
        res.json({ message: 'Inventory Count deleted successfully' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to delete inventory count' });
    } finally {
        conn.release();
    }
});

module.exports = router;
