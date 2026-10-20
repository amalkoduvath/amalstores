# FreshCart Backend (Node.js, Express, MongoDB)

A complete REST API backend for the FreshCart Zero-G Grocery application with models and API routes for **Products**, **Users**, and **Orders with 4-Digit Pickup PINs**.

---

## 📁 Project Structure

```
server/
├── config/
│   └── db.js            # MongoDB Mongoose connection handler
├── models/
│   ├── Order.js         # Order schema with 4-digit pickup PIN validation
│   ├── Product.js       # Product schema (stock status, units, pricing)
│   └── User.js          # Customer & admin schema
├── routes/
│   ├── orders.js        # Orders API (creates orders with 4-digit PINs, PIN verification)
│   ├── products.js      # Products API (CRUD, category filtering, search)
│   └── users.js         # Users API (phone OTP onboarding / registration)
├── seed/
│   ├── defaultData.js   # FreshCart initial produce catalog
│   └── seed.js          # Database seed script
├── .env                 # Environment variables
├── .env.example         # Example environment configuration
├── package.json         # Dependencies & npm scripts
└── server.js            # Express application entry point
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment (.env)
Update `server/.env` if using MongoDB Atlas or a custom port:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/freshcart
NODE_ENV=development
```
*(If MongoDB is not installed or offline, the server automatically uses in-memory fallback so API endpoints always function).*

### 3. Seed Database (Optional)
```bash
npm run seed
```

### 4. Start Server
```bash
# Production mode
npm start

# Development mode (auto-reload on save)
npm run dev
```

Server runs on: **`http://localhost:5000`**

---

## 📡 API Endpoints

### 🥦 Products (`/api/products`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Get all products (supports `?category=...&search=...&inStock=true`) |
| `GET` | `/api/products/:id` | Get single product by ID |
| `POST` | `/api/products` | Create a new produce item |
| `PUT` | `/api/products/:id` | Update produce item or toggle stock status |
| `DELETE` | `/api/products/:id` | Delete produce item |
| `POST` | `/api/products/reset` | Reset catalog to default items |

### 🛍️ Orders with 4-Digit Pickup PINs (`/api/orders`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/orders` | Get all orders (supports `?status=...&phone=...`) |
| `GET` | `/api/orders/:id` | Get order details by orderId (`ORD-xxx`) or pickup code (`PK-xxx`) |
| `POST` | `/api/orders` | Place new order. **Generates a secure 4-digit pickup PIN** |
| `PATCH` | `/api/orders/:id/status` | Update lifecycle (`Received` → `Packing` → `Ready for Pickup` → `Completed`) |
| `POST` | `/api/orders/verify-pin` | Verify 4-digit PIN at store counter (`{ orderId, pin }`) |

### 👤 Users (`/api/users`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/users` | List registered customers and staff |
| `GET` | `/api/users/:phone` | Find user by 10-digit mobile number |
| `POST` | `/api/users` | Register or update user upon OTP verification |

---

## 🔐 4-Digit In-Store Pickup PIN Verification

When an order is created, the backend generates an order record with a **4-digit PIN**:
```json
{
  "orderId": "ORD-582914",
  "pickupCode": "PK-318",
  "pin": "7392",
  "customerName": "Aarav Sharma",
  "phone": "9876543210",
  "status": "Ready for Pickup",
  "totalAmount": 215
}
```
Store staff at the bay counter verify handover with `POST /api/orders/verify-pin`:
```json
{
  "orderId": "ORD-582914",
  "pin": "7392"
}
```
Response:
```json
{
  "success": true,
  "verified": true,
  "message": "4-digit PIN verified successfully. Handover authorized."
}
```
