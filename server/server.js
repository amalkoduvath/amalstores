require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const Product = require('./models/Product');
const { getIsConnected } = require('./config/db');

// Import Route Handlers
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'https://amalstores.vercel.app',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or file://)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback to ensure no deployment breaks
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Explicit POST /api/products route directly defined for local MongoDB freshcart database
app.post('/api/products', async (req, res, next) => {
  try {
    const { name, category, price, mrp, unit, image, stockStatus, description } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, message: 'name, category, and price are required' });
    }

    const generatedId = req.body.id || `prod-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const productPayload = {
      id: generatedId,
      name: String(name).trim(),
      category: String(category).trim(),
      price: Number(price),
      mrp: mrp ? Number(mrp) : null,
      unit: unit ? String(unit).trim() : '1 unit',
      image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
      stockStatus: stockStatus || 'In Stock',
      inStock: stockStatus !== 'Out of Stock',
      description: description ? String(description).trim() : '',
    };

    if (getIsConnected()) {
      const newProduct = await Product.create(productPayload);
      return res.status(201).json({ success: true, source: 'mongodb', data: newProduct });
    }

    // Pass to productRoutes router fallback if db is not connected
    return next();
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'FreshCart Zero-G API Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`
  🚀 ========================================================
     FreshCart API Backend is running!
     • URL: http://localhost:${PORT}
     • Health: http://localhost:${PORT}/api/health
     • Products: http://localhost:${PORT}/api/products
     • Orders: http://localhost:${PORT}/api/orders (with 4-digit PINs)
     • Users: http://localhost:${PORT}/api/users
  ========================================================
  `);
});

module.exports = app;
