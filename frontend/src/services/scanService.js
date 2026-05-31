import api from './api';

export const scanService = {
    // Validate QR code
    validateQR: async (qrData) => {
        const response = await api.post('/scan/validate', { qrData });
        return response.data;
    },

    // Record exit scan
    recordExit: async (qrData, gateLocation, remarks) => {
        const response = await api.post('/scan/exit', {
            qrData,
            gateLocation,
            remarks,
        });
        return response.data;
    },

    // Record entry scan
    recordEntry: async (qrData, gateLocation, remarks) => {
        const response = await api.post('/scan/entry', {
            qrData,
            gateLocation,
            remarks,
        });
        return response.data;
    },

    // Get scan history
    getScanHistory: async (filters = {}) => {
        const response = await api.get('/scan/history', { params: filters });
        return response.data;
    },

    // Get pass scan logs
    getPassScanLogs: async (passId) => {
        const response = await api.get(`/scan/pass/${passId}`);
        return response.data;
    },

    // Get scan statistics
    getScanStats: async (filters = {}) => {
        const response = await api.get('/scan/stats', { params: filters });
        return response.data;
    },
};
