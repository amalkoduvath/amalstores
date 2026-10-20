const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { getIsConnected } = require('../config/db');

// In-memory fallback users
let memoryUsers = [
  {
    name: 'Aarav Sharma',
    phone: '9876543210',
    email: 'aarav@freshcart.in',
    role: 'customer',
    preferredStation: 'Station 01 — Store Counter Bay A (Indiranagar)',
    isVerified: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Amal (Admin)',
    phone: '9999999999',
    email: 'amalkppdm07@gmail.com',
    role: 'admin',
    preferredStation: 'Station 01 — Store Counter Bay A (Indiranagar)',
    isVerified: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * @route   GET /api/users
 * @desc    Get all registered users
 * @access  Admin/Staff
 */
router.get('/', async (req, res) => {
  try {
    if (getIsConnected()) {
      const users = await User.find({}).sort({ createdAt: -1 });
      return res.json({ success: true, count: users.length, data: users });
    }
    return res.json({ success: true, count: memoryUsers.length, data: memoryUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/users/:identifier
 * @desc    Get user by phone or ID
 * @access  Public
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    if (getIsConnected()) {
      const user = await User.findOne({
        $or: [
          { phone: identifier },
          { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null },
        ],
      });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.json({ success: true, data: user });
    }

    const user = memoryUsers.find(u => u.phone === identifier || u.id === identifier);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/users
 * @desc    Register or verify/update customer by phone number
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, preferredStation, role } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and 10-digit phone number are required' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

    if (getIsConnected()) {
      let user = await User.findOne({ phone: cleanPhone });
      if (user) {
        user.name = name;
        if (email) user.email = email;
        if (preferredStation) user.preferredStation = preferredStation;
        user.lastLoginAt = new Date();
        await user.save();
        return res.json({ success: true, isNew: false, data: user });
      }

      user = await User.create({
        name,
        phone: cleanPhone,
        email: email || '',
        preferredStation: preferredStation || 'Station 01 — Store Counter Bay A (Indiranagar)',
        role: role || 'customer',
        isVerified: true,
      });

      return res.status(201).json({ success: true, isNew: true, data: user });
    }

    // In-memory fallback
    let user = memoryUsers.find(u => u.phone === cleanPhone);
    if (user) {
      user.name = name;
      if (email) user.email = email;
      if (preferredStation) user.preferredStation = preferredStation;
      return res.json({ success: true, isNew: false, data: user });
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      phone: cleanPhone,
      email: email || '',
      preferredStation: preferredStation || 'Station 01 — Store Counter Bay A (Indiranagar)',
      role: role || 'customer',
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    memoryUsers.unshift(newUser);

    return res.status(201).json({ success: true, isNew: true, data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
