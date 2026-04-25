const express = require("express");
const router = express.Router();
const db = require("../config/db");
const admin = require("firebase-admin");

// CREATE SALE
router.post("/", async (req, res) => {
  try {
    const { id, date, customerName, totalAmount, discountAmount, taxAmount, finalTotal, discountCode, items } = req.body;

    const saleTime = new Date().toISOString();
    const batch = db.batch();

    // 1. Check or add Customer
    const name = customerName || "Walk-in Customer";
    const customerRef = db.collection("customers").doc();
    batch.set(customerRef, {
      customer_name: name,
      createdAt: saleTime
    });
    const customerId = customerRef.id;

    // 2. Insert Sale document
    const saleId = id || db.collection("sales").doc().id;
    const saleRef = db.collection("sales").doc(saleId);
    
    batch.set(saleRef, {
      sale_id: saleId,
      customer_id: customerId,
      customer_name: name,
      total_amount: Number(totalAmount),
      discount_amount: Number(discountAmount) || 0,
      tax_amount: Number(taxAmount) || 0,
      final_total: Number(finalTotal) || Number(totalAmount),
      discount_code: discountCode || null,
      sale_time: saleTime,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName || 'Unknown Product',
        quantitySold: Number(item.quantitySold),
        pricePerUnit: Number(item.pricePerUnit),
        subtotal: Number(item.quantitySold) * Number(item.pricePerUnit)
      }))
    });

    // 3. Update stock in "products" collection
    for (const item of items) {
      // Find product by product_id if not document ID
      const productsRef = db.collection("products");
      let prodRef;
      const getDoc = await productsRef.doc(item.productId).get();
      if (getDoc.exists) {
        prodRef = productsRef.doc(item.productId);
      } else {
        const prodQuery = await productsRef.where("product_id", "==", item.productId).get();
        if (!prodQuery.empty) {
          prodRef = prodQuery.docs[0].ref;
        }
      }
      
      if (prodRef) {
        batch.update(prodRef, {
          current_stock: admin.firestore.FieldValue.increment(-Number(item.quantitySold))
        });
      }
    }

    await batch.commit();

    res.json({ message: "Sale completed", id: saleId });
  } catch (err) {
    console.error("POST /api/sales error:", err);
    res.status(500).json({ error: "Failed to process sale" });
  }
});

// GET all sales
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("sales").orderBy("sale_time", "desc").get();
    const sales = [];
    snapshot.forEach(doc => {
      sales.push(doc.data());
    });
    res.json(sales);
  } catch (err) {
    console.error("GET /api/sales error:", err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// HOURLY REPORT (today)
router.get("/reports/hourly", async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    const snapshot = await db.collection("sales")
      .where("sale_time", ">=", todayStr)
      .get();
      
    const hourlyTotals = Array(24).fill(0);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const saleDate = new Date(data.sale_time);
      if (saleDate.toISOString().split("T")[0] === todayStr) {
        const hour = saleDate.getHours();
        hourlyTotals[hour] += Number(data.total_amount) || 0;
      }
    });

    const hourlyData = hourlyTotals.map((total, h) => ({ hour: h, total }));
    res.json(hourlyData);
  } catch (err) {
    console.error("GET /api/sales/reports/hourly error:", err);
    res.status(500).json({ error: "Failed to fetch hourly report" });
  }
});

// TODAY'S DASHBOARD STATS (revenue + sales count for today)
router.get("/reports/today-stats", async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    const snapshot = await db.collection("sales")
      .where("sale_time", ">=", todayStr)
      .get();

    let today_revenue = 0;
    let today_sales_count = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const saleDate = new Date(data.sale_time);
      if (saleDate.toISOString().split("T")[0] === todayStr) {
        today_revenue += Number(data.total_amount) || 0;
        today_sales_count++;
      }
    });

    res.json({ today_revenue, today_sales_count });
  } catch (err) {
    console.error("GET /api/sales/reports/today-stats error:", err);
    res.status(500).json({ error: "Failed to fetch today's stats" });
  }
});

