const express = require('express');
const cartService = require('../services/cartService');
const inputValidator = require('../services/inputValidator');

const router = express.Router();

router.get('/:userId', async (req, res) => {
    try {
        const userId = inputValidator.validateUserId(req.params.userId || 'default');
        const cart = cartService.getCart(userId);
        res.json({ success: true, cart: cart });
    } catch (error) {
        console.error('Failed to get cart:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/add', async (req, res) => {
    try {
        const { userId = 'default', dishId, quantity = 1, remarks = '' } = req.body;
        const validUserId = inputValidator.validateUserId(userId);
        const cart = await cartService.addItem(validUserId, dishId, quantity, remarks);
        res.json({ success: true, cart: cart });
    } catch (error) {
        console.error('Failed to add item to cart:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/remove', async (req, res) => {
    try {
        const { userId = 'default', dishId } = req.body;
        const validUserId = inputValidator.validateUserId(userId);
        const cart = await cartService.removeItem(validUserId, dishId);
        res.json({ success: true, cart: cart });
    } catch (error) {
        console.error('Failed to remove item from cart:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/clear', async (req, res) => {
    try {
        const { userId = 'default' } = req.body;
        const validUserId = inputValidator.validateUserId(userId);
        const cart = await cartService.clearCart(validUserId);
        res.json({ success: true, cart: cart });
    } catch (error) {
        console.error('Failed to clear cart:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/update-quantity', async (req, res) => {
    try {
        const { userId = 'default', dishId, quantity } = req.body;
        const validUserId = inputValidator.validateUserId(userId);
        const cart = await cartService.updateItemQuantity(validUserId, dishId, quantity);
        res.json({ success: true, cart: cart });
    } catch (error) {
        console.error('Failed to update quantity:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;