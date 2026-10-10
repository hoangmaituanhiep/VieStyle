import axios from 'axios';

/**
 * Backend API Base URL
 * Mặc định trỏ trực tiếp tới Backend Express trên Render: https://viestyle.onrender.com
 * Có thể linh hoạt ghi đè bằng biến môi trường VITE_API_URL trên Vercel khi cần.
 */
export const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://viestyle.onrender.com'
).replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

