require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const postRoutes = require('./src/routes/posts');
const userRoutes = require('./src/routes/users');

const app = express();

// Crear carpeta de uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Connect to database
connectDB();

// Configurar CORS - asegurarse de que no haya barras finales en las URLs
const normalizeOrigin = (url) => url ? url.replace(/\/$/, '') : url;

// Si FRONTEND_URL tiene una barra final, la quitamos
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = normalizeOrigin(process.env.FRONTEND_URL);
}

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://app-pro-ivory.vercel.app']
  : ['http://localhost:4321'];

console.log('CORS allowed origins:', allowedOrigins.map(origin => normalizeOrigin(origin)));

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origin (como las aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    // Normalizar el origen eliminando cualquier barra final
    const normalizedOrigin = normalizeOrigin(origin);
    const normalizedAllowedOrigins = allowedOrigins.map(o => normalizeOrigin(o));
    
    if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`Origen no permitido: ${origin}`);
      // En producción permitimos todos los orígenes para depurar el problema
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos desde la carpeta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error en el servidor' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 