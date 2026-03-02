import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Use local backend API
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://dabba-driver-portal.preview.emergentagent.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth APIs
export const authAPI = {
  register: (data: { name: string; email: string; password: string; phone: string; address?: string; role?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Menu APIs - Backend now returns proper format
export const menuAPI = {
  getWeeklyMenu: async () => {
    const response = await api.get('/menu');
    return response;
  },
};

// Subscription APIs
export const subscriptionAPI = {
  getSubscription: () => api.get('/subscription'),
  createSubscription: (data: { plan: string; delivery_address: string }) =>
    api.post('/subscription', data),
  skipMeal: (data: { date: string; meal_type: string }) =>
    api.post('/subscription/skip', data),
};

// Wallet APIs
export const walletAPI = {
  getWallet: () => api.get('/wallet'),
};

// Driver APIs
export const driverAPI = {
  getDeliveries: (lat?: number, lon?: number) => {
    const params: Record<string, string> = {};
    if (lat !== undefined && lon !== undefined) {
      params.lat = lat.toString();
      params.lon = lon.toString();
    }
    return api.get('/driver/deliveries', { params });
  },
  updateDeliveryStatus: (id: string, status: string, photoBase64?: string) =>
    api.put(`/driver/delivery/${id}/status`, { 
      status,
      photo_base64: photoBase64 
    }),
};

// Kitchen Portal APIs
export const kitchenAPI = {
  // Dashboard
  getDashboard: () => api.get('/kitchen/dashboard'),
  
  // Dishes
  getDishes: () => api.get('/kitchen/dishes'),
  createDish: (data: { name: string; description: string; type: string; price: number; image_url?: string }) =>
    api.post('/kitchen/dishes', data),
  updateDish: (id: string, data: { name?: string; description?: string; type?: string; price?: number; image_url?: string }) =>
    api.put(`/kitchen/dishes/${id}`, data),
  deleteDish: (id: string) => api.delete(`/kitchen/dishes/${id}`),
  seedDishes: () => api.post('/kitchen/seed-dishes'),
  
  // Menu
  getMenu: () => api.get('/kitchen/menu'),
  setMenuDay: (data: { date: string; lunch_dish_id: string; dinner_dish_id: string }) =>
    api.post('/kitchen/menu', data),
  
  // Customers
  getCustomers: () => api.get('/kitchen/customers'),
  
  // Orders
  getOrders: () => api.get('/kitchen/orders'),
};

export default api;
