import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the external backend API
const API_BASE_URL = 'https://subscription-meals-1.preview.emergentagent.com/api';

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

// Menu APIs - Transform data to match our UI format
export const menuAPI = {
  getWeeklyMenu: async () => {
    const response = await api.get('/menu');
    // Transform backend format to UI format
    const transformedMenu = response.data.map((item: any) => {
      const date = new Date(item.date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        date: item.date,
        day: dayNames[date.getDay()],
        lunch: {
          name: item.main_item,
          description: `Served with ${item.side_item}, ${item.farsan}, and ${item.sweet}`,
          type: 'vegetarian',
        },
        dinner: {
          name: item.main_item,
          description: `Served with ${item.side_item}, ${item.farsan}, and ${item.sweet}`,
          type: 'vegetarian',
        },
      };
    });
    return { data: { menu: transformedMenu } };
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
  getDeliveries: () => api.get('/driver/deliveries'),
  updateDeliveryStatus: (id: string, status: string) =>
    api.put(`/driver/delivery/${id}/status`, { status }),
};

export default api;
