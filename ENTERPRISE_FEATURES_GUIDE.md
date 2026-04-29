# Enterprise Features Implementation Guide

## 📋 Overview

This document guides you through implementing all enterprise features:
1. AI Ranking Dashboard
2. JWT Refresh Tokens
3. Redis Socket.io Scaling
4. Granular RBAC
5. Stripe Payments
6. React Native Mobile App

---

## 🎯 1️⃣ AI RANKING DASHBOARD

### ✅ Completed
- Updated `ApplicationMongoose` model with detailed `aiScore` object
- Created `rankingService.js` with ranking logic
- Created `TopCandidates.jsx` React component
- Created ranking routes (`backend/routes/ranking.js`)

### 🚀 To Use

**Backend Endpoint:**
```bash
# Rank candidates for a job
POST /api/applications/rank/:jobId

# Get top candidates
GET /api/applications/top-candidates?limit=20

# Get ranking statistics
GET /api/applications/ranking-stats/:jobId

# Update AI score
POST /api/applications/:applicationId/ai-score
body: { skills: 85, experience: 90, communication: 75 }
```

**React Component:**
```jsx
import TopCandidates from '../components/TopCandidates';

export default function Dashboard() {
  return <TopCandidates />;
}
```

---

## 🔐 2️⃣ JWT REFRESH TOKENS - SETUP REQUIRED

### ✅ Completed
- Updated User model with `refreshToken` field
- Created axios interceptor with auto-refresh
- Enhanced auth controller (ready for integration)

### 🚀 TODO: Update Auth Controller

In `backend/controllers/authController.js`, update the **login** function:

```javascript
// After password verification
const accessToken = jwt.sign(
  { id: user._id, role: user.roleString, permissions: user.permissions || [] },
  process.env.JWT_SECRET,
  { expiresIn: "15m" }
);

const refreshToken = jwt.sign(
  { id: user._id },
  process.env.REFRESH_SECRET,
  { expiresIn: "7d" }
);

// Save refresh token to database
user.refreshToken = refreshToken;
await user.save();

res.json({
  success: true,
  accessToken,
  refreshToken,
  user: { id: user._id, name: user.name, email: user.email, role: user.roleString }
});
```

### 🔄 Add Refresh Route

In `backend/routes/auth.js`, add:

```javascript
router.post('/refresh', async (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ message: 'No refresh token' });

  const user = await User.findOne({ refreshToken: token });
  if (!user) return res.status(403).json({ message: 'Invalid refresh token' });

  jwt.verify(token, process.env.REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Token expired' });

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.roleString, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken });
  });
});
```

### 🎨 Frontend Setup

Frontend `lib/apiClient.js` is already created with auto-refresh interceptor.

**Usage in components:**
```javascript
import apiClient from '../lib/apiClient';

// Auto-refresh happens automatically on 401
const response = await apiClient.get('/api/protected-route');

// Manual refresh if needed
await apiClient.refreshToken();
```

### 📝 Environment Variables

Add to `.env`:
```
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-different-secret
REFRESH_TOKEN_EXPIRY=7d
ACCESS_TOKEN_EXPIRY=15m
```

---

## 📡 3️⃣ REDIS FOR SOCKET.IO SCALING

### 📦 Installation

```bash
cd backend
npm install redis socket.io-redis
```

### 🔌 Setup Redis Adapter

In `backend/socket.js` (or where you initialize Socket.io):

```javascript
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const http = require("http");
const SocketIO = require("socket.io");

const server = http.createServer(app);

// Create Redis clients
const pubClient = createClient({ 
  url: process.env.REDIS_URL || "redis://localhost:6379" 
});

const subClient = pubClient.duplicate();

// Connect to Redis
(async () => {
  await pubClient.connect();
  await subClient.connect();

  // Initialize Socket.IO with Redis adapter
  const io = SocketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  // Use Redis adapter for scaling
  io.adapter(createAdapter(pubClient, subClient));

  // Socket event listeners
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Now messages are shared across all servers!
    socket.on("message", (data) => {
      io.to(data.room).emit("message", data);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  server.listen(3001, () => {
    console.log("Server running on port 3001 with Redis adapter");
  });
})();
```

### 🚀 Docker Setup (Optional)

