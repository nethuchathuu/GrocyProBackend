const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   GET /api/discounts
// @desc    Get all discounts
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('discounts').orderBy('start_date', 'desc').get();
    const discounts = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      discounts.push({
        id: doc.id,
        ...data,
        specific_days: data.specific_days || []
      });
    });

    res.json(discounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).json({ error: 'Server error fetching discounts' });
  }
});

// @route   GET /api/discounts/:id
// @desc    Get single discount by ID (using discount_id or doc ID)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let docSnap = await db.collection('discounts').doc(id).get();
    let data;

    if (!docSnap.exists) {
      // Check using discount_id field
      const snapshot = await db.collection('discounts').where("discount_id", "==", id).get();
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Discount not found' });
      }
      data = snapshot.docs[0].data();
      data.id = snapshot.docs[0].id;
    } else {
      data = docSnap.data();
      data.id = docSnap.id;
    }

    data.specific_days = data.specific_days || [];
    res.json(data);
  } catch (error) {
    console.error('Error fetching discount:', error);
    res.status(500).json({ error: 'Server error fetching discount' });
  }
});

// @route   POST /api/discounts
// @desc    Create new discount
router.post('/', async (req, res) => {
  try {
    const discountData = req.body;
    
    const docData = {
      discount_id: discountData.discount_id,
      discount_code: discountData.discount_code,
      discount_type: discountData.discount_type,
      scope: discountData.scope,
      status: discountData.status || 'Active',
      percentage: discountData.percentage || null,
      fixed_amount: discountData.fixed_amount || null,
      bulk_min_quantity: discountData.bulk_min_quantity || null,
      bulk_discount_value: discountData.bulk_discount_value || null,
      product_code: discountData.product_code || null,
      cart_limit: discountData.cart_limit || null,
      start_date: discountData.start_date || null,
      end_date: discountData.end_date || null,
      time_start: discountData.time_start || null,
      time_end: discountData.time_end || null,
      specific_days: discountData.specific_days || null,
      min_purchase_amount: discountData.min_purchase_amount || null,
      min_quantity: discountData.min_quantity || null,
      required_products: discountData.required_products || null,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('discounts').add(docData);
    res.status(201).json({ message: 'Discount created successfully', discount: { id: docRef.id, ...docData } });
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ error: 'Server error creating discount' });
  }
});

// @route   PUT /api/discounts/:id
// @desc    Update existing discount
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const discountData = req.body;

    const dataToUpdate = {
      discount_code: discountData.discount_code,
      discount_type: discountData.discount_type,
      scope: discountData.scope,
      status: discountData.status,
      percentage: discountData.percentage || null,
      fixed_amount: discountData.fixed_amount || null,
      bulk_min_quantity: discountData.bulk_min_quantity || null,
      bulk_discount_value: discountData.bulk_discount_value || null,
      product_code: discountData.product_code || null,
      cart_limit: discountData.cart_limit || null,
      start_date: discountData.start_date || null,
      end_date: discountData.end_date || null,
      time_start: discountData.time_start || null,
      time_end: discountData.time_end || null,
      specific_days: discountData.specific_days || null,
      min_purchase_amount: discountData.min_purchase_amount || null,
      min_quantity: discountData.min_quantity || null,
      required_products: discountData.required_products || null
    };

    let docRef = db.collection('discounts').doc(id);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      const snapshot = await db.collection('discounts').where("discount_id", "==", id).get();
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Discount not found' });
      }
      docRef = snapshot.docs[0].ref;
    }

    await docRef.update(dataToUpdate);
    res.json({ message: 'Discount updated successfully' });
  } catch (error) {
    console.error('Error updating discount:', error);
    res.status(500).json({ error: 'Server error updating discount' });
  }
});

// @route   DELETE /api/discounts/:id
// @desc    Delete discount
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let docRef = db.collection('discounts').doc(id);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      const snapshot = await db.collection('discounts').where("discount_id", "==", id).get();
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Discount not found' });
      }
      docRef = snapshot.docs[0].ref;
    }

    await docRef.delete();
    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount:', error);
    res.status(500).json({ error: 'Server error deleting discount' });
  }
});

module.exports = router;
