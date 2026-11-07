
const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1/api').replace(/\/$/, '');
export const USER_API_URL = `${baseUrl}/users`;
export const LOGIN_API_URL = `${baseUrl}/auth/login`;
export const CUSTOMER_API_URL = `${baseUrl}/customers`;
