import { format, formatDistance, parseISO } from 'date-fns';

export const formatDate = (date) => {
    if (!date) return '';
    return format(parseISO(date), 'MMM dd, yyyy');
};

export const formatDateTime = (date) => {
    if (!date) return '';
    return format(parseISO(date), 'MMM dd, yyyy hh:mm a');
};

export const formatTime = (date) => {
    if (!date) return '';
    return format(parseISO(date), 'hh:mm a');
};

export const getRelativeTime = (date) => {
    if (!date) return '';
    return formatDistance(parseISO(date), new Date(), { addSuffix: true });
};

export const getStatusBadgeClass = (status) => {
    const classes = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        APPROVED: 'bg-green-100 text-green-800',
        FINAL_APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-800',
        EXPIRED: 'bg-orange-100 text-orange-800',
        USED: 'bg-blue-100 text-blue-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
};

export const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const handleError = (error) => {
    if (error.response) {
        return error.response.data.message || 'An error occurred';
    } else if (error.request) {
        return 'No response from server';
    } else {
        return error.message || 'An error occurred';
    }
};
