const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Post = require('../models/Post');
const path = require('path');
const fs = require('fs');

// @route   POST /api/posts
// @desc    Create a post
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { content, image } = req.body;
    
    // Si la imagen es un string base64, guardarla como archivo
    let imagePath = null;
    if (image && image.startsWith('data:image')) {
      // Extraer datos de la imagen
      const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ message: 'Formato de imagen inválido' });
      }
      
      // Extraer el tipo de imagen y los datos
      const imageType = matches[1];
      const imageData = matches[2];
      const buffer = Buffer.from(imageData, 'base64');
      
      // Verificar el tamaño (max 5MB)
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ message: 'La imagen es demasiado grande (máximo 5MB)' });
      }
      
      // Crear nombre de archivo único
      const fileName = `post_${Date.now()}.${imageType.replace('jpeg', 'jpg')}`;
      const filePath = path.join(__dirname, '../../uploads', fileName);
      
      // Guardar archivo
      fs.writeFileSync(filePath, buffer);
      
      // Guardar la ruta relativa
      imagePath = `/uploads/${fileName}`;
    }

    const post = new Post({
      user: req.user.id,
      content,
      image: imagePath
    });

    await post.save();
    
    // Obtener el post completo con la información del usuario
    const createdPost = await Post.findById(post._id)
      .populate('user', 'name profilePicture');

    res.status(201).json(createdPost);
  } catch (error) {
    console.error('Error al crear post:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// @route   GET /api/posts
// @desc    Get all posts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// @route   GET /api/posts/me
// @desc    Get posts of current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');
    
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// @route   GET /api/posts/:id
// @desc    Get a post by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like a post
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    // Check if already liked
    if (post.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'Post ya ha sido likeado' });
    }

    post.likes.push(req.user.id);
    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// @route   POST /api/posts/:id/comment
// @desc    Comment on a post
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    post.comments.push({
      user: req.user.id,
      content
    });

    await post.save();
    
    // Obtener el post actualizado con los comentarios poblados
    const updatedPost = await Post.findById(req.params.id)
      .populate('user', 'name profilePicture')
      .populate('comments.user', 'name profilePicture');

    res.json(updatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router; 