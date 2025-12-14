# HN Electronics - Invoice Management System

A professional invoice management system for HN Electronics with product management and PDF/Image export capabilities.

## Features

- 📝 Create and manage invoices
- 📦 Product management (Add, Edit, Delete)
- 💰 Profit tracking
- 📄 Export invoices as PDF or PNG
- 📱 Fully responsive design for mobile and desktop

## Tech Stack

- **Backend**: Node.js, Express, MongoDB
- **Frontend**: HTML, CSS, JavaScript
- **Database**: MongoDB (with Mongoose)

## Environment Variables

Create a `.env` file in the root directory:

```
MONGO_URI=your_mongodb_connection_string
```

## Deployment on Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your GitHub repository
3. Add your `MONGO_URI` environment variable in Vercel project settings
4. Deploy!

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your MongoDB URI

3. Run the server:
```bash
npm start
```

4. Open http://localhost:3000 in your browser

## API Endpoints

- `GET /api/search?q=query` - Search products
- `POST /api/products` - Add single product
- `POST /api/products/bulk` - Bulk add products
- `GET /api/products` - Get all products
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

## Pages

- `/` - Create Invoice page
- `/admin.html` - Manage Products page

## License

ISC
# hn-invoice
