require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Product = require('./models/Product');

// Read JSON file
const rawData = fs.readFileSync('products.json');
const productsJson = JSON.parse(rawData);

// Connect
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected. Seeding data...');
        
        // Map your specific JSON structure to our clean Schema
        const cleanData = productsJson.map(item => ({
            name: item["Column1"],
            buyingPrice: item["Our buying Price"],
            sellingPrice: item["Our Selling Price"]
        }));

        try {
            await Product.deleteMany({}); // Optional: Clears DB before adding
            await Product.insertMany(cleanData);
            console.log('Data successfully uploaded!');
            process.exit();
        } catch (error) {
            console.error('Error seeding:', error);
            process.exit(1);
        }
    })
    .catch(err => console.log(err));