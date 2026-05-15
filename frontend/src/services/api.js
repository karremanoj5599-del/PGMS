import axios from 'axios';

const api = axios.create();

// Axios Interceptor for Multi-tenancy
api.interceptors.request.use((config) => {
  const userString = localStorage.getItem('pgms_user');
  if (userString) {
    const user = JSON.parse(userString);
    if (user.user_id) {
      config.headers['x-user-id'] = user.user_id;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
