import api from './api';

export const approvalService = {
    // Get pending approvals
    getPendingApprovals: async () => {
        const response = await api.get('/approvals/pending');
        return response.data;
    },

    // Approve pass
    approvePass: async (passId, remarks) => {
        const response = await api.post(`/approvals/${passId}/approve`, { remarks });
        return response.data;
    },

    // Reject pass
    rejectPass: async (passId, remarks) => {
        const response = await api.post(`/approvals/${passId}/reject`, { remarks });
        return response.data;
    },

    // Get approval history
    getApprovalHistory: async (filters = {}) => {
        const response = await api.get('/approvals/history', { params: filters });
        return response.data;
    },

    // Get approval statistics
    getApprovalStats: async () => {
        const response = await api.get('/approvals/stats');
        return response.data;
    },

    // Get pass approval timeline
    getPassTimeline: async (passId) => {
        const response = await api.get(`/approvals/${passId}/timeline`);
        return response.data;
    },
};
