const express = require('express');
const router = express.Router();
const db = require('../db');

const { EventEmitter } = require('events');
const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(100);

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const onUpdate = () => {
    res.write('data: update\n\n');
  };

  orderEvents.on('update', onUpdate);

  req.on('close', () => {
    orderEvents.removeListener('update', onUpdate);
  });
});


router.post('/create', async (req, res) => {
  const { user_id, shift_id, table_id, customer_id, dining_option_id, ticket_name, items, total_amount, payment_method, amount_tendered, payments, status, discount_id, discount_amount, branch_id, pax } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const grossAmount = parseFloat(total_amount) + parseFloat(discount_amount || 0);
    const netAmount = parseFloat(total_amount);

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, table_id, customer_id, dining_option_id, ticket_name, total_amount, gross_amount, net_amount, status, discount_id, discount_amount, branch_id, pax) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, table_id || null, customer_id || null, dining_option_id || null, ticket_name || null, total_amount, grossAmount, netAmount, status || 'paid', discount_id || null, discount_amount || 0.00, branch_id || null, pax || 1]
    );
    const orderId = orderResult.insertId;

    for (let item of items) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.price]
      );
    }

    const isPaid = (status !== 'open');

    if (isPaid) {
      if (payments && Array.isArray(payments) && payments.length > 0) {
        let totalCash = 0;
        for (let payment of payments) {
          await connection.execute(
            'INSERT INTO payments (order_id, payment_method, amount_paid) VALUES (?, ?, ?)',
            [orderId, payment.method, payment.amount]
          );
          if (payment.method.toLowerCase() === 'cash') {
            totalCash += parseFloat(payment.amount);
          }
        }
        if (shift_id && totalCash > 0) {
          await connection.execute(
            'UPDATE pos_shifts SET cash_payments = cash_payments + ? WHERE id = ?',
            [totalCash, shift_id]
          );
        }
      } else {
        // Fallback for old checkout flow
        await connection.execute(
          'INSERT INTO payments (order_id, payment_method, amount_paid) VALUES (?, ?, ?)',
          [orderId, payment_method || 'cash', total_amount]
        );
        if (shift_id && (!payment_method || payment_method === 'cash')) {
          await connection.execute(
            'UPDATE pos_shifts SET cash_payments = cash_payments + ? WHERE id = ?',
            [total_amount, shift_id]
          );
        }
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, orderId });
  } catch (error) {
    await connection.rollback();
    console.error("Order creation failed:", error);
    res.status(500).json({ error: 'Failed to process order.' });
  } finally {
    connection.release();
  }
});

