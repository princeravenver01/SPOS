const net = require('net');

/**
 * Basic ESC/POS byte generator for 58mm / 80mm thermal receipts
 */
const ESC = '\x1b';
const GS = '\x1d';

const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  TEXT_NORMAL: `${GS}!\x00`,
  TEXT_DOUBLE_HEIGHT: `${GS}!\x01`,
  TEXT_DOUBLE_WIDTH: `${GS}!\x10`,
  TEXT_LARGE: `${GS}!\x11`, // 2x height + 2x width
  FEED_3: `${ESC}d\x03`,
  FEED_5: `${ESC}d\x05`,
  CUT_FULL: `${GS}V\x00`,
  CUT_PARTIAL: `${GS}V\x01`
};

/**
 * Format a two-column line with dots or spaces to fit paper width
 * 58mm standard character count is 32 columns. 80mm is 42-48 columns.
 */
function formatTwoColumns(leftText, rightText, maxCols = 32) {
  const left = String(leftText || '');
  const right = String(rightText || '');
  const spacesNeeded = maxCols - (left.length + right.length);
  if (spacesNeeded <= 0) {
    return left.substring(0, maxCols - right.length - 1) + ' ' + right + '\n';
  }
  return left + ' '.repeat(spacesNeeded) + right + '\n';
}

function dividerLine(char = '-', maxCols = 32) {
  return char.repeat(maxCols) + '\n';
}

/**
 * Format Kitchen Order Ticket (KOT)
 */
function buildKitchenTicket(orderData, maxCols = 32) {
  let buf = '';
  buf += COMMANDS.INIT;
  buf += COMMANDS.ALIGN_CENTER;
  buf += COMMANDS.BOLD_ON;
  buf += COMMANDS.TEXT_LARGE;
  buf += '--- KITCHEN ORDER ---\n';
  buf += COMMANDS.TEXT_NORMAL;
  buf += COMMANDS.BOLD_OFF;

  buf += COMMANDS.ALIGN_LEFT;
  buf += dividerLine('=', maxCols);

  const ticketName = orderData.ticket_name || `Order #${orderData.id || orderData.orderId || 'NEW'}`;
  const tableName = orderData.table_name ? `Table: ${orderData.table_name}` : null;
  const diningOption = orderData.dining_option_name || (orderData.selectedDiningOption?.name) || 'Dine In';
  const orderTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  buf += COMMANDS.BOLD_ON;
  buf += `${ticketName}\n`;
  if (tableName) buf += `${tableName}\n`;
  buf += `Type: ${diningOption.toUpperCase()}\n`;
  buf += COMMANDS.BOLD_OFF;
  buf += `Time: ${orderTime}\n`;
  if (orderData.cashier_name) buf += `Server: ${orderData.cashier_name}\n`;
  buf += dividerLine('-', maxCols);

  buf += COMMANDS.BOLD_ON;
  buf += formatTwoColumns('ITEM', 'QTY', maxCols);
  buf += COMMANDS.BOLD_OFF;
  buf += dividerLine('-', maxCols);

  const items = orderData.items || [];
  items.forEach(item => {
    buf += COMMANDS.BOLD_ON;
    buf += formatTwoColumns(item.name, `x ${item.quantity}`, maxCols);
    buf += COMMANDS.BOLD_OFF;

    if (item.comment) {
      buf += `  * Note: ${item.comment}\n`;
    }
  });

  buf += dividerLine('=', maxCols);
  buf += COMMANDS.FEED_3;
  buf += COMMANDS.CUT_PARTIAL;
  return buf;
}

/**
 * Format Counter / Customer Receipt
 */
