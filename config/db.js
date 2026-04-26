const admin = require("firebase-admin");
require("dotenv").config();
const path = require("path");

let db;
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback for local development
    serviceAccount = require("../grocypro-a1fc6-firebase-adminsdk-fbsvc-bcb1e947d9.json");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log("Connected to Firebase Firestore");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

module.exports = db;
