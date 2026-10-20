const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { getIsConnected } = require('../config/db');

// In-memory fallback orders
let memoryOrders = [
  {
    orderId: 'ORD-719283',
    pickupCode: 'PK-402',
    pin: '4829', // 4-digit pickup PIN
    customerName: 'Aarav Sharma',
    phone: '9876543210',
    pickupSlot: '⚡ Instant Express (15-20 Mins)',
    pickupLocation: 'Station 01 — Store Counter Bay A (Indiranagar)',
    paymentMethod: 'UPI / QR Scan at Counter',
    items: [
      {
        id: 'prod-hp-1',
        name: 'Aeroponic Hybrid Cherry Tomatoes',
        price: 65,
        quantity: 2,
        unit: '350 g pod',
        image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500&q=80',
      },
      {
        id: 'prod-od-1',
        name: 'Zero-Gravity A2 Organic Pure Milk',
        price: 85,
        quantity: 1,
        unit: '1 Litre tetra',
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
      },
    ],
    totalAmount: 215,
    status: 'Ready for Pickup',
    history: [
      { status: 'Received', timestamp: new Date(Date.now() - 15 * 60000), note: 'Order logged for express pickup' },
      { status: 'Packing', timestamp: new Date(Date.now() - 8 * 60000), note: 'Bag assembled in vault' },
      { status: 'Ready for Pickup', timestamp: new Date(), note: 'Ready at Bay Counter Bay A' },
    ],
    createdAt: new Date().toISOString(),
  },
];

/**
 * Generate a random 4-digit PIN for in-store pickup
 */
function generate4DigitPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * @route   GET /api/orders
 * @desc    Get all orders (with optional status or phone filter)
 * @access  Public / Staff
 */
router.get('/', async (req, res) => {
  try {
    const { status, phone } = req.query;

    if (getIsConnected()) {
      let query = {};
      if (status) query.status = status;
      if (phone) query.phone = phone.replace(/\D/g, '').slice(-10);

      const orders = await Order.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, count: orders.length, data: orders });
    }

    let filtered = [...memoryOrders];
    if (status) filtered = filtered.filter(o => o.status === status);
    if (phone) {
      const clean = phone.replace(/\D/g, '').slice(-10);
      filtered = filtered.filter(o => o.phone.includes(clean));
    }
    return res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by orderId or MongoDB _id
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      const order = await Order.findOne({
        $or: [
          { orderId: id },
          { pickupCode: id },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        ],
      });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      return res.json({ success: true, data: order });
    }

    const order = memoryOrders.find(o => o.orderId === id || o.pickupCode === id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/orders
 * @desc    Place a new pickup order with auto-generated 4-digit pickup PIN
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      pickupSlot,
      pickupLocation,
      paymentMethod,
      items,
      totalAmount,
    } = req.body;

    if (!customerName || !phone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone number are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // Auto-generate identifiers & 4-digit pickup PIN
    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const pickupCode = `PK-${Math.floor(100 + Math.random() * 900)}`;
    // If the client provided a 4-digit PIN use it, otherwise generate a secure 4-digit PIN
    const pin = (req.body.pin && /^\d{4}$/.test(String(req.body.pin)))
      ? String(req.body.pin)
      : generate4DigitPin();

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

    const orderPayload = {
      orderId,
      pickupCode,
      pin, // Exactly 4 digits for in-store pickup
      customerName,
      phone: cleanPhone,
      pickupSlot: pickupSlot || '⚡ Instant Express (15-20 Mins)',
      pickupLocation: pickupLocation || 'Station 01 — Store Counter Bay A (Indiranagar)',
      paymentMethod: paymentMethod || 'UPI / QR Scan at Counter',
      items,
      totalAmount: Math.round(Number(totalAmount) || 0),
      status: 'Received',
      history: [
        {
          status: 'Received',
          timestamp: new Date(),
          note: 'Order submitted. Zero-G vault team preparing items.',
        },
      ],
    };

    if (getIsConnected()) {
      const newOrder = await Order.create(orderPayload);
      return res.status(201).json({
        success: true,
        message: 'Order created with 4-digit pickup PIN',
        data: newOrder,
      });
    }

    orderPayload.createdAt = new Date().toISOString();
    memoryOrders.unshift(orderPayload);
    return res.status(201).json({
      success: true,
      message: 'Order created with 4-digit pickup PIN',
      data: orderPayload,
    });
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status in lifecycle (Received -> Packing -> Ready for Pickup -> Completed)
 * @access  Staff / Admin
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['Received', 'Packing', 'Ready for Pickup', 'Completed', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const historyEntry = {
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`,
    };

    if (getIsConnected()) {
      const order = await Order.findOne({
        $or: [
          { orderId: id },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        ],
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      order.status = status;
      order.history.push(historyEntry);
      await order.save();

      return res.json({ success: true, data: order });
    }

    const order = memoryOrders.find(o => o.orderId === id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    order.history.push(historyEntry);
    return res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/orders/verify-pin
 * @desc    Verify 4-digit pickup PIN at the store counter terminal
 * @access  Public / Staff
 */
router.post('/verify-pin', async (req, res) => {
  try {
    const { orderId, pickupCode, pin } = req.body;

    if (!pin || String(pin).trim().length !== 4) {
      return res.status(400).json({ success: false, message: 'A 4-digit pickup PIN is required' });
    }

    const cleanPin = String(pin).trim();

    if (getIsConnected()) {
      const order = await Order.findOne({
        $or: [
          { orderId },
          { pickupCode },
        ],
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order reference not found' });
      }

      if (order.pin !== cleanPin) {
        return res.status(401).json({ success: false, message: 'Invalid 4-digit pickup PIN' });
      }

      return res.json({
        success: true,
        verified: true,
        message: '4-digit PIN verified successfully. Handover authorized.',
        data: order,
      });
    }

    const order = memoryOrders.find(o => o.orderId === orderId || o.pickupCode === pickupCode);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order reference not found' });
    }

    if (order.pin !== cleanPin) {
      return res.status(401).json({ success: false, message: 'Invalid 4-digit pickup PIN' });
    }

    return res.json({
      success: true,
      verified: true,
      message: '4-digit PIN verified successfully. Handover authorized.',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