function buildCounterReceipt(receiptData, maxCols = 32) {
  let buf = '';
  buf += COMMANDS.INIT;
  
  // Header / Logo
  buf += COMMANDS.ALIGN_CENTER;
  buf += COMMANDS.BOLD_ON;
  buf += COMMANDS.TEXT_DOUBLE_HEIGHT;
  buf += (receiptData.store_name || 'SILINGAN GASTRO') + '\n';
  buf += COMMANDS.TEXT_NORMAL;
  buf += COMMANDS.BOLD_OFF;

  if (receiptData.header_text) {
    buf += receiptData.header_text + '\n';
  }
  if (receiptData.branch_address) {
    buf += receiptData.branch_address + '\n';
  }
  if (receiptData.branch_phone) {
    buf += `Tel: ${receiptData.branch_phone}\n`;
  }

  buf += dividerLine('=', maxCols);
  buf += COMMANDS.ALIGN_LEFT;

  const receiptNo = receiptData.receipt_number || `REC-${receiptData.orderId || receiptData.id || Date.now()}`;
  const dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  buf += formatTwoColumns(`Date: ${dateStr}`, timeStr, maxCols);
  buf += `Receipt #: ${receiptNo}\n`;
  if (receiptData.cashier_name) buf += `Cashier: ${receiptData.cashier_name}\n`;
  if (receiptData.customer_name) buf += `Customer: ${receiptData.customer_name}\n`;
  if (receiptData.dining_option) buf += `Option: ${receiptData.dining_option}\n`;

  buf += dividerLine('-', maxCols);
  buf += formatTwoColumns('ITEM', 'AMOUNT', maxCols);
  buf += dividerLine('-', maxCols);

  const items = receiptData.items || [];
  items.forEach(item => {
    const itemTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
    buf += `${item.name}\n`;
    buf += formatTwoColumns(`  ${item.quantity} x ₱${parseFloat(item.price).toFixed(2)}`, `₱${itemTotal}`, maxCols);
    if (item.comment) {
      buf += `   (${item.comment})\n`;
    }
  });

  buf += dividerLine('-', maxCols);

  const subtotal = parseFloat(receiptData.subtotal || 0).toFixed(2);
  const tax = parseFloat(receiptData.tax_amount || 0).toFixed(2);
  const total = parseFloat(receiptData.total_amount || 0).toFixed(2);
  const discount = parseFloat(receiptData.discount_amount || 0);

  buf += formatTwoColumns('Subtotal:', `₱${subtotal}`, maxCols);
  if (tax > 0) {
    buf += formatTwoColumns('Tax:', `₱${tax}`, maxCols);
  }
  if (discount > 0) {
    buf += formatTwoColumns(`Discount:`, `-₱${discount.toFixed(2)}`, maxCols);
  }

  buf += dividerLine('=', maxCols);
  buf += COMMANDS.BOLD_ON;
  buf += COMMANDS.TEXT_DOUBLE_HEIGHT;
  buf += formatTwoColumns('TOTAL:', `₱${total}`, maxCols);
  buf += COMMANDS.TEXT_NORMAL;
  buf += COMMANDS.BOLD_OFF;
  buf += dividerLine('=', maxCols);

  // Payments breakdown
  if (receiptData.payments && Array.isArray(receiptData.payments)) {
    receiptData.payments.forEach(p => {
      buf += formatTwoColumns(`Paid (${(p.method || 'Cash').toUpperCase()}):`, `₱${parseFloat(p.amount || 0).toFixed(2)}`, maxCols);
    });
  }
  if (receiptData.change_due !== undefined && receiptData.change_due > 0) {
    buf += formatTwoColumns('Change Due:', `₱${parseFloat(receiptData.change_due).toFixed(2)}`, maxCols);
  }

  // Footer message
  buf += COMMANDS.ALIGN_CENTER;
  buf += '\n';
  if (receiptData.footer_text) {
    buf += receiptData.footer_text + '\n';
  } else {
    buf += 'Thank you for your visit!\nPlease come again.\n';
  }

  buf += COMMANDS.FEED_5;
  buf += COMMANDS.CUT_FULL;
  return buf;
}

/**
 * Send raw binary/ESC-POS buffer to network thermal printer over TCP socket
 */
function sendToPrinter(ip, port = 9100, buffer, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (!ip) {
      return reject(new Error('Printer IP address is required'));
    }

    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      socket.write(buffer, 'binary', (err) => {
        if (err) {
          if (!isSettled) {
            isSettled = true;
            socket.destroy();
            reject(err);
          }
        } else {
          // Give tiny delay for transmission buffer before disconnecting
          setTimeout(() => {
            if (!isSettled) {
              isSettled = true;
              socket.end();
              resolve({ success: true, message: `Printed successfully to ${ip}:${port}` });
            }
          }, 300);
        }
      });
    });

    socket.on('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        reject(new Error(`Connection timed out to printer at ${ip}:${port}`));
      }
    });

    socket.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        reject(new Error(`Printer socket error (${ip}:${port}): ${err.message}`));
      }
    });

    socket.connect(parseInt(port, 10) || 9100, ip);
  });
}

/**
 * Test network connectivity to thermal printer IP:Port
 */
function testPrinterConnection(ip, port = 9100, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let finished = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve({ connected: true, message: `Printer is online at ${ip}:${port}` });
      }
    });

    socket.on('timeout', () => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve({ connected: false, message: `Printer timed out at ${ip}:${port}` });
      }
    });

    socket.on('error', (err) => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve({ connected: false, message: `Cannot connect to ${ip}:${port} (${err.message})` });
      }
    });

    socket.connect(parseInt(port, 10) || 9100, ip);
  });
}

module.exports = {
  buildKitchenTicket,
  buildCounterReceipt,
  sendToPrinter,
  testPrinterConnection
};
