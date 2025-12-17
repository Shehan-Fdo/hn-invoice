require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { db } = require('./db');
const { products } = require('./db/schema');
const { eq, ilike, desc, asc } = require('drizzle-orm');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Serve HTML files

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
// Export the app for Vercel serverless
module.exports = app;

// Only start the server locally (not on Vercel)
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
