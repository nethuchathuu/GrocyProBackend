const admin = require("firebase-admin");
require("dotenv").config();
const path = require("path");

let db;
try {
  // Automatically initializes if GOOGLE_APPLICATION_CREDENTIALS exists in environment variables
  // or if FIREBASE_SERVICE_ACCOUNT JSON string is supplied:
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = require(path.resolve(__dirname, "..", process.env.GOOGLE_APPLICATION_CREDENTIALS));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp();
  }
  db = admin.firestore();
  console.log("Connected to Firebase Firestore");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

module.exports = db;