router.get('/open', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    const branchIdsStr = req.query.branch_ids;
    let query = `SELECT o.*, u.username as employee_name, d.name as discount_name, d.type as discount_type, d.value as discount_value, c.name as customer_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN discounts d ON o.discount_id = d.id
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.status = 'open'`;
    const params = [];
    
    if (branchId) {
        query += ` AND o.branch_id = ?`;
        params.push(branchId);
    } else if (branchIdsStr) {
        const bIds = branchIdsStr.split(',').map(Number);
        if(bIds.length > 0) {
            query += ` AND o.branch_id IN (?)`;
            params.push(bIds);
        } else {
            query += ` AND 1=0 `;
        }
    }
    
    query += ` ORDER BY o.created_at DESC`;

    const [orders] = await db.execute(query, params);

    // Fetch items for each order
    for (let order of orders) {
      const [items] = await db.execute(
        `SELECT oi.*, p.name 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      // Map to frontend expected format
      order.items = items.map(item => ({
        id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price_at_time)
      }));
    }

    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch open tickets:", error);
    res.status(500).json({ error: 'Failed to fetch open tickets.', details: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    let query = `
       SELECT o.*, u.username as employee_name, d.name as discount_name, c.name as customer_name, b.name as branch_name, do.name as dining_option_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN discounts d ON o.discount_id = d.id
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN branches b ON o.branch_id = b.id
       LEFT JOIN dining_options do ON o.dining_option_id = do.id
       WHERE o.status IN ('paid', 'refunded')
    `;
    const params = [];
    
    if (branchId) {
        query += ` AND o.branch_id = ?`;
        params.push(branchId);
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT 100`;

    const [orders] = await db.execute(query, params);

    for (let order of orders) {
      const [items] = await db.execute(
        `SELECT oi.*, p.name 
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items.map(item => ({
        id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price_at_time)
      }));

      const [payments] = await db.execute(
        `SELECT * FROM payments WHERE order_id = ?`,
        [order.id]
      );
      order.payments = payments;
    }

    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch history tickets:", error);
    res.status(500).json({ error: 'Failed to fetch history tickets.', details: error.message });
  }
});

router.post('/:id/checkout', async (req, res) => {
  const orderId = req.params.id;
  const { shift_id, payment_method, amount_tendered, payments, total_amount, discount_id, discount_amount } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const grossAmount = parseFloat(total_amount) + parseFloat(discount_amount || 0);
    const netAmount = parseFloat(total_amount);

    // Update order status
    await connection.execute(
      'UPDATE orders SET status = ?, total_amount = ?, gross_amount = ?, net_amount = ?, discount_id = ?, discount_amount = ? WHERE id = ?',
      ['paid', total_amount, grossAmount, netAmount, discount_id || null, discount_amount || 0.00, orderId]
    );

    if (payments && Array.isArray(payments) && payments.length > 0) {
      let totalCash = 0;
      for (let payment of payments) {
        await connection.execute(
          'INSERT INTO payments (order_id, payment_method, amount_paid) VALUES (?, ?, ?)',
          [orderId, payment.method, payment.amount]
        );
        if (payment.method.toLowerCase() === 'cash') {
          totalCash += parseFloat(payment.amount);
        }
      }
      if (shift_id && totalCash > 0) {
        await connection.execute(
          'UPDATE pos_shifts SET cash_payments = cash_payments + ? WHERE id = ?',
          [totalCash, shift_id]
        );
      }
    } else {
      // Record payment fallback
      await connection.execute(
        'INSERT INTO payments (order_id, payment_method, amount_paid) VALUES (?, ?, ?)',
        [orderId, payment_method || 'cash', total_amount]
      );

      // Update shift cash_payments if paid in cash
      if (shift_id && (!payment_method || payment_method === 'cash')) {
        await connection.execute(
          'UPDATE pos_shifts SET cash_payments = cash_payments + ? WHERE id = ?',
          [total_amount, shift_id]
        );
      }
    }

    await connection.commit();
    orderEvents.emit('update');
    res.json({ success: true, orderId });
  } catch (error) {
    await connection.rollback();
    console.error("Order checkout failed:", error);
    res.status(500).json({ error: 'Failed to checkout open ticket.' });
  } finally {
    connection.release();
  }
});

// Delete open ticket
router.delete('/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    await connection.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
    await connection.commit();
    orderEvents.emit('update');
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to delete ticket.' });
  } finally {
    connection.release();
  }
});

// Assign ticket to employee
router.put('/:id/assign', async (req, res) => {
  try {
    const { user_id } = req.body;
    await db.execute('UPDATE orders SET user_id = ? WHERE id = ?', [user_id, req.params.id]);
    orderEvents.emit('update');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign ticket.' });
  }
});

// Merge ticket into another ticket
router.post('/:id/merge', async (req, res) => {
  const { target_order_id, delete_source } = req.body;
  const source_id = req.params.id;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Move items to target_order_id
    await connection.execute('UPDATE order_items SET order_id = ? WHERE order_id = ?', [target_order_id, source_id]);
    
    // Recalculate target order totals
    const [targetItems] = await connection.execute('SELECT quantity, price_at_time FROM order_items WHERE order_id = ?', [target_order_id]);
    const newTotal = targetItems.reduce((sum, item) => sum + (parseFloat(item.price_at_time) * parseFloat(item.quantity)), 0);
    
    await connection.execute('UPDATE orders SET total_amount = ? WHERE id = ?', [newTotal, target_order_id]);
    
    if (delete_source) {
      await connection.execute('DELETE FROM orders WHERE id = ?', [source_id]);
    } else {
      await connection.execute('UPDATE orders SET total_amount = 0 WHERE id = ?', [source_id]);
    }
    
    await connection.commit();
    orderEvents.emit('update');
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to merge ticket.' });
  } finally {
    connection.release();
  }
});

// Split ticket
router.post('/:id/split', async (req, res) => {
  const source_id = req.params.id;
  const { tickets } = req.body;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get original order details to copy to new tickets
    const [originalOrderRows] = await connection.execute('SELECT * FROM orders WHERE id = ?', [source_id]);
    if (originalOrderRows.length === 0) throw new Error('Source order not found');
    const originalOrder = originalOrderRows[0];
    
    // 1. Delete all current order_items for source_id
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [source_id]);
    
    for (let ticket of tickets) {
      if (ticket.items.length === 0 && !ticket.is_original) continue; // Ignore empty new tickets
      
      let target_order_id = source_id;
      
      // Re-calculate totals from the items sent by frontend
      let ticketTotal = 0;
      
      if (!ticket.is_original) {
        // Create new order
        const [result] = await connection.execute(
          'INSERT INTO orders (user_id, table_id, customer_id, ticket_name, status, dining_option_id, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [originalOrder.user_id, originalOrder.table_id, originalOrder.customer_id, ticket.ticket_name || null, 'open', originalOrder.dining_option_id, 0]
        );
        target_order_id = result.insertId;
      } else {
        // Update original order's name
        await connection.execute('UPDATE orders SET ticket_name = ? WHERE id = ?', [ticket.ticket_name, source_id]);
      }
      
      // Insert items for this ticket
      for (let item of ticket.items) {
        // item should have: product_id, variant_id, quantity, price_at_time, cost_at_time, notes
        const qty = parseFloat(item.quantity || 1);
        const price = parseFloat(item.price_at_time || item.price || 0);
        ticketTotal += (qty * price);
        
        await connection.execute(
          'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price_at_time, cost_at_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [target_order_id, item.product_id || item.id, item.variant_id || null, qty, price, item.cost_at_time || 0, item.notes || null]
        );
      }
      
      // Update order total
      await connection.execute('UPDATE orders SET total_amount = ? WHERE id = ?', [ticketTotal, target_order_id]);
    }
    
    await connection.commit();
    orderEvents.emit('update');
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Split ticket error:', error);
    res.status(500).json({ error: 'Failed to split ticket.' });
  } finally {
    connection.release();
  }
});

// Update order (edit ticket name, items, table, etc.)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { ticket_name, table_id, customer_id, items, total_amount, dining_option_id, discount_id, discount_amount, pax } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let discountValue = parseFloat(discount_amount) || 0.00;
    let netAmount = parseFloat(total_amount) - discountValue;

    await connection.execute(
      'UPDATE orders SET ticket_name = ?, table_id = ?, customer_id = ?, total_amount = ?, gross_amount = ?, net_amount = ?, dining_option_id = ?, discount_id = ?, discount_amount = ?, pax = ? WHERE id = ?',
      [ticket_name, table_id || null, customer_id || null, total_amount, total_amount, netAmount, dining_option_id || null, discount_id || null, discountValue, pax || 1, id]
    );

    if (items && Array.isArray(items)) {
      await connection.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
      for (let item of items) {
        await connection.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
          [id, item.id, item.quantity, item.price]
        );
      }
    }

    await connection.commit();
    orderEvents.emit('update');
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error("Update order failed:", error);
    res.status(500).json({ error: 'Failed to update order.' });
  } finally {
    connection.release();
  }
});

// Delete/void order
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    await connection.execute('DELETE FROM orders WHERE id = ?', [id]);
    await connection.commit();
    orderEvents.emit('update');
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error("Delete order failed:", error);
    res.status(500).json({ error: 'Failed to delete order.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
