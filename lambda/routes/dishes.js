const express = require('express');
const db = require('../database/db');
const { body } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const { validate, inputSanitize } = require('../middleware/security');
const { handleUpload } = require('../middleware/upload');
const dishesService = require('../services/dishesService');

const router = express.Router();

router.get('/dishes',
  async (req, res) => {
    try {
      const { category, page = 1, pageSize = 120 } = req.query;
      
      let dishes = dishesService.getAllDishes();
      
      if (category) {
        dishes = dishes.filter(d => d.category === category);
      }
      
      // 分页
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      dishes = dishes.slice(offset, offset + parseInt(pageSize));
      
      res.json({ success: true, dishes });
    } catch (error) {
      console.error('Failed to load dishes:', error);
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/dish/:id',
  inputSanitize,
  async (req, res) => {
    try {
      const dishes = await db.query('SELECT * FROM dishes WHERE id = ?', [req.params.id]);
      if (dishes.length === 0) {
        return res.status(404).json({ success: false, message: '菜品不存在' });
      }
      res.json({ success: true, dish: dishes[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/dish',
  requireAdmin,
  [
    body('name').notEmpty().isLength({ max: 100 }),
    body('category').notEmpty().isLength({ max: 50 }),
    body('price').isFloat({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const result = await db.query(
        `INSERT INTO dishes (name, name_en, category, price, original_price, description, image, stock, stock_warning, ingredients, allergens, spicy_level, is_recommended, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.body.name, req.body.name_en, req.body.category, req.body.price,
          req.body.original_price, req.body.description, req.body.image,
          req.body.stock ?? -1, req.body.stock_warning ?? 10,
          req.body.ingredients, req.body.allergens, req.body.spicy_level ?? 0,
          req.body.is_recommended ? 1 : 0, req.body.sort_order ?? 0
        ]
      );
      res.json({ success: true, dishId: result.insertId });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/dish/:id',
  requireAdmin,
  handleUpload,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = [];
      const values = [];

      const fields = ['name', 'name_en', 'category', 'price', 'original_price', 'description',
        'stock', 'stock_warning', 'ingredients', 'allergens', 'spicy_level',
        'is_recommended', 'is_available', 'sort_order'];

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      }

      if (req.filePath) {
        updates.push('image = ?');
        values.push(req.filePath);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: '没有可更新的字段' });
      }

      values.push(id);
      await db.query(`UPDATE dishes SET ${updates.join(', ')} WHERE id = ?`, values);
      res.json({ success: true, message: '更新成功' });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.delete('/dish/:id',
  requireAdmin,
  async (req, res) => {
    try {
      await db.query('DELETE FROM dishes WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
