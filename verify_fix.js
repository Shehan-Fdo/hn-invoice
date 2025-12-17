require('dotenv').config();
const { db } = require('./db');
const { products } = require('./db/schema');

async function test() {
    console.log('Testing DB connection and formatting...');
    try {
        const result = await db.select().from(products).limit(1);

        if (result.length === 0) {
            console.log('No products found in DB to test formatting.');
        } else {
            console.log('Raw result sample:', result[0]);
            console.log('Raw buyingPrice type:', typeof result[0].buyingPrice);

            // Test the formatting logic used in server.js
            const formatted = result.map(p => ({
                ...p,
                buyingPrice: Number(p.buyingPrice),
                sellingPrice: Number(p.sellingPrice)
            }));

            console.log('Formatted result sample:', formatted[0]);
            console.log('Formatted buyingPrice type:', typeof formatted[0].buyingPrice);

            if (typeof formatted[0].buyingPrice === 'number') {
                console.log('SUCCESS: buyingPrice is a number.');
            } else {
                console.log('FAILURE: buyingPrice is NOT a number.');
            }
        }
    } catch (err) {
        console.error('Error querying DB:', err);
    }
    process.exit(0);
}

test();
