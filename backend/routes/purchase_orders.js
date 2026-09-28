const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
        user: 'noreply@silingan.online',
        pass: 'SilinganCucina2026!'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Utility to fetch items and incoming counts for a PO
async function getPoWithItems(poId) {
    const [[po]] = await db.query(`
        SELECT p.*, s.name as supplier_name, b.name as branch_name 
        FROM purchase_orders p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN branches b ON p.branch_id = b.id
        WHERE p.id = ?
    `, [poId]);

    if (!po) return null;

    const [items] = await db.query(`
        SELECT i.*, prod.name as product_name, prod.sku, prod.in_stock as current_stock 
        FROM purchase_order_items i
        JOIN products prod ON i.product_id = prod.id
        WHERE i.po_id = ?
    `, [poId]);

    // Calculate incoming for each item across ALL active POs (Pending or Partially Received)
    for (let item of items) {
        const [[{ incoming }]] = await db.query(`
            SELECT SUM(i.quantity - i.received) as incoming
            FROM purchase_order_items i
            JOIN purchase_orders p ON i.po_id = p.id
            WHERE i.product_id = ? AND p.status IN ('Pending', 'Partially Received')
        `, [item.product_id]);
        item.incoming_stock = parseInt(incoming) || 0;
    }

    po.items = items;
    return po;
}

// Get all POs
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, s.name as supplier_name, b.name as branch_name 
            FROM purchase_orders p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN branches b ON p.branch_id = b.id
            ORDER BY p.id DESC
        `);
        
        // Count items received vs ordered for progress bar
        for (let row of rows) {
            const [[{ total_ordered, total_received }]] = await db.query(`
                SELECT SUM(quantity) as total_ordered, SUM(received) as total_received 
                FROM purchase_order_items 
                WHERE po_id = ?
            `, [row.id]);
            row.total_ordered = parseInt(total_ordered) || 0;
            row.total_received = parseInt(total_received) || 0;
        }

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
});

// Get single PO by ID
router.get('/:id', async (req, res) => {
    try {
        const po = await getPoWithItems(req.params.id);
        if (!po) return res.status(404).json({ error: 'Purchase Order not found' });
        res.json(po);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
});

// Create PO
router.post('/', async (req, res) => {
    const { 
        supplier_id, branch_id, status, po_date, expected_on, notes, items, total_amount
    } = req.body;
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // Generate a PO number (e.g., PO-SL-00001)
        const [[{ max_seq }]] = await conn.query(`
            SELECT MAX(CAST(SUBSTRING(po_number, 7) AS UNSIGNED)) as max_seq 
            FROM purchase_orders 
            WHERE po_number LIKE 'PO-SL-%'
        `);
        const nextSeq = (max_seq || 0) + 1;
        const po_number = `PO-SL-${String(nextSeq).padStart(5, '0')}`;

        const [poResult] = await conn.query(
            `INSERT INTO purchase_orders (po_number, supplier_id, branch_id, status, po_date, expected_on, notes, total_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [po_number, supplier_id || null, branch_id || null, status || 'Draft', po_date || null, expected_on || null, notes || null, total_amount || 0]
        );
        
        const poId = poResult.insertId;

        // Insert items
        if (items && items.length > 0) {
            for (let item of items) {
                await conn.query(
                    `INSERT INTO purchase_order_items (po_id, product_id, quantity, cost, amount) VALUES (?, ?, ?, ?, ?)`,
                    [poId, item.product_id, item.quantity, item.cost, item.amount]
                );
            }
        }

        await conn.commit();
        res.status(201).json({ id: poId, po_number, message: 'Purchase Order created' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to create purchase order' });
    } finally {
        conn.release();
    }
});

// Update PO
router.put('/:id', async (req, res) => {
    const poId = req.params.id;
    const { 
        supplier_id, branch_id, status, po_date, expected_on, notes, items, total_amount
    } = req.body;
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[existingPo]] = await conn.query('SELECT status FROM purchase_orders WHERE id = ?', [poId]);
        if (existingPo && (existingPo.status === 'Partially Received' || existingPo.status === 'Closed')) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ error: 'Cannot edit a purchase order that has been partially or fully received' });
        }

        await conn.query(
            `UPDATE purchase_orders SET supplier_id=?, branch_id=?, status=?, po_date=?, expected_on=?, notes=?, total_amount=? WHERE id=?`,
            [supplier_id || null, branch_id || null, status, po_date || null, expected_on || null, notes || null, total_amount || 0, poId]
        );
        
        // Wipe existing items and recreate
        await conn.query(`DELETE FROM purchase_order_items WHERE po_id = ?`, [poId]);

        if (items && items.length > 0) {
            for (let item of items) {
                await conn.query(
                    `INSERT INTO purchase_order_items (po_id, product_id, quantity, cost, amount, received) VALUES (?, ?, ?, ?, ?, ?)`,
                    [poId, item.product_id, item.quantity, item.cost, item.amount, item.received || 0]
                );
            }
        }

        await conn.commit();
        res.json({ message: 'Purchase Order updated' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to update purchase order' });
    } finally {
        conn.release();
    }
});

