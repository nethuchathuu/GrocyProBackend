const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/db");

const productRoutes = require("./routes/productRoutes");
const salesRoutes = require("./routes/salesRoutes");
const customerRoutes = require("./routes/customerRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const discountRoutes = require("./routes/discountRoutes");

const app = express();

app.use(cors({
  origin: [
    "https://grocypro.netlify.app",
    "http://localhost:5173",
    "http://localhost:3000"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Serve uploaded profile pictures
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check — no DB involved, just confirms server is alive
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/discounts", discountRoutes);

app.get("/test", (req, res) => {
  res.send("Backend working ✅");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    // Check Firestore connection by reading a test collection
    await db.collection("system").limit(1).get();
    console.log("Verified Firebase Firestore connection.");
  } catch (error) {
    console.error("Failed to connect to database:", error);
  }
});
