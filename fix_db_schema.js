require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function main() {
    try {
        console.log("Checking and updating 'sales' table schema...");

        // Add status column if it doesn't exist
        // Note: 'IF NOT EXISTS' for column is supported in Postgres 9.6+
        await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'`;

        console.log("✅ Successfully added 'status' column to 'sales' table.");
    } catch (err) {
        console.error("❌ Error updating DB:", err);
    }
}

main();
