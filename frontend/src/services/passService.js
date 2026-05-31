import api from './api';

export const passService = {
    // Create pass application
    createPass: async (passData) => {
        const response = await api.post('/passes/apply', passData);
        return response.data;
    },

    // Get student passes
    getMyPasses: async (filters = {}) => {
        const response = await api.get('/passes/my-passes', { params: filters });
        return response.data;
    },

    // Get pass by ID
    getPassById: async (passId) => {
        const response = await api.get(`/passes/${passId}`);
        return response.data;
    },

    // Cancel pass
    cancelPass: async (passId, cancellation_reason = null) => {
        const response = await api.put(`/passes/${passId}/cancel`, { cancellation_reason });
        return response.data;
    },

    // Get pass statistics
    getPassStats: async () => {
        const response = await api.get('/passes/stats');
        return response.data;
    },

    // Get pass types
    getPassTypes: async () => {
        const response = await api.get('/passes/types');
        return response.data;
    },

    // Download QR code
    downloadQR: async (passId) => {
        const response = await api.get(`/passes/${passId}/qr`, {
            responseType: 'blob',
        });
        return response.data;
    },

    // Download pass PDF
    downloadPassPDF: async (passId) => {
        const response = await api.get(`/passes/${passId}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },
};
