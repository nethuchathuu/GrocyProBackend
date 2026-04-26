const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET all products
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    res.json(products);
  } catch (err) {
    console.error("GET /api/products error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD product
router.post("/", async (req, res) => {
  try {
    const { product_id, product_code, product_name, unit_type, current_stock, min_alert, unit_price } = req.body;

    const productData = { 
      product_id: product_id || String(Date.now()), 
      product_code, product_name, unit_type, 
      current_stock: Number(current_stock), 
      min_alert: Number(min_alert), 
      unit_price: Number(unit_price) 
    };
    
    const docRef = await db.collection("products").add(productData);
    res.json({ message: "Product added", id: product_id || docRef.id });
  } catch (err) {
    console.error("POST /api/products error:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// UPDATE product
router.put("/:id", async (req, res) => {
  try {
    const { product_name, unit_type, current_stock, min_alert, unit_price } = req.body;

    const productsRef = db.collection("products");
    const snapshot = await productsRef.where("product_id", "==", req.params.id).get();
    
    if (snapshot.empty) {
      // Just check the doc ID as backup
      await db.collection("products").doc(req.params.id).update({
        product_name, unit_type, current_stock: Number(current_stock), min_alert: Number(min_alert), unit_price: Number(unit_price)
      });
      return res.json({ message: "Product updated" });
    }

    snapshot.forEach(async (doc) => {
      await doc.ref.update({
        product_name, unit_type, current_stock: Number(current_stock), min_alert: Number(min_alert), unit_price: Number(unit_price)
      });
    });
    res.json({ message: "Product updated" });
  } catch (err) {
    console.error("PUT /api/products/:id error:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE product
router.delete("/:id", async (req, res) => {
  try {
    const snapshot = await db.collection("products").where("product_id", "==", req.params.id).get();
    if (snapshot.empty) {
      await db.collection("products").doc(req.params.id).delete();
      return res.json({ message: "Product deleted" });
    }
    
    snapshot.forEach(async (doc) => {
      await doc.ref.delete();
    });
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("DELETE /api/products/:id error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

module.exports = router;
