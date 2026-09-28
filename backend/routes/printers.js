const express = require('express');
const router = express.Router();
const pool = require('../db');
const printerService = require('../services/printerService');

// GET all configured printers (optionally filtered by branch_id)
router.get('/', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    let query = 'SELECT * FROM printers';
    let params = [];

    if (branchId) {
      query += ' WHERE branch_id = ? OR branch_id IS NULL';
      params.push(branchId);
    }
    query += ' ORDER BY type ASC, name ASC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Failed to get printers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST or update printer configuration
router.post('/', async (req, res) => {
  try {
    const { id, name, type, ip_address, port, paper_width, branch_id, is_active, auto_print } = req.body;

    if (!name || !ip_address) {
      return res.status(400).json({ error: 'Printer name and IP address are required' });
    }

    const printerType = type === 'kitchen' ? 'kitchen' : 'counter';
    const printerPort = parseInt(port, 10) || 9100;
    const paperWidth = paper_width === '80mm' ? '80mm' : '58mm';
    const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const autoVal = auto_print !== undefined ? (auto_print ? 1 : 0) : 1;
    const branchVal = branch_id ? parseInt(branch_id, 10) : null;

    if (id) {
      // Update existing
      await pool.query(
        `UPDATE printers SET 
         name = ?, type = ?, ip_address = ?, port = ?, paper_width = ?, branch_id = ?, is_active = ?, auto_print = ?
         WHERE id = ?`,
        [name, printerType, ip_address.trim(), printerPort, paperWidth, branchVal, activeVal, autoVal, id]
      );
      res.json({ success: true, message: 'Printer configuration updated' });
    } else {
      // Create new
      const [result] = await pool.query(
        `INSERT INTO printers (name, type, ip_address, port, paper_width, branch_id, is_active, auto_print)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, printerType, ip_address.trim(), printerPort, paperWidth, branchVal, activeVal, autoVal]
      );
      res.status(201).json({ success: true, id: result.insertId, message: 'Printer added successfully' });
    }
  } catch (err) {
    console.error('Failed to save printer:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE printer
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM printers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Printer deleted successfully' });
  } catch (err) {
    console.error('Failed to delete printer:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test connection to printer IP
router.post('/test-connection', async (req, res) => {
  try {
    const { ip_address, port } = req.body;
    if (!ip_address) {
      return res.status(400).json({ error: 'IP address is required' });
    }
    const result = await printerService.testPrinterConnection(ip_address.trim(), port || 9100);
    res.json(result);
  } catch (err) {
    res.status(500).json({ connected: false, message: err.message });
  }
});

// Print test receipt
router.post('/test-print', async (req, res) => {
  try {
    const { ip_address, port, type, paper_width } = req.body;
    if (!ip_address) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const cols = (paper_width === '80mm') ? 42 : 32;
    let rawBuffer;

    if (type === 'kitchen') {
      rawBuffer = printerService.buildKitchenTicket({
        ticket_name: 'TEST KITCHEN ORDER',
        table_name: 'Table 1',
        dining_option_name: 'Dine In',
        cashier_name: 'Admin Test',
        items: [
          { name: 'Chicken Inasal', quantity: 2, comment: 'Spicy / extra sauce' },
          { name: 'Garlic Rice', quantity: 2 },
          { name: 'Iced Tea Pitcher', quantity: 1 }
        ]
      }, cols);
    } else {
      rawBuffer = printerService.buildCounterReceipt({
        store_name: 'SILINGAN GASTRO',
        header_text: 'Test Print Configuration',
        branch_address: 'Local Server Test',
        branch_phone: '0917-000-0000',
        receipt_number: `TEST-${Date.now().toString().slice(-4)}`,
        cashier_name: 'Admin Test',
        customer_name: 'Walk-in Guest',
        dining_option: 'Dine In',
        items: [
          { name: 'Chicken Inasal', price: 180, quantity: 2 },
          { name: 'Garlic Rice', price: 35, quantity: 2 },
          { name: 'Iced Tea Pitcher', price: 120, quantity: 1 }
        ],
        subtotal: 550.00,
        tax_amount: 0,
        total_amount: 550.00,
        payments: [{ method: 'Cash', amount: 600.00 }],
        change_due: 50.00,
        footer_text: 'Printer configured & verified!\nStatic IP connection saved.'
      }, cols);
    }

    const printResult = await printerService.sendToPrinter(ip_address.trim(), port || 9100, rawBuffer);
    res.json(printResult);
  } catch (err) {
    console.error('Test print failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Print Kitchen Ticket for an Order
router.post('/print-kitchen', async (req, res) => {
  try {
    const { order, branch_id } = req.body;
    if (!order) {
      return res.status(400).json({ error: 'Order details required' });
    }

    // Lookup kitchen printer for this branch
    let query = "SELECT * FROM printers WHERE type = 'kitchen' AND is_active = 1";
    let params = [];
    if (branch_id) {
      query += " AND (branch_id = ? OR branch_id IS NULL) ORDER BY branch_id DESC LIMIT 1";
      params.push(branch_id);
    } else {
      query += " LIMIT 1";
    }

    const [printers] = await pool.query(query, params);
    if (printers.length === 0) {
      return res.status(404).json({ error: 'No active Kitchen Printer configured' });
    }

    const kitchenPrinter = printers[0];
    const cols = (kitchenPrinter.paper_width === '80mm') ? 42 : 32;
    const rawBuffer = printerService.buildKitchenTicket(order, cols);

    const result = await printerService.sendToPrinter(kitchenPrinter.ip_address, kitchenPrinter.port, rawBuffer);
    res.json({ success: true, printer: kitchenPrinter.name, result });
  } catch (err) {
    console.error('Kitchen print failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Print Counter Receipt for an Order
router.post('/print-receipt', async (req, res) => {
  try {
    const { receipt, branch_id } = req.body;
    if (!receipt) {
      return res.status(400).json({ error: 'Receipt details required' });
    }

    // Lookup counter printer for this branch
    let query = "SELECT * FROM printers WHERE type = 'counter' AND is_active = 1";
    let params = [];
    if (branch_id) {
      query += " AND (branch_id = ? OR branch_id IS NULL) ORDER BY branch_id DESC LIMIT 1";
      params.push(branch_id);
    } else {
      query += " LIMIT 1";
    }

    const [printers] = await pool.query(query, params);
    if (printers.length === 0) {
      return res.status(404).json({ error: 'No active Counter Printer configured' });
    }

    const counterPrinter = printers[0];
    const cols = (counterPrinter.paper_width === '80mm') ? 42 : 32;
    const rawBuffer = printerService.buildCounterReceipt(receipt, cols);

    const result = await printerService.sendToPrinter(counterPrinter.ip_address, counterPrinter.port, rawBuffer);
    res.json({ success: true, printer: counterPrinter.name, result });
  } catch (err) {
    console.error('Counter receipt print failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Intelligent Auto-Route for saved tickets & checkouts
// Rules:
// 1. If both Kitchen and Counter exist:
//    - Kitchen printer prints the Kitchen Ticket
//    - Counter printer prints the Counter Ticket / Receipt
// 2. If ONLY Counter printer exists:
//    - Counter printer prints the Counter Receipt/Ticket AND also prints the Kitchen Ticket
// 3. If ONLY Kitchen printer exists:
//    - Kitchen printer prints the Kitchen Ticket (Counter receipt is skipped)
// 4. If neither exists or is active:
//    - Gracefully succeeds with skipped status without errors
router.post('/auto-route', async (req, res) => {
  try {
    const { branch_id, order, receipt, is_saved_ticket } = req.body;

    // Fetch active printers for this branch
    let query = "SELECT * FROM printers WHERE is_active = 1";
    let params = [];
    if (branch_id) {
      query += " AND (branch_id = ? OR branch_id IS NULL)";
      params.push(branch_id);
    }
    query += " ORDER BY branch_id DESC";

    const [printers] = await pool.query(query, params);
    
    // Pick the most specific printer for each type
    const kitchenPrinter = printers.find(p => p.type === 'kitchen');
    const counterPrinter = printers.find(p => p.type === 'counter');

    const results = {
      kitchen: { status: 'skipped', message: 'No kitchen printer' },
      counter: { status: 'skipped', message: 'No counter printer' }
    };

    // Scenario A: Both exist
    if (kitchenPrinter && counterPrinter) {
      if (order) {
        try {
          const cols = (kitchenPrinter.paper_width === '80mm') ? 42 : 32;
          const kBuf = printerService.buildKitchenTicket(order, cols);
          await printerService.sendToPrinter(kitchenPrinter.ip_address, kitchenPrinter.port, kBuf);
          results.kitchen = { status: 'printed', printer: kitchenPrinter.name, ip: kitchenPrinter.ip_address };
        } catch (e) {
          results.kitchen = { status: 'error', error: e.message };
        }
      }

      if (receipt) {
        try {
          const cols = (counterPrinter.paper_width === '80mm') ? 42 : 32;
          const cBuf = printerService.buildCounterReceipt(receipt, cols);
          await printerService.sendToPrinter(counterPrinter.ip_address, counterPrinter.port, cBuf);
          results.counter = { status: 'printed', printer: counterPrinter.name, ip: counterPrinter.ip_address };
        } catch (e) {
          results.counter = { status: 'error', error: e.message };
        }
      }
    } 
    // Scenario B: ONLY Counter printer exists
    else if (!kitchenPrinter && counterPrinter) {
      const cols = (counterPrinter.paper_width === '80mm') ? 42 : 32;

      // 1. Print Counter ticket/receipt
      if (receipt) {
        try {
          const cBuf = printerService.buildCounterReceipt(receipt, cols);
          await printerService.sendToPrinter(counterPrinter.ip_address, counterPrinter.port, cBuf);
          results.counter = { status: 'printed', printer: counterPrinter.name, ip: counterPrinter.ip_address };
        } catch (e) {
          results.counter = { status: 'error', error: e.message };
        }
      }

      // 2. Also print Kitchen ticket on the Counter printer so kitchen staff still get it
      if (order) {
        try {
          const kBuf = printerService.buildKitchenTicket(order, cols);
          await printerService.sendToPrinter(counterPrinter.ip_address, counterPrinter.port, kBuf);
          results.kitchen = { status: 'printed_on_counter', printer: counterPrinter.name, ip: counterPrinter.ip_address };
        } catch (e) {
          results.kitchen = { status: 'error', error: e.message };
        }
      }
    } 
    // Scenario C: ONLY Kitchen printer exists
    else if (kitchenPrinter && !counterPrinter) {
      // Counter print is automatically cancelled / skipped
      results.counter = { status: 'skipped', message: 'No counter printer detected' };

      if (order) {
        try {
          const cols = (kitchenPrinter.paper_width === '80mm') ? 42 : 32;
          const kBuf = printerService.buildKitchenTicket(order, cols);
          await printerService.sendToPrinter(kitchenPrinter.ip_address, kitchenPrinter.port, kBuf);
          results.kitchen = { status: 'printed', printer: kitchenPrinter.name, ip: kitchenPrinter.ip_address };
        } catch (e) {
          results.kitchen = { status: 'error', error: e.message };
        }
      }
    } else {
      // Scenario D: Neither exists
      results.kitchen = { status: 'skipped', message: 'No kitchen printer saved' };
      results.counter = { status: 'skipped', message: 'No counter printer saved' };
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('Auto-route print error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
