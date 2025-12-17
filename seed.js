require('dotenv').config();
const { db } = require('./db');
const { products } = require('./db/schema');
const fs = require('fs');
const path = require('path');

// Read JSON file with error handling
const jsonPath = path.join(__dirname, 'products.json');
if (!fs.existsSync(jsonPath)) {
    console.error('Error: products.json file not found!');
    console.error('Please create a products.json file with your product data.');
    process.exit(1);
}

const rawData = fs.readFileSync(jsonPath, 'utf8');
let productsJson;
try {
    productsJson = JSON.parse(rawData);
} catch (parseError) {
    console.error('Error: Invalid JSON in products.json:', parseError.message);
    process.exit(1);
}

async function seed() {
    console.log('Connected. Seeding data...');

    // Map your specific JSON structure to our clean Schema
    const cleanData = productsJson.map(item => ({
        name: item["Column1"],
        buyingPrice: item["Our buying Price"],
        sellingPrice: item["Our Selling Price"]
    }));

    try {
        await db.delete(products); // Optional: Clears DB before adding
        await db.insert(products).values(cleanData);
        console.log('Data successfully uploaded!');
        process.exit();
    } catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}

seed();