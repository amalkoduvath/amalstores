const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { DEFAULT_PRODUCTS } = require('../seed/defaultData');
const { getIsConnected } = require('../config/db');

// In-memory product store for zero-friction fallback when MongoDB is offline
let memoryProducts = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));

/**
 * @route   GET /api/products
 * @desc    Get all products with optional filters (category, search, inStock)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, inStock } = req.query;

    if (getIsConnected()) {
      let query = {};
      if (category && category !== 'All') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
      if (inStock !== undefined) {
        query.inStock = inStock === 'true';
      }

      let products = await Product.find(query).sort({ createdAt: -1 });

      // Auto-seed if collection is empty
      if (products.length === 0 && !category && !search) {
        await Product.insertMany(DEFAULT_PRODUCTS);
        products = await Product.find({}).sort({ createdAt: -1 });
      }

      return res.json({
        success: true,
        source: 'mongodb',
        count: products.length,
        data: products,
      });
    }

    // Fallback to in-memory store
    let filtered = [...memoryProducts];
    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }
    if (inStock !== undefined) {
      const wantStock = inStock === 'true';
      filtered = filtered.filter(p => p.inStock === wantStock);
    }

    return res.json({
      success: true,
      source: 'memory-fallback',
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      const product = await Product.findOne({ $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.json({ success: true, data: product });
    }

    const product = memoryProducts.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Admin/Staff
 */
router.post('/', async (req, res) => {
  try {
    const { name, category, price, mrp, unit, image, stockStatus, description } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, message: 'name, category, and price are required' });
    }

    const generatedId = req.body.id || `prod-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const productPayload = {
      id: generatedId,
      name,
      category,
      price: Number(price),
      mrp: mrp ? Number(mrp) : null,
      unit: unit || '1 unit',
      image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
      stockStatus: stockStatus || 'In Stock',
      inStock: stockStatus !== 'Out of Stock',
      description: description || '',
    };

    if (getIsConnected()) {
      const newProduct = await Product.create(productPayload);
      return res.status(201).json({ success: true, data: newProduct });
    }

    memoryProducts.unshift(productPayload);
    return res.status(201).json({ success: true, data: productPayload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update product details or stock
 * @access  Admin/Staff
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.stockStatus) {
      updates.inStock = updates.stockStatus !== 'Out of Stock';
    }

    if (getIsConnected()) {
      const updated = await Product.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        updates,
        { new: true, runValidators: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.json({ success: true, data: updated });
    }

    const idx = memoryProducts.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    memoryProducts[idx] = { ...memoryProducts[idx], ...updates };
    return res.json({ success: true, data: memoryProducts[idx] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Admin/Staff
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      const deleted = await Product.findOneAndDelete({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.json({ success: true, message: 'Product deleted', id });
    }

    memoryProducts = memoryProducts.filter(p => p.id !== id);
    return res.json({ success: true, message: 'Product deleted', id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/products/reset
 * @desc    Reset products to default catalog
 * @access  Admin
 */
router.post('/reset', async (req, res) => {
  try {
    if (getIsConnected()) {
      await Product.deleteMany({});
      await Product.insertMany(DEFAULT_PRODUCTS);
      const products = await Product.find({}).sort({ createdAt: -1 });
      return res.json({ success: true, count: products.length, data: products });
    }
    memoryProducts = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
    return res.json({ success: true, count: memoryProducts.length, data: memoryProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