// DAILY REPORT
router.get("/reports/daily", async (req, res) => {
  try {
    const snapshot = await db.collection("sales").get();
    
    const dailyMap = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const date = data.sale_time.split("T")[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { date, total_transactions: 0, total_sales: 0 };
      }
      dailyMap[date].total_transactions++;
      dailyMap[date].total_sales += Number(data.total_amount) || 0;
    });

    const result = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    res.json(result);
  } catch (err) {
    console.error("GET /api/sales/reports/daily error:", err);
    res.status(500).json({ error: "Failed to fetch daily report" });
  }
});

// MONTHLY REPORT
router.get("/reports/monthly", async (req, res) => {
  try {
    const snapshot = await db.collection("sales").get();
    
    const monthlyMap = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const month = data.sale_time.substring(0, 7); // YYYY-MM
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, total_transactions: 0, total_sales: 0 };
      }
      monthlyMap[month].total_transactions++;
      monthlyMap[month].total_sales += Number(data.total_amount) || 0;
    });

    const result = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));
    res.json(result);
  } catch (err) {
    console.error("GET /api/sales/reports/monthly error:", err);
    res.status(500).json({ error: "Failed to fetch monthly report" });
  }
});

// DAILY REPORT FOR A SPECIFIC DATE
router.get("/reports/daily/:date", async (req, res) => {
  try {
    const { date } = req.params;
    
    // YYYY-MM-DD
    const startOfDay = new Date(`${date}T00:00:00.000Z`).toISOString();
    const endOfDay = new Date(`${date}T23:59:59.999Z`).toISOString();

    const snapshot = await db.collection("sales")
      .where("sale_time", ">=", startOfDay)
      .where("sale_time", "<=", endOfDay)
      .get();
      
    let total_sales = 0;
    let total_transactions = 0;
    const hourlyTotals = Array(24).fill(0);
    const productsMap = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      total_sales += Number(data.total_amount) || 0;
      total_transactions++;
      
      const hour = new Date(data.sale_time).getHours();
      hourlyTotals[hour] += Number(data.total_amount) || 0;
      
      if (data.items) {
        data.items.forEach(item => {
          if (!productsMap[item.productId]) {
            productsMap[item.productId] = { name: item.productName || item.productId, qty: 0, revenue: 0 };
          }
          productsMap[item.productId].qty += Number(item.quantitySold) || 0;
          productsMap[item.productId].revenue += (Number(item.quantitySold) * Number(item.pricePerUnit)) || 0;
        });
      }
    });

    const hourlyData = hourlyTotals.map((total, h) => ({ hour: h, total }));
    const topProducts = Object.values(productsMap).sort((a,b) => b.qty - a.qty).slice(0, 10);

    res.json([{
      total_sales,
      total_transactions,
      hourlyData,
      topProducts
    }]);
  } catch (err) {
    console.error("GET /api/sales/reports/daily/:date error:", err);
    res.status(500).json({ error: "Failed to fetch daily specific report" });
  }
});

// WEEKLY REPORT (by start date of the week, e.g. 2026-03-09)
router.get("/reports/weekly/:startDate", async (req, res) => {
  try {
    const { startDate } = req.params;
    
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const snapshot = await db.collection("sales")
      .where("sale_time", ">=", startStr)
      .where("sale_time", "<", endStr)
      .get();
      
    let totalSales = 0;
    let totalTransactions = 0;
    const dailyTotals = Array(7).fill(0);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const productsMap = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      totalSales += Number(data.total_amount) || 0;
      totalTransactions++;
      
      const saleDate = new Date(data.sale_time);
      const dow = saleDate.getDay(); // 0-6 (Sun-Sat)
      dailyTotals[dow] += Number(data.total_amount) || 0;
      
      if (data.items) {
        data.items.forEach(item => {
          if (!productsMap[item.productId]) {
            productsMap[item.productId] = { name: item.productName || item.productId, qty: 0, revenue: 0 };
          }
          productsMap[item.productId].qty += Number(item.quantitySold) || 0;
          productsMap[item.productId].revenue += (Number(item.quantitySold) * Number(item.pricePerUnit)) || 0;
        });
      }
    });

    const dailyData = dailyTotals.map((total, d) => ({ day: dayNames[d], total }));
    const topProducts = Object.values(productsMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      totalSales,
      totalTransactions,
      daily: dailyData,
      topProducts
    });
  } catch (err) {
    console.error("GET /api/sales/reports/weekly/:startDate error:", err);
    res.status(500).json({ error: "Failed to fetch weekly report" });
  }
});