```bash
# Run Redis in Docker
docker run -d \
  --name redis-airswift \
  -p 6379:6379 \
  redis:7-alpine
```

Or add to `docker-compose.yml`:

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 📝 Environment Variables

Add to `.env`:
```
REDIS_URL=redis://localhost:6379
# or for production:
REDIS_URL=redis://:password@hostname:port
```

---

## 👥 4️⃣ GRANULAR RBAC (ROLE + PERMISSION SYSTEM)

### ✅ Completed
- Updated User model with role reference and permissions array
- Enhanced permission middleware with granular checking

### 🪙 Before Using: Seed Permissions

Create `backend/scripts/seedPermissions.js`:

```javascript
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const mongoose = require("mongoose");

const permissions = [
  { name: "document:read", category: "user" },
  { name: "document:write", category: "user" },
  { name: "document:review", category: "admin" },
  { name: "user:read", category: "admin" },
  { name: "user:delete", category: "admin" },
  { name: "message:send", category: "user" },
  { name: "analytics:view", category: "admin" },
  { name: "interview:schedule", category: "recruiter" },
  { name: "payment:view", category: "user" },
];

const roles = [
  { name: "user", permissions: ["document:read", "message:send", "payment:view"] },
  {
    name: "recruiter",
    permissions: [
      "document:read",
      "document:review",
      "user:read",
      "interview:schedule",
      "analytics:view",
    ],
  },
  { name: "admin", permissions: ["*"] }, // All permissions
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  // Clear existing
  await Permission.deleteMany({});
  await Role.deleteMany({});

  // Create permissions
  const createdPermissions = await Permission.insertMany(
    permissions.map(p => ({ name: p.name, category: p.category }))
  );

  // Create roles
  for (const role of roles) {
    const rolePermissions = role.name === "admin"
      ? createdPermissions.map(p => p._id)
      : createdPermissions
          .filter(p => role.permissions.includes(p.name))
          .map(p => p._id);

    await Role.create({
      name: role.name,
      permissions: rolePermissions,
    });
  }

  console.log("✅ Permissions and roles seeded");
  process.exit(0);
}

seed().catch(console.error);
```

Run it:
```bash
node backend/scripts/seedPermissions.js
```

### 🔒 Protect Routes

```javascript
const router = require("express").Router();
const auth = require("../middleware/auth");
const permission = require("../middleware/permission");

// Only users with document:review permission
router.put(
  "/documents/:id/review",
  auth,
  permission("document:review"),
  reviewDocument
);

// Multiple permissions (all required)
router.delete(
  "/users/:id",
  auth,
  permission(["user:read", "user:delete"]),
  deleteUser
);

// Admin only
router.get("/admin-panel", auth, permission.adminOnly, adminPanel);
```

---

## 💳 5️⃣ STRIPE PAYMENTS

### ✅ Completed
- Created StripePayment model
- Created Stripe config
- Added payment controller with webhook handlers
- Created payment routes

### 📦 Installation

```bash
cd backend
npm install stripe
```

### 🔑 Stripe Setup

