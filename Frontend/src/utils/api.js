// URL base de la API
const getApiUrl = () => {
  // Detectar automáticamente si estamos en producción o desarrollo
  const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
  
  if (isProduction) {
    // URL para producción - usar la variable de entorno pública de Astro
    return import.meta.env.PUBLIC_API_URL || 'https://app-pro-backend.onrender.com/';
  } else {
    // URL para desarrollo local
    return 'http://localhost:5000/api';
  }
};

const API_URL = getApiUrl();

// Modo de depuración - desactivamos para producción o para reducir los logs
const DEBUG_MODE = false; // Cambiamos a false para evitar tantos mensajes en consola

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
      // Si no es JSON, obtener el texto de la respuesta pero no mostrar en consola
      const text = await response.text();
      if (DEBUG_MODE) {
        console.error('Respuesta no JSON:', text);
      }
      throw new Error('El servidor no devolvió datos JSON válidos');
    }
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('Error al procesar la respuesta:', error);
    }
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
  // Endpoints que sabemos que no están disponibles aún (para evitar errores en consola)
  const endpointsNoDisponibles = [
    '/friends/suggestions',
    '/posts/friends'     // Agregamos /posts/friends a la lista de endpoints no disponibles
    // Quitamos '/users' para permitir obtener los usuarios reales
  ];
  
  // Verificar si estamos intentando acceder a un endpoint que sabemos que no existe
  const esEndpointNoDisponible = endpointsNoDisponibles.some(e => endpoint.startsWith(e));
  
  try {
    if (DEBUG_MODE && !esEndpointNoDisponible) {
      console.log(`Haciendo petición a: ${API_URL}${endpoint}`, options);
    }
    
    // Si sabemos que no está disponible, simular fallo silenciosamente
    if (esEndpointNoDisponible) {
      // Solo mostramos mensaje si estamos en modo debug
      if (DEBUG_MODE) {
        console.log(`Omitiendo petición a endpoint no disponible: ${endpoint}`);
      }
      throw new Error(`Endpoint ${endpoint} no disponible`);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {})
      }
    });
    
    if (DEBUG_MODE && !esEndpointNoDisponible) {
      console.log(`Respuesta de ${endpoint}:`, response.status, response.statusText);
    }
    
    return await handleResponse(response);
  } catch (error) {
    // Solo registrar errores para endpoints que deberían funcionar y en modo debug
    if (DEBUG_MODE && !esEndpointNoDisponible) {
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
  getAll: async (friendsOnly = true) => {
    try {
      // Intentamos directamente con /posts si friendsOnly está habilitado
      // ya que /posts/friends no está disponible según los errores
      const endpoint = friendsOnly ? '/posts' : '/posts';
      return await apiRequest(endpoint, {
        method: 'GET'
      });
    } catch (error) {
      // Si el endpoint falla, intentamos directamente con /posts
      if (DEBUG_MODE) {
        console.warn('Endpoint de posts falló, cargando todos los posts:', error);
      }
      
      return apiRequest('/posts', {
        method: 'GET'
      });
    }
  },
  
  // Obtener un post específico por ID
  getById: async (postId) => {
    return apiRequest(`/posts/${postId}`, {
      method: 'GET'
    });
  },
  
  // Crear un nuevo post
  create: async (postData) => {
    try {
      // Si hay una imagen, asegurémonos de que esté en formato Base64
      if (postData.image) {
        // Validar que la imagen sea una cadena Base64 válida
        if (typeof postData.image !== 'string' || !postData.image.startsWith('data:')) {
          throw new Error('El formato de la imagen no es válido. Debe ser una cadena Base64.');
        }
        
        // Verificar el tamaño aproximado de la imagen (1 caracter Base64 = ~0.75 bytes)
        // 5MB equivale aproximadamente a 6.7M caracteres en Base64
        if (postData.image.length > 6700000) {
          throw new Error('La imagen es demasiado grande. El tamaño máximo permitido es 5MB.');
        }
        
        if (DEBUG_MODE) {
          console.log('Enviando imagen Base64 de longitud:', postData.image.length);
          console.log('Tipo de imagen:', postData.image.substring(0, 30));
        }
        
        // Verificar que el formato de la imagen sea válido para el backend
        const formatoValido = postData.image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!formatoValido || formatoValido.length !== 3) {
          throw new Error('El formato de la imagen no es válido para el procesamiento.');
        }
      }
      
      // Enviar los datos del post (con o sin imagen)
      try {
        return await apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
      } catch (apiError) {
        // Intenta obtener más información sobre el error
        if (DEBUG_MODE) {
          console.error('Error detallado al crear post:', apiError);
          
          // Si el error es del servidor (500), intentamos obtener más información
          try {
            const response = await fetch(`${API_URL}/posts`, {
              method: 'POST',
              headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: postData.content,
                image: postData.image ? 'BASE64_IMAGE_TRUNCATED_FOR_LOG' : null
              })
            });
            
            console.error('Respuesta de error:', {
              status: response.status,
              statusText: response.statusText
            });
            
            // Intentar obtener el cuerpo de la respuesta
            try {
              const errorBody = await response.text();
              console.error('Cuerpo de la respuesta de error:', errorBody);
            } catch (textError) {
              console.error('No se pudo obtener el cuerpo de la respuesta:', textError);
            }
          } catch (fetchError) {
            console.error('Error al intentar depurar:', fetchError);
          }
        }
        
        // Re-lanzar el error original
        throw apiError;
      }
    } catch (error) {
      console.error('Error al crear post:', error);
      throw error;
    }
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
    try {
      return await apiRequest('/users/me/stats', {
        method: 'GET'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Endpoint de estadísticas de usuario no disponible, usando datos de ejemplo:', error);
      }
      
      // Si el endpoint falla, devolver datos de ejemplo
      return {
        posts: 0,
        likes: 0,
        comments: 0
      };
    }
  }
};

