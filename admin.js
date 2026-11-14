/**
 * AMAL STORES - Admin Dashboard API Client & Helpers
 * Handles backend REST API communication for the admin portal.
 */

const API_BASE_URL = 'http://localhost:5000/api';
if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
}

// Cache for backend-fetched data
let cachedApiProducts = null;
let cachedApiOrders = null;
let apiReachable = false;

// ── API Helper: Fetch products from backend ───────────────────────────
async function apiFetchProducts() {
  try {
    const res = await fetch(`${API_BASE_URL}/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.success && Array.isArray(json.data)) {
      cachedApiProducts = json.data;
      apiReachable = true;
      console.log(`[Admin API] Loaded ${json.data.length} products from backend (${json.source})`);
      return json.data;
    }
  } catch (err) {
    console.warn('[Admin API] Backend products unreachable, using localStorage:', err.message);
    apiReachable = false;
  }
  return null;
}

// ── API Helper: Fetch orders from backend ─────────────────────────────
async function apiFetchOrders() {
  try {
    const res = await fetch(`${API_BASE_URL}/orders`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.success && Array.isArray(json.data)) {
      cachedApiOrders = json.data;
      console.log(`[Admin API] Loaded ${json.data.length} orders from backend`);
      return json.data;
    }
  } catch (err) {
    console.warn('[Admin API] Backend orders unreachable, using localStorage:', err.message);
  }
  return null;
}

// ── API Helper: Create product on backend ─────────────────────────────
async function apiCreateProduct(payload) {
  const targetUrl = `${window.API_BASE_URL || API_BASE_URL}/products`;
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.success) {
      console.log('[Admin API] Product created on backend:', json.data?.name || payload.name);
      return json.data;
    }
  } catch (err) {
    console.warn(`[Admin API] Failed to POST product to ${targetUrl}:`, err.message);
  }
  return null;
}

// ── API Helper: Update product on backend ─────────────────────────────
async function apiUpdateProduct(id, payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.success) {
      console.log('[Admin API] Product updated on backend:', id);
      return json.data;
    }
  } catch (err) {
    console.warn('[Admin API] Failed to PUT product on backend:', err.message);
  }
  return null;
}

// ── API Helper: Delete product on backend ─────────────────────────────
async function apiDeleteProduct(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.success) {
      console.log('[Admin API] Product deleted on backend:', id);
      return true;
    }
  } catch (err) {
    console.warn('[Admin API] Failed to DELETE product on backend:', err.message);
  }
  return false;
}

// ── API Helper: Toggle stock on backend ───────────────────────────────
async function apiToggleStock(id, newStockStatus) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockStatus: newStockStatus }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.success) return json.data;
  } catch (err) {
    console.warn('[Admin API] Failed to toggle stock on backend:', err.message);
  }
  return null;
}

// ── Action Buttons Order Status Handler ──────────────────────────────
async function handleStatusUpdate(orderId, newStatus, btnElement) {
  let originalBtnHTML = '';
  if (btnElement) {
    originalBtnHTML = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.classList.add('opacity-75', 'cursor-not-allowed');
    btnElement.innerHTML = '<span>Updating…</span>';
  }
  try {
    const apiBase = window.API_BASE_URL || API_BASE_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${apiBase}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      if (typeof window.showToast === 'function') {
        window.showToast(`${newStatus} ✓`, 'success');
      }
    } else {
      console.warn(`[Admin API] PATCH /api/orders/${orderId} responded with status:`, res.status);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Admin API] PATCH request timed out');
    } else {
      console.warn('[Admin API] Failed to update order status on backend:', err.message);
    }
  } finally {
    // Always reset button state – never leave it stuck on "Updating…"
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.classList.remove('opacity-75', 'cursor-not-allowed');
      btnElement.innerHTML = originalBtnHTML;
    }
    if (typeof window.loadLiveOrders === 'function') {
      window.loadLiveOrders();
    } else if (typeof window.loadOrdersData === 'function') {
      window.loadOrdersData();
    }
  }
}

// ── Admin PIN Verification Helper ────────────────────────────────────
async function apiVerifyPin(pin) {
  const cleanPin = String(pin || '').trim();
  try {
    const apiBase = window.API_BASE_URL || API_BASE_URL;
    const res = await fetch(`${apiBase}/orders/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: cleanPin, confirmationPin: cleanPin }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) return json.data;
    }
  } catch (err) {
    console.warn('[Admin API] Failed to verify PIN via backend:', err.message);
  }
  return null;
}
if (typeof window !== 'undefined') {
  window.apiVerifyPin = apiVerifyPin;
}

// Alias for backwards compatibility
const updateOrderStatusAction = handleStatusUpdate;
window.handleStatusUpdate = handleStatusUpdate;
