require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { db } = require('./db');
const { products, sales } = require('./db/schema');
const { eq, ilike, desc, asc } = require('drizzle-orm');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] })); // Serve HTML files with extensionless support

// Request Logger Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Explicitly serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. Search Products
app.get('/api/search', async (req, res) => {
    const query = req.query.q;

    // Validate query - must be a non-empty string
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    // Sanitize the query - escape special LIKE pattern characters
    const sanitizedQuery = query.replace(/[%_]/g, '\\$&');

    try {
        const result = await db.select().from(products)
            .where(ilike(products.name, `%${sanitizedQuery}%`))
            .limit(10);

        // Cast numeric strings to numbers
        const formatted = result.map(p => ({
            ...p,
            buyingPrice: Number(p.buyingPrice),
            sellingPrice: Number(p.sellingPrice)
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Add Single Product
app.post('/api/products', async (req, res) => {
    try {
        await db.insert(products).values(req.body);
        res.json({ message: 'Product added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Bulk Add Products
app.post('/api/products/bulk', async (req, res) => {
    try {
        // Expecting array of objects
        await db.insert(products).values(req.body);
        res.json({ message: 'Bulk products added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get All Products
app.get('/api/products', async (req, res) => {
    try {
        const result = await db.select().from(products).orderBy(asc(products.name));

        // Cast numeric strings to numbers
        const formatted = result.map(p => ({
            ...p,
            buyingPrice: Number(p.buyingPrice),
            sellingPrice: Number(p.sellingPrice)
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Update Product
app.put('/api/products/:id', async (req, res) => {
    try {
        await db.update(products)
            .set(req.body)
            .where(eq(products.id, Number(req.params.id)));
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.delete(products)
            .where(eq(products.id, Number(req.params.id)));
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ SALES ENDPOINTS ============

// 7. Save a new sale
app.post('/api/sales', async (req, res) => {
    try {
        const { items, subtotal, profit } = req.body;

        // Validate required fields
        if (!items || !subtotal) {
            return res.status(400).json({ error: 'Items and subtotal are required' });
        }

        await db.insert(sales).values({
            items: JSON.stringify(items),
            subtotal: String(subtotal),
            profit: String(profit || 0),
            status: req.body.status || 'completed'
        });

        res.json({ message: 'Sale saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Get all sales (sorted by date, newest first)
app.get('/api/sales', async (req, res) => {
    try {
        const result = await db.select().from(sales).orderBy(desc(sales.date));

        // Parse items JSON and format numbers
        const formatted = result.map(s => ({
            ...s,
            items: JSON.parse(s.items),
            subtotal: Number(s.subtotal),
            profit: Number(s.profit)
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8.1 Get single sale by ID
app.get('/api/sales/:id', async (req, res) => {
    try {
        const result = await db.select().from(sales).where(eq(sales.id, Number(req.params.id)));

        if (result.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const sale = result[0];
        const formatted = {
            ...sale,
            items: JSON.parse(sale.items),
            subtotal: Number(sale.subtotal),
            profit: Number(sale.profit)
        };

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 8.2 Update sale (for edits and drafts)
app.put('/api/sales/:id', async (req, res) => {
    try {
        const { items, subtotal, profit, status } = req.body;

        await db.update(sales)
            .set({
                items: JSON.stringify(items),
                subtotal: String(subtotal),
                profit: String(profit || 0),
                status: status || 'completed' // Default to completed if not specified
            })
            .where(eq(sales.id, Number(req.params.id)));

        res.json({ message: 'Sale updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Delete a sale
app.delete('/api/sales/:id', async (req, res) => {
    try {
        await db.delete(sales)
            .where(eq(sales.id, Number(req.params.id)));
        res.json({ message: 'Sale deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export the app for Vercel serverless
module.exports = app;

// Only start the server locally (not on Vercel)
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
