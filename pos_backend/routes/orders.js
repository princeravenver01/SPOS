const express = require('express');
const router = express.Router();
const pool = require('../db');

// Create a new order with strict transactional integrity
router.post('/', async (req, res) => {
    const { branch_id, cashier_id, customer_id, order_type, payment_type, items, subtotal, tax_amount, total_amount, amount_paid } = req.body;
    
    let connection;
    try {
        // 1. Get a dedicated connection from the pool for the transaction
        connection = await pool.getConnection();
        
        // 2. Start the transaction
        await connection.beginTransaction();

        // 3. Insert into the main `orders` table
        // Generating a unique order receipt number (e.g., POS-Timestamp-Random)
        const receipt_number = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const [orderResult] = await connection.execute(
            `INSERT INTO orders 
            (receipt_number, branch_id, cashier_id, customer_id, order_type, payment_type, subtotal, tax_amount, total_amount, amount_paid, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
            [receipt_number, branch_id || null, cashier_id || null, customer_id || null, order_type, payment_type, subtotal, tax_amount, total_amount, amount_paid]
        );

        const order_id = orderResult.insertId;

        // 4. Insert all items into `order_items` table
        if (items && items.length > 0) {
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) 
                    VALUES (?, ?, ?, ?, ?)`,
                    [order_id, item.product_id, item.quantity, item.unit_price, item.subtotal]
                );
                
                // 5. Update inventory count for the product (simple version)
                await connection.execute(
                    `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND track_inventory = 1`,
                    [item.quantity, item.product_id]
                );
            }
        }

        // 6. Commit the transaction if everything succeeded
        await connection.commit();
        
        res.status(201).json({ 
            success: true, 
            message: 'Order processed successfully',
            order_id,
            receipt_number
        });
        
    } catch (error) {
        // 7. Rollback on ANY error to maintain data integrity
        if (connection) {
            await connection.rollback();
        }
        console.error('Transaction Failed, rolling back:', error);
        res.status(500).json({ success: false, message: 'Failed to process order', error: error.message });
    } finally {
        // 8. Always release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
