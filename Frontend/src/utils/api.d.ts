declare namespace API {
  interface User {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  }

  interface Post {
    _id: string;
    content: string;
    user: User;
    createdAt: string;
    updatedAt: string;
    likes: string[];
    comments: string[];
    image?: string;
  }

  interface Comment {
    _id: string;
    content: string;
    user: User;
    post: string;
    createdAt: string;
    updatedAt: string;
  }
}

// Declaraciones para funciones de API
declare const auth: {
  register: (userData: { name: string; email: string; password: string }) => Promise<any>;
  login: (credentials: { email: string; password: string }) => Promise<any>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<API.User>;
};

declare const posts: {
  getAll: (friendsOnly?: boolean) => Promise<API.Post[]>;
  create: (postData: { content: string; image?: string }) => Promise<API.Post>;
  like: (postId: string) => Promise<any>;
  comment: (postId: string, content: string) => Promise<API.Comment>;
  getComments: (postId: string) => Promise<API.Comment[]>;
};

declare const users: {
  search: (query: string) => Promise<API.User[]>;
  getUserById: (userId: string) => Promise<API.User>;
};

declare const friends: {
  getFriends: () => Promise<API.User[]>;
  getFriendRequests: () => Promise<any[]>;
  sendFriendRequest: (userId: string) => Promise<any>;
  acceptFriendRequest: (requestId: string) => Promise<any>;
  rejectFriendRequest: (requestId: string) => Promise<any>;
};

declare const utils: {
  isAuthenticated: () => boolean;
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
}; 