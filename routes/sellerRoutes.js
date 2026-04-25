const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `seller-profile${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png) are allowed."));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// GET seller profile (single seller doc)
router.get("/", async (_req, res) => {
  try {
    const snapshot = await db.collection("sellers").limit(1).get();
    if (snapshot.empty) {
      return res.json(null);
    }
    const seller = snapshot.docs[0].data();
    seller.seller_id = snapshot.docs[0].id;
    if (seller.date_of_birth) {
      seller.date_of_birth = seller.date_of_birth.split("T")[0];
    }
    res.json(seller);
  } catch (err) {
    console.error("GET /api/seller error:", err);
    res.status(500).json({ error: "Failed to fetch seller profile" });
  }
});

// PUT update seller profile (with optional image upload)
router.put("/", upload.single("profile_picture"), async (req, res) => {
  try {
    const { name, mobile_number, address, nic_number, date_of_birth, gender } = req.body;
    const picturePath = req.file ? `/uploads/${req.file.filename}` : null;

    const snapshot = await db.collection("sellers").limit(1).get();

    const sellerData = {
      name, 
      mobile_number, 
      address: address || null, 
      nic_number: nic_number || null,
      date_of_birth: date_of_birth || null, 
      gender
    };

    if (picturePath) {
      sellerData.profile_picture = picturePath;
    }

    if (snapshot.empty) {
      // Insert first-time profile
      const docRef = await db.collection("sellers").add(sellerData);
      return res.json({ message: "Seller profile created", seller_id: docRef.id });
    }

    const sellerDoc = snapshot.docs[0];
    await sellerDoc.ref.update(sellerData);
    
    res.json({ message: "Seller profile updated" });
  } catch (err) {
    console.error("PUT /api/seller error:", err);
    res.status(500).json({ error: "Failed to update seller profile" });
  }
});

module.exports = router;
