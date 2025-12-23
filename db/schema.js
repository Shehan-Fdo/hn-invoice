const { pgTable, text, serial, numeric, timestamp } = require("drizzle-orm/pg-core");

const products = pgTable("products", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    buyingPrice: numeric("buying_price"),
    sellingPrice: numeric("selling_price").notNull(),
});

const sales = pgTable("sales", {
    id: serial("id").primaryKey(),
    date: timestamp("date").defaultNow().notNull(),
    items: text("items").notNull(), // JSON string of invoice items
    subtotal: numeric("subtotal").notNull(),
    profit: numeric("profit").notNull(),
    status: text("status").default('completed').notNull(), // 'completed' or 'draft'
});

module.exports = { products, sales };
