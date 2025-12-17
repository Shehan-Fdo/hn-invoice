const { pgTable, text, serial, numeric } = require("drizzle-orm/pg-core");

const products = pgTable("products", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    buyingPrice: numeric("buying_price"),
    sellingPrice: numeric("selling_price").notNull(),
});

module.exports = { products };
