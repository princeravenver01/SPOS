const express = require('express');
const router = express.Router();
const db = require('../db');

// Utility to fetch items for a TO
async function getToWithItems(toId) {
    const [[to]] = await db.query(`
        SELECT t.*, s.name as source_branch_name, d.name as dest_branch_name 
        FROM transfer_orders t
        LEFT JOIN branches s ON t.source_branch_id = s.id
        LEFT JOIN branches d ON t.dest_branch_id = d.id
        WHERE t.id = ?
    `, [toId]);
    if (!to) return null;

    const [items] = await db.query(`
        SELECT * FROM transfer_order_items WHERE to_id = ?
    `, [toId]);
    
    // Add total ordered and received for progress
    const total_ordered = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const total_received = items.reduce((sum, item) => sum + (item.received || 0), 0);
    
    return { ...to, items, total_ordered, total_received };
}

// Get all TOs
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, s.name as source_branch_name, d.name as dest_branch_name 
            FROM transfer_orders t
            LEFT JOIN branches s ON t.source_branch_id = s.id
            LEFT JOIN branches d ON t.dest_branch_id = d.id
            ORDER BY t.id DESC
        `);
        
        for (let row of rows) {
            const [[{ total_ordered, total_received }]] = await db.query(`
                SELECT SUM(quantity) as total_ordered, SUM(received) as total_received 
                FROM transfer_order_items 
                WHERE to_id = ?
            `, [row.id]);
            row.total_ordered = parseInt(total_ordered) || 0;
            row.total_received = parseInt(total_received) || 0;
        }

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transfer orders' });
    }
});

// Get single TO by ID
router.get('/:id', async (req, res) => {
    try {
        const to = await getToWithItems(req.params.id);
        if (!to) return res.status(404).json({ error: 'Transfer Order not found' });
        res.json(to);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transfer order' });
    }
});

// Create TO
router.post('/', async (req, res) => {
    const { 
        source_branch_id, dest_branch_id, status, to_date, notes, items
    } = req.body;
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // Generate a TO number (e.g., TO-SL-000001)
        const [[{ max_seq }]] = await conn.query(`
            SELECT MAX(CAST(SUBSTRING(to_number, 7) AS UNSIGNED)) as max_seq 
            FROM transfer_orders 
            WHERE to_number LIKE 'TO-SL-%'
        `);
        const nextSeq = (max_seq || 0) + 1; 
        const to_number = `TO-SL-${String(nextSeq).padStart(6, '0')}`;

        const [toResult] = await conn.query(
            `INSERT INTO transfer_orders (to_number, source_branch_id, dest_branch_id, status, to_date, notes) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [to_number, source_branch_id || null, dest_branch_id || null, status || 'Draft', to_date || null, notes || null]
        );
        
        const toId = toResult.insertId;

        // Insert items
        if (items && items.length > 0) {
            for (let item of items) {
                await conn.query(
                    `INSERT INTO transfer_order_items (to_id, source_product_id, dest_product_id, product_name, sku, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
                    [toId, item.source_product_id, item.dest_product_id, item.product_name, item.sku, item.quantity]
                );
            }
        }

        await conn.commit();
        res.status(201).json({ id: toId, to_number, message: 'Transfer Order created' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to create transfer order' });
    } finally {
        conn.release();
    }
});

// Update TO
router.put('/:id', async (req, res) => {
    const toId = req.params.id;
    const { 
        source_branch_id, dest_branch_id, status, to_date, notes, items
    } = req.body;
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[existingTo]] = await conn.query('SELECT status FROM transfer_orders WHERE id = ?', [toId]);
        if (existingTo && (existingTo.status === 'Partially Received' || existingTo.status === 'Transferred')) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ error: 'Cannot edit a transfer order that has been partially or fully received' });
        }

        await conn.query(
            `UPDATE transfer_orders SET source_branch_id=?, dest_branch_id=?, status=?, to_date=?, notes=? WHERE id=?`,
            [source_branch_id || null, dest_branch_id || null, status, to_date || null, notes || null, toId]
        );

        await conn.query('DELETE FROM transfer_order_items WHERE to_id = ?', [toId]);

        if (items && items.length > 0) {
            for (let item of items) {
                await conn.query(
                    `INSERT INTO transfer_order_items (to_id, source_product_id, dest_product_id, product_name, sku, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
                    [toId, item.source_product_id, item.dest_product_id, item.product_name, item.sku, item.quantity]
                );
            }
        }

        await conn.commit();
        res.json({ message: 'Transfer Order updated' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to update transfer order' });
    } finally {
        conn.release();
    }
});

