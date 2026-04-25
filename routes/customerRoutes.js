const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ADD customer
router.post("/", async (req, res) => {
  try {
    const { customer_name } = req.body;

    const docRef = await db.collection("customers").add({
      customer_name,
      createdAt: new Date().toISOString()
    });

    res.json({ message: "Customer added successfully", customer_id: docRef.id });
  } catch (err) {
    console.error("POST /api/customers error:", err);
    res.status(500).json({ error: "Failed to add customer" });
  }
});

// GET all customers
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("customers").get();
    const customers = [];
    snapshot.forEach(doc => {
      customers.push({ customer_id: doc.id, ...doc.data() });
    });
    res.json(customers);
  } catch (err) {
    console.error("GET /api/customers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

module.exports = router;
