import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get API URL from Expo config or environment
const getApiUrl = () => {
  // Try expo config first
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl) return configUrl;
  
  // Fallback to environment variable for Expo Go
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) return `${envUrl}/api`;
  
  // Default for development
  return 'https://delivery-test-2.preview.emergentagent.com/api';
};

const API_BASE_URL = getApiUrl();
console.log('API URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
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

// Subscription APIs with Smart Planner
export const subscriptionAPI = {
  getSubscription: () => api.get('/subscription'),
  createSubscription: (data: { plan: string; delivery_address: string }) =>
    api.post('/subscription', data),
  skipMeal: (data: { date: string; meal_type: string }) =>
    api.post('/subscription/skip', data),
  setVacationMode: (data: { start_date: string; end_date: string; active?: boolean }) =>
    api.post('/subscription/vacation', data),
  getCalendar: () => api.get('/subscription/calendar'),
  swapMeal: (data: { date: string; original_meal: string; replacement_meal: string }) =>
    api.post('/subscription/swap-meal', data),
};

// Wallet APIs - Trust Engine
export const walletAPI = {
  getWallet: () => api.get('/wallet'),
  creditWallet: (data: { amount: number; reason: string; reference_id?: string }) =>
    api.post('/wallet/credit', data),
};

// Kitchen Portal APIs
export const kitchenAPI = {
  // Dashboard
  getDashboard: () => api.get('/kitchen/dashboard'),
  
  // Preparation List
  getPreparationList: () => api.get('/kitchen/preparation-list'),
  updateCustomerItems: (customerId: string, items: { roti?: number; sabji?: number; dal?: number; rice?: number; salad?: number; bread?: number }) =>
    api.put(`/kitchen/customer-items/${customerId}`, items),
  
  // Batch Totals
  getBatchTotals: () => api.get('/kitchen/batch-totals'),
  markSoldOut: (itemName: string) => api.post('/kitchen/mark-sold-out', { item_name: itemName }),
  getSoldOutItems: () => api.get('/kitchen/sold-out'),
  
  // Dishes
  getDishes: () => api.get('/kitchen/dishes'),
  createDish: (data: { name: string; description: string; type: string; category?: string; price: number; image_url?: string }) =>
    api.post('/kitchen/dishes', data),
  updateDish: (id: string, data: { name?: string; description?: string; type?: string; category?: string; price?: number; image_url?: string }) =>
    api.put(`/kitchen/dishes/${id}`, data),
  deleteDish: (id: string) => api.delete(`/kitchen/dishes/${id}`),
  seedDishes: () => api.post('/kitchen/seed-dishes'),
  
  // Categories
  getCategories: () => api.get('/kitchen/categories'),
  createCategory: (data: { name: string; description?: string; icon?: string; sort_order?: number }) =>
    api.post('/kitchen/categories', data),
  updateCategory: (id: string, data: { name: string; description?: string; icon?: string; sort_order?: number }) =>
    api.put(`/kitchen/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/kitchen/categories/${id}`),
  
  // Subscription Plans
  getPlans: () => api.get('/kitchen/plans'),
  createPlan: (data: { name: string; price: number; description?: string; features?: string[]; is_active?: boolean }) =>
    api.post('/kitchen/plans', data),
  updatePlan: (id: string, data: { name: string; price: number; description?: string; features?: string[]; is_active?: boolean }) =>
    api.put(`/kitchen/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/kitchen/plans/${id}`),
  
  // Menu (Modular Dinner Builder)
  getMenu: () => api.get('/kitchen/menu'),
  setMenuDay: (data: { date: string; dinner_item_ids: string[] }) =>
    api.post('/kitchen/menu', data),
  
  // Modular Prep List
  getModularPrepList: () => api.get('/kitchen/modular-prep-list'),
  
  // Halifax Test Data
  seedHalifaxData: () => api.post('/kitchen/seed-halifax-data'),
  
  // Customers
  getCustomers: () => api.get('/kitchen/customers'),
  
  // Orders
  getOrders: () => api.get('/kitchen/orders'),
  
  // Smart Delivery System
  markOrdersReady: (orderIds: string[]) => api.post('/kitchen/mark-ready', { order_ids: orderIds }),
  getPrintLabels: () => api.get('/kitchen/print-labels'),
};

// Public APIs
export const publicAPI = {
  getPlans: () => api.get('/plans'),
  getCategories: () => api.get('/categories'),
};

// Driver APIs (Enhanced)
export const driverAPI = {
  getDeliveries: (lat?: number, lon?: number) => {
    const params: Record<string, string> = {};
    if (lat !== undefined && lon !== undefined) {
      params.lat = lat.toString();
      params.lon = lon.toString();
    }
    return api.get('/driver/deliveries', { params });
  },
  getOptimizedRoute: (lat: number, lon: number) => 
    api.get('/driver/optimized-route', { params: { lat, lon } }),
  updateLocation: (latitude: number, longitude: number) =>
    api.post('/driver/update-location', { latitude, longitude }),
  startDelivery: (deliveryId: string) =>
    api.put(`/driver/start-delivery/${deliveryId}`),
  completeDelivery: (deliveryId: string, status: string, photoBase64?: string) =>
    api.put(`/driver/complete-delivery/${deliveryId}`, { status, photo_base64: photoBase64 }),
  failDelivery: (deliveryId: string, reason: string = 'customer_unavailable') =>
    api.put(`/driver/fail-delivery/${deliveryId}`, null, { params: { reason } }),
  updateDeliveryStatus: (id: string, status: string, photoBase64?: string) =>
    api.put(`/driver/delivery/${id}/status`, { 
      status,
      photo_base64: photoBase64 
    }),
};

// Customer APIs (Enhanced with tracking and issue reporting)
export const customerAPI = {
  getDeliveryStatus: () => api.get('/customer/delivery-status'),
  trackDriver: () => api.get('/customer/track-driver'),
  reportIssue: (data: { issue_type: string; description?: string; date?: string }) =>
    api.post('/customer/report-issue', data),
  
  // Platinum Tiffin Features
  getPreferences: () => api.get('/customer/preferences'),
  updatePreferences: (data: { level: string }) => api.put('/customer/preferences', data),
  rateMeal: (data: { date: string; rating: string; feedback?: string }) =>
    api.post('/customer/rate-meal', data),
  getWeeklyPlan: () => api.get('/customer/weekly-plan'),
  addExtra: (data: { date: string; item_id: string; quantity?: number }) =>
    api.post('/customer/add-extra', data),
};

// Weather & Extras APIs
export const weatherAPI = {
  getStatus: () => api.get('/weather-status'),
};

export const extrasAPI = {
  getExtras: () => api.get('/extras'),
};

// Kitchen Intelligence APIs
export const kitchenIntelAPI = {
  getIngredientForecast: () => api.get('/kitchen/ingredient-forecast'),
  getCustomerPreferences: () => api.get('/kitchen/customer-preferences'),
  getMealRatings: () => api.get('/kitchen/meal-ratings'),
  setWeatherStatus: (status: string) => api.put('/kitchen/weather-status', null, { params: { status } }),
};

export default api;
