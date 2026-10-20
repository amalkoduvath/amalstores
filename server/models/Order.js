const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: '1 unit' },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pickupCode: {
      type: String,
      required: true,
      index: true,
    },
    // 4-Digit In-Store Pickup Verification PIN (e.g. '4829')
    pin: {
      type: String,
      required: true,
      match: [/^\d{4}$/, 'Pickup PIN must be exactly 4 digits'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    pickupSlot: {
      type: String,
      default: '⚡ Instant Express (15-20 Mins)',
    },
    pickupLocation: {
      type: String,
      default: 'Station 01 — Store Counter Bay A (Indiranagar)',
    },
    paymentMethod: {
      type: String,
      default: 'UPI / QR Scan at Counter',
    },
    items: {
      type: [orderItemSchema],
      validate: [val => val.length > 0, 'Order must contain at least one item'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Received', 'Packing', 'Ready for Pickup', 'Completed', 'Cancelled'],
      default: 'Received',
      index: true,
    },
    history: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

module.exports = Order;