// Funciones para el perfil de usuario
export const users = {
  // Obtener todos los usuarios
  getAll: async () => {
    try {
      // Intentar con el endpoint específico
      return await apiRequest('/users', {
        method: 'GET'
      });
    } catch (error) {
      // Reducimos los mensajes de consola
      if (DEBUG_MODE) {
        console.log('Endpoint /users no disponible, usando datos de ejemplo');
      }
      
      // Cargar datos de ejemplo para simulación - usamos un arreglo más amplio
      return [
        {
          _id: '67f9ec504cb03170dab525b5',
          name: 'Juan José Agudelo Vélez',
          email: 'juan@gmail.com',
          profilePicture: '/uploads/1744572717071-Foto-Personal.jpg',
          bio: 'Hola, no sé'
        },
        {
          _id: '67f9ed9f4cb03170dab525e4',
          name: 'José Juan',
          email: 'jose@gmail.com',
          profilePicture: '/uploads/placeholder.jpg',
          bio: 'Menos que se'
        },
        {
          _id: '67f9ed9f4cb03170dab525e5',
          name: 'María López',
          email: 'maria@example.com',
          profilePicture: '/images/avatar-placeholder.png',
          bio: 'Diseñadora UX/UI'
        },
        {
          _id: '67f9ed9f4cb03170dab525e6',
          name: 'Pedro Sánchez',
          email: 'pedro@example.com',
          profilePicture: '/images/avatar-placeholder.png',
          bio: 'Desarrollador backend'
        },
        {
          _id: '67f9ed9f4cb03170dab525e7',
          name: 'Ana Martínez',
          email: 'ana@example.com',
          profilePicture: '/images/avatar-placeholder.png',
          bio: 'Diseñadora gráfica'
        }
      ];
    }
  },
  
  // Actualizar perfil
  updateProfile: async (profileData) => {
    return apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },
  
  // Subir foto de perfil
  uploadProfilePicture: async (imageFile) => {
    try {
      // Verificar el tamaño del archivo (máximo 2MB)
      if (imageFile.size > 2 * 1024 * 1024) {
        throw new Error('La imagen es demasiado grande. El tamaño máximo permitido es 2MB.');
      }
      
      // Verificar el tipo de archivo
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('El formato de archivo no es válido. Solo se permiten imágenes.');
      }
      
      if (DEBUG_MODE) {
        console.log('Subiendo foto de perfil, tamaño:', Math.round(imageFile.size / 1024), 'KB');
      }
      
      // Convertir el archivo a Base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const imageBase64 = event.target?.result;
            
            if (!imageBase64 || typeof imageBase64 !== 'string') {
              throw new Error('Error al convertir la imagen a Base64');
            }
            
            // Verificar que la cadena Base64 sea válida
            if (!imageBase64.startsWith('data:image/')) {
              throw new Error('El formato de la imagen no es válido');
            }
            
            if (DEBUG_MODE) {
              console.log('Longitud de la cadena Base64:', imageBase64.length);
              console.log('Formato de imagen:', imageBase64.substring(0, 30));
            }
            
            try {
              // Enviar la imagen como JSON
              const response = await fetch(`${API_URL}/users/me/avatar-base64`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ imageBase64 })
              });
              
              // Verificar si la respuesta es JSON
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.message || 'Error al subir la imagen');
                }
                
                return resolve(data);
              } else {
                // Si no es JSON, obtener el texto de la respuesta
                const text = await response.text();
                console.error('Respuesta no JSON:', text);
                throw new Error('El servidor no devolvió datos JSON válidos');
              }
            } catch (error) {
              console.error('Error en la petición fetch:', error);
              reject(error);
            }
          } catch (error) {
            console.error('Error al procesar la imagen:', error);
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error al leer el archivo de imagen'));
        };
        
        reader.readAsDataURL(imageFile);
      });
      
    } catch (error) {
      console.error('Error al subir foto de perfil:', error);
      throw error;
    }
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

