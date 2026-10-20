require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { DEFAULT_PRODUCTS } = require('./defaultData');

const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freshcart';

  try {
    console.log(`Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB');

    // 1. Clear existing collections
    await Product.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    console.log('✓ Cleared old products, users, and orders');

    // 2. Insert Products
    const createdProducts = await Product.insertMany(DEFAULT_PRODUCTS);
    console.log(`✓ Inserted ${createdProducts.length} default produce items`);

    // 3. Insert Sample Users
    const users = await User.insertMany([
      {
        name: 'Aarav Sharma',
        phone: '9876543210',
        email: 'aarav@freshcart.in',
        role: 'customer',
        preferredStation: 'Station 01 — Store Counter Bay A (Indiranagar)',
        isVerified: true,
      },
      {
        name: 'Amal (Admin)',
        phone: '9999999999',
        email: 'amalkppdm07@gmail.com',
        role: 'admin',
        preferredStation: 'Station 01 — Store Counter Bay A (Indiranagar)',
        isVerified: true,
      },
    ]);
    console.log(`✓ Inserted ${users.length} sample users`);

    // 4. Insert Sample Order with 4-Digit Pickup PIN
    const sampleOrder = await Order.create({
      orderId: 'ORD-582914',
      pickupCode: 'PK-318',
      pin: '7392', // 4-digit pickup PIN
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
        { status: 'Received', timestamp: new Date(Date.now() - 20 * 60000), note: 'Order logged for express pickup' },
        { status: 'Packing', timestamp: new Date(Date.now() - 10 * 60000), note: 'Staff packed items in vault' },
        { status: 'Ready for Pickup', timestamp: new Date(), note: 'Bag ready at Counter Bay A' },
      ],
    });
    console.log(`✓ Inserted sample order ${sampleOrder.orderId} with 4-digit PIN: ${sampleOrder.pin}`);

    console.log('\n🎉 FreshCart Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
