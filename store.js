/**
 * AURA Zero-G Grocery — Shared Real-Time Database Engine (v5)
 * Handles Products, Orders, Admin Auth, PIN Verification & BroadcastChannel Sync
 */

const AURA_DB = (() => {
  const STORAGE_KEYS = {
    PRODUCTS: 'aura_products_v5',
    ORDERS:   'aura_orders_v5',
    AUTH:     'aura_auth_v5'
  };

  // ─── ADMIN CREDENTIALS (hardcoded gate) ───────────────────────────────────
  // Both values must match EXACTLY (case-insensitive Gmail, case-sensitive password).
  // The admin panel at admin.html is ONLY accessible when BOTH match.
  const ADMIN_GMAIL    = 'amalkppdm07@gmail.com'; // ← active Gmail
  const ADMIN_PASSWORD = 'Amal@Store2025';         // ← active admin password
  // ─────────────────────────────────────────────────────────────────────────

  // ─── DEV MODE — set to false before sharing / deploying ──────────────────
  const DEV_MODE = true;
  if (DEV_MODE) {
    console.group('%c🔑 AURA Admin Credentials [DEV MODE]', 'color:#22d3ee;font-weight:bold;font-size:14px;');
    console.log('%cGmail   :', 'color:#94a3b8;', ADMIN_GMAIL);
    console.log('%cPassword:', 'color:#94a3b8;', ADMIN_PASSWORD);
    console.log('%c⚠ Set DEV_MODE = false in store.js before going live!', 'color:#fbbf24;font-style:italic;');
    console.groupEnd();
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ─── SUPABASE CLOUD DATABASE CONFIGURATION ──────────────────────────────
  // Connect your live Supabase project to sync orders across mobile & desktop devices anywhere in the world!
  // Table name: 'orders' with fields: customer_name, phone_number, pickup_pin, status, time_slot, etc.
  const SUPABASE_CONFIG = {
    URL: '',      // e.g. 'https://xyzcompany.supabase.co'
    ANON_KEY: ''  // e.g. 'eyJhbGciOiJIUzI1NiIsIn...'
  };

  // Allow configuring at runtime via localStorage so user can enter keys via UI or edit here
  const savedCloudConfig = (() => {
    try {
      const saved = localStorage.getItem('aura_cloud_db_config');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  })();

  const ACTIVE_SUPABASE_URL = savedCloudConfig.url || SUPABASE_CONFIG.URL;
  const ACTIVE_SUPABASE_KEY = savedCloudConfig.key || SUPABASE_CONFIG.ANON_KEY;

  let supabaseClient = null;
  if (typeof window !== 'undefined' && window.supabase && ACTIVE_SUPABASE_URL && ACTIVE_SUPABASE_KEY) {
    try {
      supabaseClient = window.supabase.createClient(ACTIVE_SUPABASE_URL, ACTIVE_SUPABASE_KEY);
      console.log('%c⚡ Supabase Cloud Database Connected', 'color:#10b981;font-weight:bold;');
    } catch (err) {
      console.warn('Supabase init notice:', err);
    }
  }

  const SYNC_CHANNEL = 'aura_sync_v5';
  let broadcastChannel = null;
  try { broadcastChannel = new BroadcastChannel(SYNC_CHANNEL); } catch (e) {}

  // Category → neon color and styling mapping (includes futuristic anti-gravity categories)
  const CATEGORY_THEME = {
    'Hydroponics': {
      neon: 'emerald', border: 'border-emerald-500/40', glow: 'rgba(16,185,129,0.4)',
      gradient: 'from-emerald-950/60 via-slate-900 to-black', emoji: '🌱', badge: 'bg-emerald-500/10 text-emerald-400'
    },
    'Synthesized Proteins': {
      neon: 'violet', border: 'border-violet-500/40', glow: 'rgba(139,92,246,0.4)',
      gradient: 'from-violet-950/60 via-slate-900 to-black', emoji: '🧬', badge: 'bg-violet-500/10 text-violet-400'
    },
    'Orbital Dairy': {
      neon: 'cyan', border: 'border-cyan-500/40', glow: 'rgba(6,182,212,0.4)',
      gradient: 'from-cyan-950/60 via-slate-900 to-black', emoji: '🥛', badge: 'bg-cyan-500/10 text-cyan-400'
    },
    'Zero-G Pantry': {
      neon: 'amber', border: 'border-amber-500/40', glow: 'rgba(245,158,11,0.4)',
      gradient: 'from-amber-950/60 via-slate-900 to-black', emoji: '🌾', badge: 'bg-amber-500/10 text-amber-400'
    },
    'Beverages & Elixirs': {
      neon: 'cyan', border: 'border-cyan-500/40', glow: 'rgba(6,182,212,0.4)',
      gradient: 'from-cyan-950/60 via-slate-900 to-black', emoji: '⚡', badge: 'bg-cyan-500/10 text-cyan-400'
    },
    'Snacks & Rations': {
      neon: 'fuchsia', border: 'border-fuchsia-500/40', glow: 'rgba(217,70,239,0.4)',
      gradient: 'from-fuchsia-950/60 via-slate-900 to-black', emoji: '🍿', badge: 'bg-fuchsia-500/10 text-fuchsia-400'
    },
    // Backward compatibility for standard labels
    'Fruits': {
      neon: 'rose', border: 'border-rose-500/40', glow: 'rgba(244,63,94,0.4)',
      gradient: 'from-rose-950/60 via-slate-900 to-black', emoji: '🍎', badge: 'bg-rose-500/10 text-rose-400'
    },
    'Vegetables': {
      neon: 'emerald', border: 'border-emerald-500/40', glow: 'rgba(16,185,129,0.4)',
      gradient: 'from-emerald-950/60 via-slate-900 to-black', emoji: '🥦', badge: 'bg-emerald-500/10 text-emerald-400'
    },
    'Staples': {
      neon: 'amber', border: 'border-amber-500/40', glow: 'rgba(245,158,11,0.4)',
      gradient: 'from-amber-950/60 via-slate-900 to-black', emoji: '🌾', badge: 'bg-amber-500/10 text-amber-400'
    },
    'Beverages': {
      neon: 'cyan', border: 'border-cyan-500/40', glow: 'rgba(6,182,212,0.4)',
      gradient: 'from-cyan-950/60 via-slate-900 to-black', emoji: '☕', badge: 'bg-cyan-500/10 text-cyan-400'
    },
    'Snacks': {
      neon: 'fuchsia', border: 'border-fuchsia-500/40', glow: 'rgba(217,70,239,0.4)',
      gradient: 'from-fuchsia-950/60 via-slate-900 to-black', emoji: '🍿', badge: 'bg-fuchsia-500/10 text-fuchsia-400'
    }
  };

  const INITIAL_PRODUCTS = [
    // Hydroponics
    {
      id: 'prod-hp-1', name: 'Aeroponic Hybrid Cherry Tomatoes', category: 'Hydroponics',
      unit: '350 g pod', price: 65, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500&q=80',
    },
    {
      id: 'prod-hp-2', name: 'Zero-G Crisp Butterhead Lettuce', category: 'Hydroponics',
      unit: '1 live root head', price: 80, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=500&q=80',
    },
    {
      id: 'prod-hp-3', name: 'Bio-Luminescent Dragonfruit (Pitaya)', category: 'Hydroponics',
      unit: '1 pc (420 g)', price: 145, stockStatus: 'Low Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=500&q=80',
    },
    // Synthesized Proteins
    {
      id: 'prod-sp-1', name: 'Pure Mycosphere Plant Protein Chunks', category: 'Synthesized Proteins',
      unit: '400 g pouch', price: 210, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
    },
    {
      id: 'prod-sp-2', name: 'Fortified Organic Spirulina Tofu Cube', category: 'Synthesized Proteins',
      unit: '300 g vacuum pack', price: 125, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=500&q=80',
    },
    {
      id: 'prod-sp-3', name: 'Synthesized Almond-Pea Whey isolate', category: 'Synthesized Proteins',
      unit: '500 g jar', price: 490, stockStatus: 'Low Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&q=80',
    },
    // Orbital Dairy
    {
      id: 'prod-od-1', name: 'Zero-Gravity A2 Organic Pure Milk', category: 'Orbital Dairy',
      unit: '1 Litre tetra', price: 85, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
    },
    {
      id: 'prod-od-2', name: 'Synthesized Cultured Greek Skyr Curd', category: 'Orbital Dairy',
      unit: '400 g cup', price: 95, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80',
    },
    {
      id: 'prod-od-3', name: 'Grass-Fed Vedic Cultured Ghee', category: 'Orbital Dairy',
      unit: '500 ml jar', price: 420, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&q=80',
    },
    // Zero-G Pantry
    {
      id: 'prod-zg-1', name: 'De-Hydrated Royal Basmati Grain', category: 'Zero-G Pantry',
      unit: '1 kg pack', price: 180, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
    },
    {
      id: 'prod-zg-2', name: 'Cold-Pressed Himalayan Walnut Oil', category: 'Zero-G Pantry',
      unit: '500 ml flask', price: 340, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=500&q=80',
    },
    {
      id: 'prod-zg-3', name: 'Unrefined Deep-Sea Trace Pink Salt', category: 'Zero-G Pantry',
      unit: '1 kg container', price: 55, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&q=80',
    },
    // Beverages & Elixirs
    {
      id: 'prod-be-1', name: 'Bio-Charged Matcha Green Tea Tonic', category: 'Beverages & Elixirs',
      unit: '330 ml can', price: 110, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80',
    },
    {
      id: 'prod-be-2', name: 'Single-Origin Ethiopian Cold Brew Extract', category: 'Beverages & Elixirs',
      unit: '250 ml flask', price: 160, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80',
    },
    {
      id: 'prod-be-3', name: 'Electrolyte Hyper-Hydration Spark', category: 'Beverages & Elixirs',
      unit: '500 ml bottle', price: 75, stockStatus: 'Low Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
    },
    // Snacks & Rations
    {
      id: 'prod-sr-1', name: 'Freeze-Dried Dark Chocolate Space Drops', category: 'Snacks & Rations',
      unit: '120 g pouch', price: 140, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&q=80',
    },
    {
      id: 'prod-sr-2', name: 'Spiced Roasted Foxnut Pops (Makhana)', category: 'Snacks & Rations',
      unit: '100 g bag', price: 90, stockStatus: 'In Stock', inStock: true,
      image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80',
    },
    {
      id: 'prod-sr-3', name: 'Quinoa & Sea Salt Zero-Gravity Crisps', category: 'Snacks & Rations',
      unit: '150 g bag', price: 85, stockStatus: 'Out of Stock', inStock: false,
      image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=500&q=80',
    }
  ];

  function broadcastChange(type, payload = {}) {
    const message = { type, payload, timestamp: Date.now() };
    if (broadcastChannel) {
      try { broadcastChannel.postMessage(message); } catch (e) {}
    }
    localStorage.setItem('aura_sync_event_v5', JSON.stringify(message));
  }

  function themeFor(category) {
    return CATEGORY_THEME[category] || CATEGORY_THEME['Zero-G Pantry'] || {
      neon: 'cyan', border: 'border-cyan-500/40', glow: 'rgba(6,182,212,0.4)',
      gradient: 'from-cyan-950/60 via-slate-900 to-black', emoji: '📦', badge: 'bg-cyan-500/10 text-cyan-400'
    };
  }

  return {
    CATEGORY_THEME,

    // ─── Products ────────────────────────────────────────────────────────────

    getProducts() {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return [...INITIAL_PRODUCTS];
      }
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [...INITIAL_PRODUCTS];
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return [...INITIAL_PRODUCTS];
      }
    },

    addProduct(product) {
      if (!product.name || !product.name.trim()) return { error: 'Product title / name is required.' };
      if (!product.category) return { error: 'Category selection is required.' };
      if (!product.price || isNaN(Number(product.price)) || Number(product.price) <= 0) {
        return { error: 'A valid positive price in ₹ is required.' };
      }

      const status = product.stockStatus || (product.inStock === false ? 'Out of Stock' : 'In Stock');
      const inStock = status !== 'Out of Stock';

      const theme = themeFor(product.category);
      const newProduct = {
        id: 'prod-' + Date.now(),
        name: product.name.trim(),
        category: product.category,
        unit: product.unit ? product.unit.trim() : '1 unit',
        price: Math.round(Number(product.price)),
        stockStatus: status, // 'In Stock' | 'Low Stock' | 'Out of Stock'
        inStock: inStock,
        image: product.image || '', // URL or base64 Data URI
        neon: theme.neon,
        borderClass: theme.border,
        glowColor: theme.glow,
        gradient: theme.gradient,
        createdAt: new Date().toISOString()
      };

      const products = this.getProducts();
      products.unshift(newProduct);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      broadcastChange('PRODUCTS_UPDATED', { action: 'ADD', product: newProduct });
      return newProduct;
    },

    updateProduct(id, updates) {
      const products = this.getProducts();
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) return null;

      if (updates.category) {
        const theme = themeFor(updates.category);
        updates.neon = theme.neon;
        updates.borderClass = theme.border;
        updates.glowColor = theme.glow;
        updates.gradient = theme.gradient;
      }

      if (updates.stockStatus) {
        updates.inStock = updates.stockStatus !== 'Out of Stock';
      } else if (updates.inStock !== undefined) {
        updates.stockStatus = updates.inStock ? 'In Stock' : 'Out of Stock';
      }

      products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      broadcastChange('PRODUCTS_UPDATED', { action: 'UPDATE', product: products[idx] });
      return products[idx];
    },

    toggleStock(id) {
      const products = this.getProducts();
      const p = products.find(p => p.id === id);
      if (!p) return null;

      if (p.stockStatus === 'In Stock') {
        p.stockStatus = 'Low Stock';
        p.inStock = true;
      } else if (p.stockStatus === 'Low Stock') {
        p.stockStatus = 'Out of Stock';
        p.inStock = false;
      } else {
        p.stockStatus = 'In Stock';
        p.inStock = true;
      }

      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      broadcastChange('PRODUCTS_UPDATED', { action: 'TOGGLE_STOCK', id, stockStatus: p.stockStatus, inStock: p.inStock });
      return p;
    },

    deleteProduct(id) {
      const products = this.getProducts().filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      broadcastChange('PRODUCTS_UPDATED', { action: 'DELETE', id });
      return true;
    },

    resetToDefaultProducts() {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      broadcastChange('PRODUCTS_UPDATED', { action: 'RESET' });
      return INITIAL_PRODUCTS;
    },

    // ─── Orders ──────────────────────────────────────────────────────────────

    getOrders() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    },

    getOrderById(orderId) {
      return this.getOrders().find(o => o.id === orderId) || null;
    },

    /**
     * Places a new order with 6-digit confirmation PIN & Pickup Code
     * Order status lifecycle: 'Received' → 'Packing' → 'Ready for Pickup' → 'Completed'
     */
    placeOrder(orderData) {
      const orders = this.getOrders();
      const pickupCode = 'PK-' + Math.floor(100 + Math.random() * 900);
      const pin = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit secret PIN

      const newOrder = {
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        pickupCode,
        pin, // 6-digit verification PIN for counter handover
        timestamp: new Date().toISOString(),
        customerName:   orderData.customerName   || 'Cosmic Shopper',
        phone:          orderData.phone          || '',
        email:          orderData.email          || '',
        pickupLocation: orderData.pickupLocation || 'Station 01 - Cyber Hub Indiranagar',
        pickupSlot:     orderData.pickupSlot     || 'Instant Express (15-20 Mins)',
        orderType:      'In-Store Pickup',
        items:          orderData.items          || [],
        totalAmount:    Math.round(Number(orderData.totalAmount) || 0),
        paymentMethod:  orderData.paymentMethod  || 'UPI (Zero-G QR)',
        // Status lifecycle: Received -> Packing -> Ready for Pickup -> Completed
        status:         'Received',
        history: [
          { status: 'Received', at: new Date().toISOString() }
        ]
      };

      orders.unshift(newOrder);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      broadcastChange('ORDERS_UPDATED', { action: 'NEW_ORDER', order: newOrder });

      // ── Cloud Database Insertion (Supabase 'orders' table) ──
      if (supabaseClient) {
        try {
          supabaseClient
            .from('orders')
            .insert([{
              id: newOrder.id,
              customer_name: newOrder.customerName,
              phone_number: newOrder.phone,
              pickup_pin: newOrder.pin,
              status: newOrder.status,
              time_slot: newOrder.pickupSlot,
              pickup_code: newOrder.pickupCode,
              pickup_location: newOrder.pickupLocation,
              total_amount: newOrder.totalAmount,
              payment_method: newOrder.paymentMethod,
              items: newOrder.items,
              created_at: newOrder.timestamp
            }])
            .then(({ data, error }) => {
              if (error) {
                console.warn('Supabase order insert note:', error.message);
              } else {
                console.log('⚡ Order synced to Supabase cloud table ("orders"):', newOrder.id);
              }
            });
        } catch (err) {
          console.warn('Supabase sync error:', err);
        }
      }

      return newOrder;
    },

    updateOrderStatus(orderId, newStatus) {
      const orders = this.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return null;

      order.status = newStatus;
      if (!order.history) order.history = [];
      order.history.push({ status: newStatus, at: new Date().toISOString() });

      if (newStatus === 'Packing')          order.packingAt   = new Date().toISOString();
      if (newStatus === 'Ready for Pickup') order.readyAt     = new Date().toISOString();
      if (newStatus === 'Completed')        order.completedAt = new Date().toISOString();

      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      broadcastChange('ORDERS_UPDATED', { action: 'STATUS_CHANGE', orderId, status: newStatus, order });

      // ── Sync status change to Supabase cloud table ──
      if (supabaseClient) {
        try {
          supabaseClient
            .from('orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .then(({ error }) => {
              if (error) console.warn('Supabase status update note:', error.message);
            });
        } catch (err) {}
      }

      return order;
    },

    /**
     * Staff PIN verification tool
     * Finds active order matching 6-digit PIN or pickup code
     */
    verifyPin(inputPin) {
      const query = String(inputPin || '').trim().replace(/\s+/g, '');
      if (!query || query.length < 3) return { success: false, message: 'Please enter a valid PIN or Pickup code.' };

      const orders = this.getOrders();
      const match = orders.find(o => o.pin === query || o.pickupCode.toUpperCase() === query.toUpperCase() || o.id === query);
      if (!match) {
        return { success: false, message: 'No order found with this PIN / Code. Please check the customer pass.' };
      }

      return { success: true, order: match };
    },

    /**
     * Handover confirmation via verified PIN
     */
    completeOrderByPin(inputPin) {
      const check = this.verifyPin(inputPin);
      if (!check.success) return check;

      const order = check.order;
      if (order.status === 'Completed') {
        return { success: false, message: `Order ${order.pickupCode} was already completed at ${new Date(order.completedAt || order.timestamp).toLocaleTimeString()}`, order };
      }

      const updated = this.updateOrderStatus(order.id, 'Completed');
      return { success: true, message: `✓ Pickup Confirmed! Order ${order.pickupCode} handed over to ${order.customerName}.`, order: updated };
    },

    // ─── Authentication (Gmail + Admin Password gate) ─────────────────────────

    getAdminSession() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.AUTH);
        if (!data) return null;
        const session = JSON.parse(data);
        // Expire sessions after 12 hours
        const age = Date.now() - new Date(session.authenticatedAt).getTime();
        if (age > 12 * 60 * 60 * 1000) {
          localStorage.removeItem(STORAGE_KEYS.AUTH);
          return null;
        }
        return session;
      } catch (e) { return null; }
    },

    adminLogin(gmail, password) {
      const g = (gmail || '').trim().toLowerCase();
      const p = (password || '').trim();
      if (g === ADMIN_GMAIL.toLowerCase() && p === ADMIN_PASSWORD) {
        const session = {
          gmail: g,
          role: 'Store Commander',
          authenticatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(session));
        return { success: true, session };
      }
      return { success: false, message: 'Access denied. Invalid Gmail or admin password.' };
    },

    adminLogout() {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      broadcastChange('ADMIN_LOGGED_OUT');
    },

    // ─── Real-time Sync Listener (BroadcastChannel + LocalStorage + Supabase) ──
    onSync(callback) {
      // 1. Cross-tab & local window broadcast sync
      if (broadcastChannel) {
        broadcastChannel.onmessage = e => { if (e.data) callback(e.data); };
      }
      window.addEventListener('storage', e => {
        if (e.key === 'aura_sync_event_v5' && e.newValue) {
          try { callback(JSON.parse(e.newValue)); } catch (err) {}
        } else if (e.key === STORAGE_KEYS.PRODUCTS) {
          callback({ type: 'PRODUCTS_UPDATED' });
        } else if (e.key === STORAGE_KEYS.ORDERS) {
          callback({ type: 'ORDERS_UPDATED' });
        }
      });

      // 2. Real-time Supabase Cloud DB live subscription on 'orders' table
      if (supabaseClient) {
        try {
          supabaseClient
            .channel('realtime:aura_orders')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'orders' },
              (payload) => {
                console.log('⚡ Live Supabase order event:', payload.eventType, payload.new);
                if (payload.eventType === 'INSERT' && payload.new) {
                  // Merge into local cache if not already present
                  const orders = AURA_DB.getOrders();
                  const exists = orders.find(o => o.id === payload.new.id);
                  if (!exists) {
                    const normalizedOrder = {
                      id: payload.new.id,
                      customerName: payload.new.customer_name || 'Cosmic Shopper',
                      phone: payload.new.phone_number || '',
                      pin: String(payload.new.pickup_pin || ''),
                      status: payload.new.status || 'Received',
                      pickupSlot: payload.new.time_slot || payload.new.pickup_slot || 'Instant Express',
                      pickupCode: payload.new.pickup_code || ('PK-' + String(payload.new.pickup_pin || '000').slice(0, 3)),
                      pickupLocation: payload.new.pickup_location || 'Station 01 - Cyber Hub Indiranagar',
                      totalAmount: Number(payload.new.total_amount) || 0,
                      paymentMethod: payload.new.payment_method || 'UPI',
                      items: Array.isArray(payload.new.items) ? payload.new.items : [],
                      timestamp: payload.new.created_at || new Date().toISOString()
                    };
                    orders.unshift(normalizedOrder);
                    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
                    callback({
                      type: 'ORDERS_UPDATED',
                      payload: { action: 'NEW_ORDER', order: normalizedOrder, source: 'supabase' }
                    });
                  }
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                  const orders = AURA_DB.getOrders();
                  const idx = orders.findIndex(o => o.id === payload.new.id);
                  if (idx !== -1) {
                    orders[idx].status = payload.new.status;
                    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
                    callback({
                      type: 'ORDERS_UPDATED',
                      payload: { action: 'STATUS_CHANGE', orderId: payload.new.id, status: payload.new.status, source: 'supabase' }
                    });
                  }
                }
              }
            )
            .subscribe((status) => {
              console.log('📡 Supabase real-time orders channel status:', status);
            });
        } catch (err) {
          console.warn('Supabase real-time subscription error:', err);
        }
      }
    },

    // ─── Cloud Database Configuration Helpers ──────────────────────────────
    getCloudConfig() {
      return {
        url: ACTIVE_SUPABASE_URL,
        key: ACTIVE_SUPABASE_KEY ? (ACTIVE_SUPABASE_KEY.slice(0, 8) + '••••••••') : '',
        isConnected: Boolean(supabaseClient)
      };
    },

    setCloudConfig(url, key) {
      if (!url || !key) {
        localStorage.removeItem('aura_cloud_db_config');
      } else {
        localStorage.setItem('aura_cloud_db_config', JSON.stringify({ url: url.trim(), key: key.trim() }));
      }
      return { success: true };
    }
  };
})();

window.AURA_DB = AURA_DB;
