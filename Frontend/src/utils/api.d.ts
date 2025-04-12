// Declaración de tipos para api.js
declare module '../utils/api.js' {
  export const auth: {
    register: (userData: any) => Promise<any>;
    login: (credentials: any) => Promise<any>;
    logout: () => void;
    getCurrentUser: () => Promise<any>;
  };
  
  export const posts: {
    getAll: () => Promise<any[]>;
    getById: (postId: string) => Promise<any>;
    create: (postData: any) => Promise<any>;
    like: (postId: string) => Promise<any>;
    comment: (postId: string, content: string) => Promise<any>;
    getUserPosts: () => Promise<any[]>;
    getUserStats: () => Promise<any>;
  };
  
  export const users: {
    updateProfile: (profileData: any) => Promise<any>;
    uploadProfilePicture: (imageFile: File) => Promise<any>;
  };
  
  export const utils: {
    getToken: () => string | null;
    setToken: (token: string) => void;
    removeToken: () => void;
    isAuthenticated: () => boolean;
    getAuthHeaders: () => Record<string, string>;
  };
} 