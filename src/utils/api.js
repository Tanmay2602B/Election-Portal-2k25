import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Point to our Express server
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Auto logout if 401 response returned from api
            localStorage.removeItem('token');
            // window.location.href = '/login'; // Optional: redirect to login
        }
        return Promise.reject(error);
    }
);

export default api;
