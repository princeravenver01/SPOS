const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all productions
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, b.name as branch_name 
            FROM productions p
            LEFT JOIN branches b ON p.branch_id = b.id
            ORDER BY p.id DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch productions' });
    }
});

// Get single production
router.get('/:id', async (req, res) => {
    try {
        const [[production]] = await db.query(`
            SELECT p.*, b.name as branch_name 
            FROM productions p
            LEFT JOIN branches b ON p.branch_id = b.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        if (!production) return res.status(404).json({ error: 'Production not found' });

        const [items] = await db.query(`SELECT * FROM production_items WHERE production_id = ?`, [req.params.id]);
        
        res.json({ ...production, items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch production' });
    }
});

// Create Production / Disassembly
router.post('/', async (req, res) => {
    const { branch_id, type, notes, items } = req.body;
    
    if (!branch_id || !type || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Generate PR/DS number
        const prefix = type === 'Production' ? 'PR' : 'DS';
        const [[{ max_seq }]] = await conn.query(`
            SELECT MAX(CAST(SUBSTRING(pr_number, 4) AS UNSIGNED)) as max_seq 
            FROM productions 
            WHERE pr_number LIKE ?
        `, [`${prefix}-%`]);
        const nextSeq = (max_seq || 0) + 1;
        const pr_number = `${prefix}-${String(nextSeq).padStart(6, '0')}`;

        // 2. Create production record
        const [prodResult] = await conn.query(
            `INSERT INTO productions (pr_number, branch_id, type, notes, created_by) 
             VALUES (?, ?, ?, ?, ?)`,
            [pr_number, branch_id, type, notes || null, 'Admin']
        );
        const prodId = prodResult.insertId;

        // 3. Process each item (composite product being produced/disassembled)
        for (let item of items) {
            await conn.query(
                `INSERT INTO production_items (production_id, product_id, product_name, sku, quantity, cost)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [prodId, item.product_id, item.product_name, item.sku, item.quantity, item.cost]
            );

            const qty = parseFloat(item.quantity);

            // Fetch the BOM (components) for this composite product
            const [components] = await conn.query(
                `SELECT * FROM product_components WHERE parent_product_id = ?`, 
                [item.product_id]
            );

            if (type === 'Production') {
                // Producing a composite: INCREASE composite stock, DECREASE component stock
                await conn.query(
                    `UPDATE products SET in_stock = in_stock + ? WHERE id = ?`,
                    [qty, item.product_id]
                );
                
                const [[compResult]] = await conn.query(`SELECT in_stock FROM products WHERE id = ?`, [item.product_id]);
                await conn.query(
                    `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                    [item.product_id, branch_id, 'Admin', `Production #${pr_number}`, qty, compResult.in_stock]
                );

                for (let comp of components) {
                    const consumedQty = qty * parseFloat(comp.quantity);
                    await conn.query(
                        `UPDATE products SET in_stock = in_stock - ? WHERE id = ?`,
                        [consumedQty, comp.component_product_id]
                    );
                    const [[cResult]] = await conn.query(`SELECT in_stock FROM products WHERE id = ?`, [comp.component_product_id]);
                    await conn.query(
                        `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                        [comp.component_product_id, branch_id, 'Admin', `Production #${pr_number}`, -consumedQty, cResult.in_stock]
                    );
                }
            } else if (type === 'Disassembly') {
                // Disassembling a composite: DECREASE composite stock, INCREASE component stock
                await conn.query(
                    `UPDATE products SET in_stock = in_stock - ? WHERE id = ?`,
                    [qty, item.product_id]
                );
                const [[compResult]] = await conn.query(`SELECT in_stock FROM products WHERE id = ?`, [item.product_id]);
                await conn.query(
                    `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                    [item.product_id, branch_id, 'Admin', `Disassembly #${pr_number}`, -qty, compResult.in_stock]
                );

                for (let comp of components) {
                    const recoveredQty = qty * parseFloat(comp.quantity);
                    await conn.query(
                        `UPDATE products SET in_stock = in_stock + ? WHERE id = ?`,
                        [recoveredQty, comp.component_product_id]
                    );
                    const [[cResult]] = await conn.query(`SELECT in_stock FROM products WHERE id = ?`, [comp.component_product_id]);
                    await conn.query(
                        `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                        [comp.component_product_id, branch_id, 'Admin', `Disassembly #${pr_number}`, recoveredQty, cResult.in_stock]
                    );
                }
            }
        }

        await conn.commit();
        res.status(201).json({ id: prodId, pr_number, message: `${type} saved successfully` });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to save production' });
    } finally {
        conn.release();
    }
});

module.exports = router;
