const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Asegurar que siempre haya un JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'una_clave_secreta_muy_larga_y_segura_123456789';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error('Error de autenticación:', error);
      res.status(401).json({ message: 'No autorizado' });
    }
  } else {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

module.exports = { protect }; 