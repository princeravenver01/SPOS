const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
    try {
        const { branchId, date } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (branchId && branchId !== 'all') {
                whereClause += " AND o.branch_id = ?";
                params.push(branchId);
            }
            if (date) {
                // If date is provided, filter by it. Else default to today? Or all time? Let's do today if date is 'today', else all if null
                if (date === 'today') {
                    whereClause += " AND DATE(o.created_at) = CURDATE()";
                }
            }

            const summaryQuery = `
                SELECT 
                    COUNT(o.id) as total_orders,
                    IFNULL(SUM(o.gross_amount), 0) as gross_sales,
                    COUNT(DISTINCT o.customer_id) as total_customers
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ${whereClause}
            `;

            const [summaryResult] = await connection.execute(summaryQuery, params);
            
            const totalOrders = summaryResult[0].total_orders;
            const grossSales = parseFloat(summaryResult[0].gross_sales) || 0;
            const totalCustomers = summaryResult[0].total_customers;
            const avgTicketSize = totalOrders > 0 ? grossSales / totalOrders : 0;

            res.json({
                success: true,
                grossSales,
                totalOrders,
                totalCustomers,
                avgTicketSize
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).json({ error: "Failed to fetch dashboard summary." });
    }
});

// GET /api/dashboard/recent-transactions
router.get('/recent-transactions', async (req, res) => {
    try {
        const { branchId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (branchId && branchId !== 'all') {
                whereClause += " AND o.branch_id = ?";
                params.push(branchId);
            }

            const query = `
                SELECT 
                    o.id,
                    o.status,
                    o.total_amount,
                    o.created_at,
                    t.name as table_name,
                    c.name as customer_name
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN tables t ON o.table_id = t.id
                LEFT JOIN customers c ON o.customer_id = c.id
                ${whereClause}
                ORDER BY o.created_at DESC
                LIMIT 5
            `;

            const [transactions] = await connection.execute(query, params);

            res.json({
                success: true,
                transactions
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching recent transactions:", error);
        res.status(500).json({ error: "Failed to fetch recent transactions." });
    }
});

// GET /api/dashboard/top-items
router.get('/top-items', async (req, res) => {
    try {
        const { branchId } = req.query;
        let connection = await db.getConnection();

        try {
            let whereClause = "WHERE 1=1";
            let params = [];

            if (branchId && branchId !== 'all') {
                whereClause += " AND o.branch_id = ?";
                params.push(branchId);
            }

            const query = `
                SELECT 
                    p.id,
                    p.name as item_name,
                    c.name as category_name,
                    SUM(oi.quantity) as total_sold
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                LEFT JOIN users u ON o.user_id = u.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                ${whereClause}
                GROUP BY p.id, p.name, c.name
                ORDER BY total_sold DESC
                LIMIT 5
            `;

            const [items] = await connection.execute(query, params);

            res.json({
                success: true,
                items
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching top items:", error);
        res.status(500).json({ error: "Failed to fetch top items." });
    }
});

// GET /api/dashboard/branch-performance
router.get('/branch-performance', async (req, res) => {
    try {
        let connection = await db.getConnection();

        try {
            // Get global products count and low stock count
            const [productsRes] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE WHEN track_stock = 1 AND in_stock <= low_stock THEN 1 ELSE 0 END) as low_stock_alerts
                FROM products
            `);
            const totalProducts = productsRes[0].total_products || 0;
            const lowStockAlerts = productsRes[0].low_stock_alerts || 0;

            const query = `
                SELECT 
                    b.id as branch_id,
                    b.name as branch_name,
                    IFNULL(order_totals.transactions_today, 0) as transactions_today,
                    IFNULL(order_totals.gross_sales_today, 0) as gross_sales_today,
                    IFNULL(item_totals.items_sold_today, 0) as items_sold_today
                FROM branches b
                LEFT JOIN (
                    SELECT branch_id,
                           COUNT(*) as transactions_today,
                           SUM(gross_amount) as gross_sales_today
                    FROM orders
                    WHERE DATE(created_at) = CURDATE()
                    GROUP BY branch_id
                ) order_totals ON order_totals.branch_id = b.id
                LEFT JOIN (
                    SELECT o.branch_id, SUM(oi.quantity) as items_sold_today
                    FROM orders o
                    JOIN order_items oi ON oi.order_id = o.id
                    WHERE DATE(o.created_at) = CURDATE()
                    GROUP BY o.branch_id
                ) item_totals ON item_totals.branch_id = b.id
                ORDER BY b.id ASC
            `;

            const [performance] = await connection.execute(query);

            res.json({
                success: true,
                performance: performance.map(p => ({
                    branch_id: p.branch_id,
                    branch_name: p.branch_name,
                    transactionsToday: p.transactions_today,
                    grossSalesToday: parseFloat(p.gross_sales_today) || 0,
                    itemsSoldToday: p.items_sold_today,
                    totalProducts: totalProducts,
                    lowStockAlerts: lowStockAlerts
                }))
            });

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Error fetching branch performance:", error);
        res.status(500).json({ error: "Failed to fetch branch performance." });
    }
});

module.exports = router;