// MONTHLY REPORT FOR A SPECIFIC MONTH (weekly breakdown + top products)
router.get("/reports/monthly/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const snapshot = await db.collection("sales")
      .where("sale_time", ">=", startStr)
      .where("sale_time", "<", endStr)
      .get();
      
    let totalSales = 0;
    let totalTransactions = 0;
    const weeklyTotals = Array(5).fill(0);
    const productsMap = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      totalSales += Number(data.total_amount) || 0;
      totalTransactions++;
      
      const saleDate = new Date(data.sale_time);
      const dom = saleDate.getDate(); // 1-31
      const weekNum = Math.ceil(dom / 7) - 1; // 0-4
      if (weekNum < 5) weeklyTotals[weekNum] += Number(data.total_amount) || 0;
      
      if (data.items) {
        data.items.forEach(item => {
          if (!productsMap[item.productId]) {
            productsMap[item.productId] = { name: item.productName || item.productId, qty: 0, revenue: 0 };
          }
          productsMap[item.productId].qty += Number(item.quantitySold) || 0;
          productsMap[item.productId].revenue += (Number(item.quantitySold) * Number(item.pricePerUnit)) || 0;
        });
      }
    });

    const weeklyData = [1, 2, 3, 4, 5].map(w => ({ week: `Week ${w}`, total: weeklyTotals[w-1] }));
    const topProducts = Object.values(productsMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      totalSales,
      totalTransactions,
      weekly: weeklyData,
      topProducts
    });
  } catch (err) {
    console.error("GET /api/sales/reports/monthly/:year/:month error:", err);
    res.status(500).json({ error: "Failed to fetch monthly report" });
  }
});

// YEARLY REPORT (monthly breakdown + top products)
router.get("/reports/yearly/:year", async (req, res) => {
  try {
    const { year } = req.params;
    
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);
    
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const snapshot = await db.collection("sales")
      .where("sale_time", ">=", startStr)
      .where("sale_time", "<", endStr)
      .get();
      
    let totalSales = 0;
    let totalTransactions = 0;
    const monthlyTotals = Array(12).fill(0);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const productsMap = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      totalSales += Number(data.total_amount) || 0;
      totalTransactions++;
      
      const saleDate = new Date(data.sale_time);
      const monthIdx = saleDate.getMonth(); // 0-11
      monthlyTotals[monthIdx] += Number(data.total_amount) || 0;
      
      if (data.items) {
        data.items.forEach(item => {
          if (!productsMap[item.productId]) {
            productsMap[item.productId] = { name: item.productName || item.productId, qty: 0, revenue: 0 };
          }
          productsMap[item.productId].qty += Number(item.quantitySold) || 0;
          productsMap[item.productId].revenue += (Number(item.quantitySold) * Number(item.pricePerUnit)) || 0;
        });
      }
    });

    const monthlyData = monthNames.map((name, i) => ({ month: name, total: monthlyTotals[i] }));
    const topProducts = Object.values(productsMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      totalSales,
      totalTransactions,
      monthly: monthlyData,
      topProducts
    });
  } catch (err) {
    console.error("GET /api/sales/reports/yearly/:year error:", err);
    res.status(500).json({ error: "Failed to fetch yearly report" });
  }
});

module.exports = router;
