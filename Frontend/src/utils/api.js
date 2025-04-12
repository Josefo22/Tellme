// URL base de la API
const API_URL = 'http://localhost:5000/api';

// Modo de depuración
const DEBUG_MODE = true;

// Función para manejar las respuestas de la API
const handleResponse = async (response) => {
  try {
    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        // Si hay un error, lanzar una excepción con el mensaje
        throw new Error(data.message || 'Algo salió mal');
      }
      
      return data;
    } else {
      // Si no es JSON, obtener el texto de la respuesta
      const text = await response.text();
      console.error('Respuesta no JSON:', text);
      throw new Error('El servidor no devolvió datos JSON válidos');
    }
  } catch (error) {
    console.error('Error al procesar la respuesta:', error);
    throw error;
  }
};

// Función para obtener el token del localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Función para establecer el token en el localStorage
const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Función para eliminar el token del localStorage
const removeToken = () => {
  localStorage.removeItem('token');
};

// Función para verificar si el usuario está autenticado
const isAuthenticated = () => {
  return !!getToken();
};

// Función para obtener los headers con el token de autenticación
const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Función para hacer peticiones a la API con manejo de errores
const apiRequest = async (endpoint, options = {}) => {
  try {
    if (DEBUG_MODE) {
      console.log(`Haciendo petición a: ${API_URL}${endpoint}`, options);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {})
      }
    });
    
    if (DEBUG_MODE) {
      console.log(`Respuesta de ${endpoint}:`, response.status, response.statusText);
    }
    
    return await handleResponse(response);
  } catch (error) {
    if (DEBUG_MODE) {
      console.error(`Error en petición a ${endpoint}:`, error);
    }
    throw error;
  }
};

// Funciones para la autenticación
export const auth = {
  // Registro de usuario
  register: async (userData) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    setToken(response.token);
    return response;
  },
  
  // Inicio de sesión
  login: async (credentials) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    setToken(response.token);
    return response;
  },
  
  // Cierre de sesión
  logout: () => {
    removeToken();
  },
  
  // Obtener usuario actual
  getCurrentUser: async () => {
    return apiRequest('/auth/me', {
      method: 'GET'
    });
  }
};

// Funciones para los posts
export const posts = {
  // Obtener todos los posts
  getAll: async () => {
    return apiRequest('/posts', {
      method: 'GET'
    });
  },
  
  // Obtener un post específico por ID
  getById: async (postId) => {
    return apiRequest(`/posts/${postId}`, {
      method: 'GET'
    });
  },
  
  // Crear un nuevo post
  create: async (postData) => {
    return apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  },
  
  // Dar like a un post
  like: async (postId) => {
    return apiRequest(`/posts/${postId}/like`, {
      method: 'POST'
    });
  },
  
  // Comentar en un post
  comment: async (postId, content) => {
    return apiRequest(`/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },
  
  // Obtener posts del usuario
  getUserPosts: async () => {
    return apiRequest('/posts/me', {
      method: 'GET'
    });
  },
  
  // Obtener estadísticas del usuario
  getUserStats: async () => {
    return apiRequest('/users/me/stats', {
      method: 'GET'
    });
  }
};

// Funciones para el perfil de usuario
export const users = {
  // Actualizar perfil
  updateProfile: async (profileData) => {
    return apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },
  
  // Subir foto de perfil
  uploadProfilePicture: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return apiRequest('/users/me/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });
  }
};

// Función para obtener el ID del usuario actual
const getCurrentUserId = () => {
  try {
    const token = getToken();
    if (!token) return null;
    
    // El token JWT tiene formato header.payload.signature
    // Decodificamos la parte del payload (índice 1)
    const payload = token.split('.')[1];
    // El payload está en base64, lo decodificamos
    const decodedPayload = atob(payload);
    // Parseamos el JSON
    const userData = JSON.parse(decodedPayload);
    
    return userData.id || userData._id || userData.userId || null;
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null;
  }
};

// Exportar funciones de utilidad
export const utils = {
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  getAuthHeaders,
  getCurrentUserId
}; 