// Send TO (Mark as In Transit and Deduct Stock from Source)
router.post('/:id/send', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const to = await getToWithItems(req.params.id);
        if (!to) return res.status(404).json({ error: 'Transfer Order not found' });
        
        if (to.status !== 'Draft') {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ error: 'Transfer Order is already sent' });
        }

        // Deduct stock from source branch
        for (let item of to.items) {
            const [[currentProduct]] = await conn.query('SELECT in_stock FROM products WHERE id = ?', [item.source_product_id]);
            const currentStock = currentProduct ? parseFloat(currentProduct.in_stock) : 0;
            const stockAfter = currentStock - parseFloat(item.quantity);

            await conn.query(
                `UPDATE products SET in_stock = ? WHERE id = ?`,
                [stockAfter, item.source_product_id]
            );

            await conn.query(
                `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                [item.source_product_id, to.source_branch_id, 'Admin', `Transfer Order Sent #${to.to_number}`, -item.quantity, stockAfter]
            );
        }

        await conn.query('UPDATE transfer_orders SET status = ? WHERE id = ?', ['In transit', to.id]);

        await conn.commit();
        res.json({ message: 'Transfer Order sent successfully (stock deducted from source)' });
    } catch (err) {
        await conn.rollback();
        console.error('Send TO error:', err);
        res.status(500).json({ error: 'Failed to send Transfer Order' });
    } finally {
        conn.release();
    }
});

// Receive Items for TO
router.post('/:id/receive', async (req, res) => {
    const toId = req.params.id;
    const { itemsToReceive } = req.body; // Array of { id: to_item_id, dest_product_id, receive_qty }
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Fetch TO details for logging
        const [[toDetails]] = await conn.query('SELECT to_number, dest_branch_id FROM transfer_orders WHERE id = ?', [toId]);

        for (let item of itemsToReceive) {
            if (item.receive_qty > 0) {
                // Update TO Item received count
                await conn.query(
                    `UPDATE transfer_order_items SET received = received + ? WHERE id = ? AND to_id = ?`,
                    [item.receive_qty, item.id, toId]
                );

                // Fetch current stock to log history accurately
                const [[currentProduct]] = await conn.query('SELECT in_stock FROM products WHERE id = ?', [item.dest_product_id]);
                const currentStock = currentProduct ? parseFloat(currentProduct.in_stock) : 0;
                const stockAfter = currentStock + parseFloat(item.receive_qty);

                // Add stock to dest branch
                await conn.query(
                    `UPDATE products SET in_stock = ? WHERE id = ?`,
                    [stockAfter, item.dest_product_id]
                );

                await conn.query(
                    `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                    [item.dest_product_id, toDetails.dest_branch_id, 'Admin', `Transfer Order Received #${toDetails.to_number}`, item.receive_qty, stockAfter]
                );
            }
        }

        // Recalculate TO Status
        const [[{ total_ordered, total_received }]] = await conn.query(`
            SELECT SUM(quantity) as total_ordered, SUM(received) as total_received 
            FROM transfer_order_items 
            WHERE to_id = ?
        `, [toId]);

        const parsedOrdered = parseInt(total_ordered) || 0;
        const parsedReceived = parseInt(total_received) || 0;

        let newStatus = 'In transit';
        if (parsedReceived >= parsedOrdered) {
            newStatus = 'Transferred';
        } else if (parsedReceived > 0) {
            newStatus = 'Partially Received';
        }

        await conn.query(`UPDATE transfer_orders SET status = ? WHERE id = ?`, [newStatus, toId]);

        await conn.commit();
        res.json({ message: 'Items received successfully', newStatus });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to receive items' });
    } finally {
        conn.release();
    }
});

// Delete TO
router.delete('/:id', async (req, res) => {
    try {
        const [tos] = await db.query('SELECT status FROM transfer_orders WHERE id = ?', [req.params.id]);
        const to = tos[0];
        if (to && (to.status === 'Partially Received' || to.status === 'Transferred' || to.status === 'In transit')) {
            return res.status(400).json({ error: 'Cannot delete a transfer order that is in transit or received' });
        }
        const [result] = await db.query('DELETE FROM transfer_orders WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Transfer Order not found' });
        }
        res.json({ message: 'Transfer Order deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete transfer order' });
    }
});

module.exports = router;
