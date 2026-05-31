import api from './api';

export const authService = {
    login: async (identifier, password) => {
        const response = await api.post('/auth/login', { identifier, password });
        const { user, profile, tokens } = response.data.data;

        // Store tokens
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);

        // Store user with profile data
        const userData = {
            ...user,
            profile: profile
        };
        localStorage.setItem('user', JSON.stringify(userData));

        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('accessToken');
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await api.post('/auth/change-password', {
            currentPassword,
            newPassword,
        });
        return response.data;
    },
};
