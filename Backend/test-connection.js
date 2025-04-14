require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function testConnection() {
  try {
    console.log('Intentando conectar a MongoDB...');
    console.log('URI:', process.env.MONGODB_URI ? 'Definida (no mostrada por seguridad)' : 'No definida');
    
    // Conectar a MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('¡Conexión exitosa!');
    console.log(`Host de MongoDB: ${conn.connection.host}`);
    console.log(`Base de datos: ${conn.connection.db.databaseName}`);
    
    // Listar colecciones
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Colecciones disponibles:');
    collections.forEach(collection => {
      console.log(` - ${collection.name}`);
    });
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión cerrada');
  } catch (error) {
    console.error('Error de conexión:', error);
  }
}

async function seedUser() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Creando usuario de prueba...');
    
    // Generar hash de contraseña manualmente
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Prueba123', salt);
    
    // Crear usuario de prueba
    const testUser = new User({
      name: 'Usuario Prueba',
      email: 'prueba@example.com',
      password: hashedPassword,
      bio: 'Usuario de prueba creado por script'
    });
    
    // Guardar en la base de datos
    await testUser.save();
    
    console.log('Usuario creado correctamente con estas credenciales:');
    console.log('Email: prueba@example.com');
    console.log('Password: Prueba123');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();
seedUser(); 