// Receive Items for PO
router.post('/:id/receive', async (req, res) => {
    const poId = req.params.id;
    const { itemsToReceive } = req.body; // Array of { id: po_item_id, product_id, receive_qty }
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Fetch PO details for logging
        const [[poDetails]] = await conn.query('SELECT po_number, branch_id FROM purchase_orders WHERE id = ?', [poId]);

        for (let item of itemsToReceive) {
            if (item.receive_qty > 0) {
                // Update PO Item received count
                await conn.query(
                    `UPDATE purchase_order_items SET received = received + ? WHERE id = ? AND po_id = ?`,
                    [item.receive_qty, item.id, poId]
                );

                // Fetch current stock to log history accurately
                const [[currentProduct]] = await conn.query('SELECT in_stock FROM products WHERE id = ?', [item.product_id]);
                const currentStock = currentProduct ? parseFloat(currentProduct.in_stock) : 0;
                const stockAfter = currentStock + parseFloat(item.receive_qty);

                // Update actual product stock
                await conn.query(
                    `UPDATE products SET in_stock = ? WHERE id = ?`,
                    [stockAfter, item.product_id]
                );

                await conn.query(
                    `INSERT INTO inventory_history (product_id, branch_id, employee_name, reason, adjustment, stock_after) VALUES (?, ?, ?, ?, ?, ?)`,
                    [item.product_id, poDetails.branch_id, 'Admin', `PO Received #${poDetails.po_number}`, item.receive_qty, stockAfter]
                );
            }
        }

        // Recalculate PO Status
        const [[{ total_ordered, total_received }]] = await conn.query(`
            SELECT SUM(quantity) as total_ordered, SUM(received) as total_received 
            FROM purchase_order_items 
            WHERE po_id = ?
        `, [poId]);

        const parsedOrdered = parseInt(total_ordered) || 0;
        const parsedReceived = parseInt(total_received) || 0;

        let newStatus = 'Pending';
        if (parsedReceived >= parsedOrdered) {
            newStatus = 'Closed';
        } else if (parsedReceived > 0) {
            newStatus = 'Partially Received';
        }

        await conn.query(`UPDATE purchase_orders SET status = ? WHERE id = ?`, [newStatus, poId]);

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

// Delete PO
router.delete('/:id', async (req, res) => {
    try {
        const [pos] = await db.query('SELECT status FROM purchase_orders WHERE id = ?', [req.params.id]);
        const po = pos[0];
        if (po && (po.status === 'Partially Received' || po.status === 'Closed')) {
            return res.status(400).json({ error: 'Cannot delete a purchase order that has been partially or fully received' });
        }
        const [result] = await db.query('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Purchase Order not found' });
        }
        res.json({ message: 'Purchase Order deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete purchase order' });
    }
});

// Send PO via Email
router.post('/:id/send', async (req, res) => {
    try {
        const po = await getPoWithItems(req.params.id);
        if (!po) return res.status(404).json({ error: 'Purchase Order not found' });
        
        if (!po.supplier_id) {
            return res.status(400).json({ error: 'Purchase Order has no supplier assigned' });
        }

        const [[supplier]] = await db.query('SELECT * FROM suppliers WHERE id = ?', [po.supplier_id]);
        if (!supplier || !supplier.email) {
            return res.status(400).json({ error: 'Supplier does not have an email address' });
        }

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return isNaN(date) ? 'N/A' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        };

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #1e1e1e; border-bottom: 2px solid #FBBD05; padding-bottom: 10px;">Purchase Order: ${po.po_number}</h2>
                <p><strong>Date:</strong> ${formatDate(po.po_date)}</p>
                <p><strong>Expected On:</strong> ${formatDate(po.expected_on)}</p>
                <p><strong>Notes:</strong> ${po.notes || 'None'}</p>
                <br/>
                <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th align="left">Item</th>
                            <th align="left">SKU</th>
                            <th align="right">Qty</th>
                            <th align="right">Cost</th>
                            <th align="right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${po.items.map(item => `
                            <tr>
                                <td>${item.product_name}</td>
                                <td>${item.sku || '-'}</td>
                                <td align="right">${item.quantity}</td>
                                <td align="right">${parseFloat(item.cost || 0).toFixed(2)}</td>
                                <td align="right">${parseFloat(item.amount || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f8f9fa;">
                            <td colspan="4" align="right"><strong>Total:</strong></td>
                            <td align="right"><strong>${parseFloat(po.total_amount || 0).toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
                <br/>
                <p>Thank you,<br/><strong>Silingan Gastro POS</strong></p>
            </div>
        `;

        await transporter.sendMail({
            from: '"Silingan POS" <noreply@silingan.online>',
            to: supplier.email,
            subject: `Purchase Order ${po.po_number} from Silingan`,
            html
        });

        // Automatically update status to 'Pending' if it was 'Draft'
        if (po.status === 'Draft') {
            await db.query('UPDATE purchase_orders SET status = ? WHERE id = ?', ['Pending', po.id]);
        }

        res.json({ message: 'Email sent successfully' });
    } catch (err) {
        console.error('Email send error:', err);
        res.status(500).json({ error: 'Failed to send email. Check your SMTP settings and supplier email.' });
    }
});

module.exports = router;
