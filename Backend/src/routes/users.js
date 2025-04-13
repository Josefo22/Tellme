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

// @route   POST /api/users/me/avatar
// @desc    Upload profile picture
// @access  Private
router.post('/me/avatar', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó ninguna imagen' });
    }

    // Crear la ruta de la imagen
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Actualizar el usuario con la nueva imagen
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imageUrl },
      { new: true, select: '-password' }
    );

    res.json({
      success: true,
      profilePicture: imageUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    res.status(500).json({ message: 'Error al subir la imagen al servidor' });
  }
});

// @route   POST /api/users/me/avatar-base64
// @desc    Upload profile picture as base64 string
// @access  Private
router.post('/me/avatar-base64', protect, express.json({limit: '5mb'}), async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ message: 'No se proporcionó ninguna imagen' });
    }

    // Validar que sea una imagen base64 válida
    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Formato de imagen no válido' });
    }
    
    // Actualizar el usuario con la imagen base64
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imageBase64 },
      { new: true, select: '-password' }
    );

    res.json({
      success: true,
      profilePicture: imageBase64,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    res.status(500).json({ message: 'Error al subir la imagen al servidor' });
  }
});

// @route   PUT /api/users/me
// @desc    Update user profile
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const { name, bio } = req.body;
    
    // Validar datos
    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    
    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, bio },
      { new: true, select: '-password' }
    );
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router; 