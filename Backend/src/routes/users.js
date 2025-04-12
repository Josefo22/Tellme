const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const User = require('../models/User');
const Post = require('../models/Post');
const path = require('path');
const fs = require('fs');

// @route   GET /api/users/me/stats
// @desc    Get user stats
// @access  Private
router.get('/me/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener todos los posts del usuario
    const posts = await Post.find({ user: userId });
    
    // Obtener total de likes recibidos
    const likes = posts.reduce((total, post) => total + post.likes.length, 0);
    
    // Obtener total de comentarios recibidos
    const comments = posts.reduce((total, post) => total + post.comments.length, 0);
    
    res.json({
      posts: posts.length,
      likes,
      comments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router; 