// Funciones para gestionar amigos
export const friends = {
  // Funciones auxiliares para simular backend con localStorage
  _getFriendshipData: function() {
    try {
      const data = localStorage.getItem('friendshipData');
      return data ? JSON.parse(data) : {
        friendships: [],    // Amistades establecidas
        requests: []        // Solicitudes pendientes
      };
    } catch (error) {
      console.error('Error al obtener datos de amistad del localStorage:', error);
      return {
        friendships: [],
        requests: []
      };
    }
  },
  
  _saveFriendshipData: function(data) {
    try {
      localStorage.setItem('friendshipData', JSON.stringify(data));
      
      // Disparar evento para notificar que los datos de amistad han cambiado
      try {
        const friendshipUpdatedEvent = new CustomEvent('friendshipDataChanged');
        window.dispatchEvent(friendshipUpdatedEvent);
      } catch (eventError) {
        console.error('Error al disparar evento de actualización de datos:', eventError);
      }
      
      return true;
    } catch (error) {
      console.error('Error al guardar datos de amistad:', error);
      return false;
    }
  },
  
  // Obtener lista de amigos
  getFriends: async function() {
    try {
      // Primero intentamos obtener amigos reales del backend
      return await apiRequest('/friends', {
        method: 'GET'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log('API de amigos no disponible, obteniendo amigos desde localStorage');
      }
      
      try {
        // Obtener el ID del usuario actual
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          return [];
        }
        
        // Obtener datos de amistad del localStorage
        const friendshipData = friends._getFriendshipData();
        
        // Obtener IDs de amigos reales (establecidos)
        const friendIds = friendshipData.friendships
          .filter(f => f.user1 === currentUserId || f.user2 === currentUserId)
          .map(f => f.user1 === currentUserId ? f.user2 : f.user1);
        
        if (friendIds.length === 0) {
          return [];
        }
        
        // Obtener todos los usuarios
        try {
          const allUsers = await users.getAll();
          
          // Filtrar solo los amigos establecidos
          const friendUsers = allUsers.filter(user => friendIds.includes(user._id));
          
          // Marcar usuarios como amigos confirmados
          return friendUsers.map(user => ({
            ...user,
            isFriend: true
          }));
        } catch (userError) {
          console.error('Error al obtener usuarios:', userError);
          
          // Si no podemos obtener datos de usuario, retornar solo IDs
          return friendIds.map(id => ({
            _id: id,
            name: `Usuario ${id.substring(0, 5)}`,
            profilePicture: '/images/avatar-placeholder.png',
            isFriend: true
          }));
        }
      } catch (simError) {
        console.error('Error al simular obtención de amigos:', simError);
        return [];
      }
    }
  },
  
  // Obtener solicitudes de amistad recibidas
  getFriendRequests: async function() {
    try {
      return await apiRequest('/friends/requests', {
        method: 'GET'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log('API de solicitudes no disponible, usando simulación local');
      }
      
      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          return [];
        }
        
        const friendshipData = friends._getFriendshipData();
        
        // Filtrar solicitudes recibidas por el usuario actual y que estén pendientes
        const pendingRequests = friendshipData.requests.filter(request => 
          request.receiver === currentUserId && request.status === 'pending'
        );
        
        if (pendingRequests.length === 0) {
          return [];
        }
        
        // Obtener información de usuario para cada solicitud
        try {
          // Intentar obtener usuarios del servidor
          const allUsers = await users.getAll();
          
          // Mapear solicitudes con información de usuario
          return pendingRequests.map(request => {
            const sender = allUsers.find(user => user._id === request.sender) || {
              _id: request.sender,
              name: `Usuario ${request.sender.substring(0, 5)}`,
              profilePicture: '/images/avatar-placeholder.png'
            };
            
            return {
              _id: request.id,
              sender,
              createdAt: request.createdAt
            };
          });
        } catch (userError) {
          console.error('Error al obtener datos de usuario para solicitudes:', userError);
          // Retornar datos básicos si no podemos obtener usuarios
          return pendingRequests.map(request => ({
            _id: request.id,
            sender: {
              _id: request.sender,
              name: `Usuario ${request.sender.substring(0, 5)}`,
              profilePicture: '/images/avatar-placeholder.png'
            },
            createdAt: request.createdAt
          }));
        }
      } catch (error) {
        console.error('Error al simular solicitudes:', error);
        return [];
      }
    }
  },
  
  // Enviar solicitud de amistad
  sendFriendRequest: async function(userId) {
    try {
      return await apiRequest(`/friends/request/${userId}`, {
        method: 'POST'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log(`Simulando envío de solicitud a: ${userId}`);
      }
      
      // Simular con localStorage
      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          throw new Error('Usuario no autenticado');
        }
        
        // Verificar que no se envía solicitud a uno mismo
        if (currentUserId === userId) {
          return { 
            success: false, 
            message: 'No puedes enviarte una solicitud a ti mismo', 
            isError: true 
          };
        }
        
        const friendshipData = friends._getFriendshipData();
        
        // Verificar si ya existe una solicitud o amistad
        const existingRequest = friendshipData.requests.find(r => 
          (r.sender === currentUserId && r.receiver === userId) ||
          (r.sender === userId && r.receiver === currentUserId)
        );
        
        if (existingRequest) {
          // Modificamos para que no sea un error sino que retorne un mensaje
          // Así evitamos los errores en consola
          return { 
            success: false, 
            message: 'Ya existe una solicitud pendiente', 
            isError: true 
          };
        }
        
        const existingFriendship = friendshipData.friendships.find(f => 
          (f.user1 === currentUserId && f.user2 === userId) ||
          (f.user1 === userId && f.user2 === currentUserId)
        );
        
        if (existingFriendship) {
          // Modificamos para que no sea un error sino que retorne un mensaje
          return { 
            success: false, 
            message: 'Ya son amigos', 
            isError: true 
          };
        }
        
        // Crear nueva solicitud
        const newRequest = {
          id: 'req_' + Date.now(),
          sender: currentUserId,
          receiver: userId,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        
        // Guardar la solicitud
        friendshipData.requests.push(newRequest);
        friends._saveFriendshipData(friendshipData);
        
        // Emitimos un evento personalizado para notificar a todos los componentes
        // que una nueva solicitud de amistad ha sido enviada
        try {
          const event = new CustomEvent('friendRequestSent', {
            detail: {
              requestId: newRequest.id,
              sender: currentUserId,
              receiver: userId,
              timestamp: newRequest.createdAt
            }
          });
          window.dispatchEvent(event);
          
          if (DEBUG_MODE) {
            console.log('Evento de solicitud de amistad enviado', event.detail);
          }
        } catch (eventError) {
          console.error('Error al emitir evento de solicitud:', eventError);
        }
        
        return { 
          success: true, 
          message: 'Solicitud enviada con éxito',
          request: newRequest
        };
      } catch (simError) {
        if (DEBUG_MODE) {
          console.error('Error al simular envío de solicitud:', simError);
        }
        // Retornamos un objeto con información de error en lugar de lanzar una excepción
        return { 
          success: false, 
          message: simError.message || 'Error al enviar solicitud', 
          isError: true 
        };
      }
    }
  },
  
  // Aceptar solicitud de amistad
  acceptFriendRequest: async function(requestId) {
    try {
      return await apiRequest(`/friends/accept/${requestId}`, {
        method: 'POST'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log(`Simulando aceptación de solicitud: ${requestId}`);
      }
      
      // Simular con localStorage
      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          throw new Error('Usuario no autenticado');
        }
        
        const friendshipData = friends._getFriendshipData();
        
        // Buscar la solicitud
        const requestIndex = friendshipData.requests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) {
          throw new Error('Solicitud no encontrada');
        }
        
        const request = friendshipData.requests[requestIndex];
        
        // Verificar que el usuario actual es el receptor
        if (request.receiver !== currentUserId) {
          throw new Error('No autorizado para aceptar esta solicitud');
        }
        
        // Actualizar el estado de la solicitud
        friendshipData.requests[requestIndex].status = 'accepted';
        
        // Crear nueva amistad
        const newFriendship = {
          id: 'friend_' + Date.now(),
          user1: request.sender,
          user2: request.receiver,
          createdAt: new Date().toISOString()
        };
        
        friendshipData.friendships.push(newFriendship);
        
        // Guardar cambios
        friends._saveFriendshipData(friendshipData);
        
        // Disparar un evento para notificar que se actualizaron los amigos
        try {
          const friendshipUpdatedEvent = new CustomEvent('friendshipUpdated', {
            detail: { requestId, accepted: true }
          });
          window.dispatchEvent(friendshipUpdatedEvent);
        } catch (eventError) {
          console.error('Error al disparar evento de actualización:', eventError);
        }
        
        return { success: true, message: 'Solicitud aceptada con éxito' };
      } catch (simError) {
        console.error('Error al simular aceptación de solicitud:', simError);
        throw simError;
      }
    }
  },
  
  // Rechazar solicitud de amistad
  rejectFriendRequest: async function(requestId) {
    try {
      return await apiRequest(`/friends/reject/${requestId}`, {
        method: 'POST'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log(`Simulando rechazo de solicitud: ${requestId}`);
      }
      
      // Simular con localStorage
      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          throw new Error('Usuario no autenticado');
        }
        
        const friendshipData = friends._getFriendshipData();
        
        // Buscar la solicitud
        const requestIndex = friendshipData.requests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) {
          throw new Error('Solicitud no encontrada');
        }
        
        const request = friendshipData.requests[requestIndex];
        
        // Verificar que el usuario actual es el receptor
        if (request.receiver !== currentUserId) {
          throw new Error('No autorizado para rechazar esta solicitud');
        }
        
        // Actualizar el estado de la solicitud o eliminarla
        friendshipData.requests[requestIndex].status = 'rejected';
        
        // Guardar cambios
        friends._saveFriendshipData(friendshipData);
        
        // Disparar un evento para notificar que se actualizaron los amigos
        try {
          const friendshipUpdatedEvent = new CustomEvent('friendshipUpdated', {
            detail: { requestId, accepted: false }
          });
          window.dispatchEvent(friendshipUpdatedEvent);
        } catch (eventError) {
          console.error('Error al disparar evento de actualización:', eventError);
        }
        
        return { success: true, message: 'Solicitud rechazada con éxito' };
      } catch (simError) {
        console.error('Error al simular rechazo de solicitud:', simError);
        throw simError;
      }
    }
  },
  
  // Eliminar amigo
  removeFriend: async function(friendId) {
    try {
      return await apiRequest(`/friends/${friendId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log(`Simulando eliminación de amigo: ${friendId}`);
      }
      
      // Simular con localStorage
      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          throw new Error('Usuario no autenticado');
        }
        
        const friendshipData = friends._getFriendshipData();
        
        // Buscar la amistad
        const friendshipIndex = friendshipData.friendships.findIndex(f => 
          (f.user1 === currentUserId && f.user2 === friendId) ||
          (f.user1 === friendId && f.user2 === currentUserId)
        );
        
        if (friendshipIndex === -1) {
          throw new Error('Amistad no encontrada');
        }
        
        // Eliminar la amistad
        friendshipData.friendships.splice(friendshipIndex, 1);
        
        // Guardar cambios
        friends._saveFriendshipData(friendshipData);
        
        // Disparar un evento para notificar que se actualizaron los amigos
        try {
          const friendshipUpdatedEvent = new CustomEvent('friendshipUpdated', {
            detail: { friendId, removed: true }
          });
          window.dispatchEvent(friendshipUpdatedEvent);
        } catch (eventError) {
          console.error('Error al disparar evento de actualización:', eventError);
        }
        
        return { success: true, message: 'Amigo eliminado con éxito' };
      } catch (simError) {
        console.error('Error al simular eliminación de amigo:', simError);
        throw simError;
      }
    }
  },
  
  // Obtener sugerencias de amistad
  getSuggestions: async function() {
    try {
      return await apiRequest('/friends/suggestions', {
        method: 'GET'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log('Generando sugerencias de amistad de ejemplo');
      }
      return [
        {
          _id: '9',
          name: 'Diego Morales',
          profilePicture: '/images/avatar-placeholder.png',
          bio: 'Desarrollador móvil'
        },
        {
          _id: '10',
          name: 'Elena Castro',
          profilePicture: '/images/avatar-placeholder.png',
          bio: 'Ingeniera de datos'
        },
        {
          _id: '11',
          name: 'Javier Ruiz',
          profilePicture: '/images/avatar-placeholder.png',
          bio: 'Arquitecto de software'
        }
      ];
    }
  },
  
  // Buscar usuarios por nombre
  searchUsers: async function(query) {
    try {
      // Intentar usar el endpoint de búsqueda específico
      const encodedQuery = encodeURIComponent(query.trim());
      
      return await apiRequest(`/users/search?q=${encodedQuery}`, {
        method: 'GET'
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.log('API de búsqueda no disponible, intentando obtener todos los usuarios');
      }
      
      try {
        // Si no hay endpoint de búsqueda, obtener todos los usuarios usando la función getAll
        const allUsers = await users.getAll();
        
        // Obtener el ID del usuario actual para excluirlo de los resultados
        const currentUserId = getCurrentUserId();
        
        // Si no hay consulta, devolver todos los usuarios excepto el actual
        if (!query) {
          return allUsers.filter(user => user._id !== currentUserId);
        }
        
        // Filtrar los usuarios por nombre (case insensitive)
        const lowerQuery = query.toLowerCase().trim();
        return allUsers.filter(user => 
          user._id !== currentUserId && 
          user.name && 
          user.name.toLowerCase().includes(lowerQuery)
        );
      } catch (userError) {
        if (DEBUG_MODE) {
          console.log('No se pudo obtener la lista de usuarios, usando datos de ejemplo');
        }
        
        // Si todo falla, usar datos de ejemplo
        const exampleUsers = [
          {
            _id: '1',
            name: 'Juan García',
            email: 'juan@example.com',
            profilePicture: '/images/avatar-placeholder.png',
            bio: 'Desarrollador frontend'
          },
          {
            _id: '2',
            name: 'María López',
            email: 'maria@example.com',
            profilePicture: '/images/avatar-placeholder.png',
            bio: 'Diseñadora UX/UI'
          },
          {
            _id: '3',
            name: 'Pedro Sánchez',
            email: 'pedro@example.com',
            profilePicture: '/images/avatar-placeholder.png',
            bio: 'Desarrollador backend'
          },
          {
            _id: '4',
            name: 'Ana Martínez',
            email: 'ana@example.com',
            profilePicture: '/images/avatar-placeholder.png',
            bio: 'Diseñadora gráfica'
          },
          {
            _id: '5',
            name: 'Luis Rodríguez',
            email: 'luis@example.com',
            profilePicture: '/images/avatar-placeholder.png',
            bio: 'Ingeniero de software'
          }
        ];
        
        // Obtener el ID del usuario actual para excluirlo
        const currentUserId = getCurrentUserId();
        
        // Si no hay consulta, devolver todos los usuarios de ejemplo excepto el actual
        if (!query) {
          return exampleUsers.filter(user => user._id !== currentUserId);
        }
        
        // Filtrar por nombre
        const lowerQuery = query.toLowerCase().trim();
        return exampleUsers.filter(user => 
          user._id !== currentUserId &&
          user.name.toLowerCase().includes(lowerQuery)
        );
      }
    }
  },
  
  // Método para inicializar listeners de eventos
  initializeEventListeners: function() {
    // Verificar si ya hemos inicializado los listeners para evitar duplicados
    if (window._friendListenersInitialized) {
      return;
    }
    
    // Escuchar eventos de almacenamiento para sincronizar entre pestañas
    window.addEventListener('storage', function(event) {
      if (event.key === 'friendshipData') {
        if (DEBUG_MODE) {
          console.log('Datos de amistad actualizados en otra pestaña');
        }
        
        // Disparar evento para notificar que los datos de amistad han cambiado
        try {
          const friendshipUpdatedEvent = new CustomEvent('friendshipDataChanged');
          window.dispatchEvent(friendshipUpdatedEvent);
        } catch (eventError) {
          console.error('Error al disparar evento de actualización de datos:', eventError);
        }
      }
    });
    
    // Marcar como inicializado
    window._friendListenersInitialized = true;
    
    if (DEBUG_MODE) {
      console.log('Listeners de eventos de amistad inicializados');
    }
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