1. Get Stripe keys from [dashboard.stripe.com](https://dashboard.stripe.com)
2. Add to `.env`:

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 🔔 Webhook Setup

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.dev/stripe.gpg | sudo apt-key add -
sudo apt-get install stripe
```

Forward webhooks to localhost:
```bash
stripe listen --forward-to localhost:5000/api/payments/stripe/webhook
```

Configure webhook in Stripe Dashboard:
- Endpoint: `https://your-domain.com/api/payments/stripe/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

### 🎯 API Usage

**Create Payment:**
```bash
POST /api/payments/stripe/create-intent
body: {
  "amount": 99.99,
  "type": "interview_fee",  // or "visa_fee", "service_fee"
  "description": "Interview Fee"
}

response: {
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentId": "xxx"
}
```

**Get Payment History:**
```bash
GET /api/payments/stripe/history?limit=10
```

**Generate Invoice:**
```bash
POST /api/payments/stripe/:paymentId/invoice
```

### 💻 Frontend Integration

```javascript
import { loadStripe } from "@stripe/js";
import { Elements, CardElement, useStripe } from "@stripe/react-js";
import apiClient from "../lib/apiClient";

function PaymentForm() {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);

  const handlePayment = async (amount, type) => {
    try {
      // Create payment intent
      const { data } = await apiClient.post("/payments/stripe/create-intent", {
        amount,
        type,
      });

      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: "User Name" },
        },
      });

      if (result.paymentIntent.status === "succeeded") {
        alert("Payment successful!");
      }
    } catch (error) {
      console.error("Payment failed:", error);
    }
  };

  return (
   <button onClick={() => handlePayment(99.99, "interview_fee")}>
      Pay Now
    </button>
  );
}
```

---

## 📱 6️⃣ REACT NATIVE MOBILE APP

### 📦 Create New Project

```bash
npx create-expo-app AirswiftMobile
cd AirswiftMobile
npm install axios socket.io-client @react-native-async-storage/async-storage
```

### 🔐 Auth Storage

Create `src/utils/authStorage.js`:

```javascript
import AsyncStorage from "@react-native-async-storage/async-storage";

export const authStorage = {
  saveToken: async (token) => {
    await AsyncStorage.setItem("accessToken", token);
  },

  getToken: async () => {
    return await AsyncStorage.getItem("accessToken");
  },

  saveRefreshToken: async (token) => {
    await AsyncStorage.setItem("refreshToken", token);
  },

  getRefreshToken: async () => {
    return await AsyncStorage.getItem("refreshToken");
  },

  clear: async () => {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
  },
};
```

### 🔑 Login Screen

Create `src/screens/LoginScreen.js`:

```javascript
import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";
import { authStorage } from "../utils/authStorage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        "https://your-api.herokuapp.com/api/auth/login",
        { email, password }
      );

      const { accessToken, refreshToken } = response.data;

      await authStorage.saveToken(accessToken);
      await authStorage.saveRefreshToken(refreshToken);

      navigation.replace("Dashboard");
    } catch (error) {
      Alert.alert("Login Failed", error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#667eea",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
});
```

### 📡 Socket.IO Connection

Create `src/services/socketService.js`:

```javascript
import io from "socket.io-client";
import { authStorage } from "../utils/authStorage";

let socket;

export const initializeSocket = async () => {
  const token = await authStorage.getToken();

  socket = io("https://your-api.herokuapp.com", {
    auth: { token },
    reconnection: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("notification", (data) => {
    console.log("New notification:", data);
  });

  return socket;
};

export const getSocket = () => socket;
```

### 📄 Job Applications Screen

Create `src/screens/ApplicationsScreen.js`:

```javascript
import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { authStorage } from "../utils/authStorage";

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = await authStorage.getToken();

      const response = await axios.get(
        "https://your-api.herokuapp.com/api/applications",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setApplications(response.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderApplication = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.jobTitle}>{item.jobId?.title}</Text>
      <Text style={styles.status}>Status: {item.applicationStatus}</Text>
      <Text style={styles.score}>AI Score: {item.aiScore?.total}/100</Text>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <FlatList
      data={applications}
      renderItem={renderApplication}
      keyExtractor={(item) => item._id}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "#f5f5f5",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  jobTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  status: { color: "#666", marginBottom: 4 },
  score: { color: "#667eea", fontWeight: "bold" },
});
```

---

## 🚀 Deployment Checklist

- [ ] Add all environment variables to `.env`
- [ ] Run Stripe webhook setup
- [ ] Seed permissions and roles
- [ ] Update auth controller with refresh logic
- [ ] Test all endpoints
- [ ] Configure CORS for payment webhooks
- [ ] Set up Redis (Docker or cloud Redis)
- [ ] Deploy frontend with updated apiClient
- [ ] Build and publish mobile app

---

## 📚 Testing

**Test Refresh Token:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token": "your-refresh-token"}'
```

**Test Stripe Payment Intent:**
```bash
curl -X POST http://localhost:5000/api/payments/stripe/create-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99, "type": "interview_fee"}'
```

**Test Ranking:**
```bash
curl -X GET "http://localhost:5000/api/applications/top-candidates?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💡 Support

For issues or questions, check:
- Backend logs: `npm run dev` output
- Stripe Dashboard for webhook status
- Redis logs: `docker logs redis-airswift`

---

Happy coding! 🚀
