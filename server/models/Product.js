const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      default: '1 unit',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
    },
    mrp: {
      type: Number,
      default: null,
    },
    stockStatus: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock'],
      default: 'In Stock',
      index: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
    },
    description: {
      type: String,
      default: '',
    },
    badge: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save middleware to synchronize inStock with stockStatus
productSchema.pre('save', function (next) {
  if (this.stockStatus === 'Out of Stock') {
    this.inStock = false;
  } else {
    this.inStock = true;
  }
  next();
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;
