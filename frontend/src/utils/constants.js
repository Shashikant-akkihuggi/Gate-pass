export const ROLES = {
    STUDENT: 'STUDENT',
    CLASS_COORDINATOR: 'CLASS_COORDINATOR',
    HOSTEL_OFFICE: 'HOSTEL_OFFICE',
    CHIEF_WARDEN: 'CHIEF_WARDEN',
    WATCHMAN: 'WATCHMAN',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
};

export const PASS_STATUS = {
    PENDING: 'PENDING',
    FINAL_APPROVED: 'FINAL_APPROVED',
    APPROVED: 'FINAL_APPROVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
    USED: 'USED',
};

export const PASS_TYPES = {
    HALF_DAY: 'HALF_DAY',
    HOME_PASS: 'HOME_PASS',
};

export const ACTION_TYPES = {
    EXIT: 'EXIT',
    ENTRY: 'ENTRY',
};

export const STATUS_COLORS = {
    // Legacy
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    FINAL_APPROVED: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-orange-100 text-orange-800',
    USED: 'bg-blue-100 text-blue-800',
    // New workflow statuses
    IN_APPROVAL: 'bg-yellow-100 text-yellow-800',
    PENDING_CLASS_COORDINATOR: 'bg-yellow-100 text-yellow-800',
    PENDING_HOSTEL_OFFICE: 'bg-blue-100 text-blue-800',
    FINAL_APPROVED: 'bg-green-100 text-green-800',
    OUTSIDE: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-green-800',
    COMPLETED_LATE: 'bg-red-100 text-red-800',
};

export const GATE_LOCATIONS = [
    'Main Gate',
    'Side Gate',
    'Back Gate',
    'Emergency Exit',
];
