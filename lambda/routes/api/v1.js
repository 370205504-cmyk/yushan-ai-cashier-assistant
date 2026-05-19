const express = require('express');
const orderRoutes = require('../order');
const dishesRoutes = require('../dishes');
const cartRoutes = require('../cart');
const memberRoutes = require('../member');
const paymentRoutes = require('../payment');
const userDataRoutes = require('../userData');

const router = express.Router();

router.use('/orders', orderRoutes);
router.use('/dishes', dishesRoutes);
router.use('/cart', cartRoutes);
router.use('/member', memberRoutes);
router.use('/payment', paymentRoutes);
router.use('/user', userDataRoutes);

module.exports = router;
