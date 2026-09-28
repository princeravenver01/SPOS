const db = require('./backend/db');
async function test() {
    try {
        const [[po]] = await db.query(`
            SELECT p.*, s.name as supplier_name, b.name as branch_name 
            FROM purchase_orders p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN branches b ON p.branch_id = b.id
            WHERE p.id = 1
        `);
        console.log("PO:", po);

        if (!po) return null;

        const [items] = await db.query(`
            SELECT i.*, prod.name as product_name, prod.sku, prod.stock as current_stock 
            FROM purchase_order_items i
            JOIN products prod ON i.product_id = prod.id
            WHERE i.po_id = 1
        `);
        console.log("ITEMS:", items);
        
        for (let item of items) {
            const [[{ incoming }]] = await db.query(`
                SELECT SUM(i.quantity - i.received) as incoming
                FROM purchase_order_items i
                JOIN purchase_orders p ON i.po_id = p.id
                WHERE i.product_id = ? AND p.status IN ('Pending', 'Partially Received')
            `, [item.product_id]);
            item.incoming_stock = parseInt(incoming) || 0;
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit();
}
test();
