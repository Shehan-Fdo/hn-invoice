const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    buyingPrice: Number, // Storing this for your records
    sellingPrice: { type: Number, required: true }
});

module.exports = mongoose.model('Product', productSchema);