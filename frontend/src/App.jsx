import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import CoordinatorRegister from './pages/CoordinatorRegister';
import StudentDashboard from './pages/student/Dashboard';
import MyPasses from './pages/student/MyPasses';
import NewPass from './pages/student/NewPass';
import StudentProfile from './pages/student/Profile';
import Notifications from './pages/student/Notifications';
import Approvals from './pages/approver/Approvals';
import ApprovalHistory from './pages/approver/ApprovalHistory';
import Reports from './pages/reports/Reports';
import ScanQR from './pages/watchman/ScanQR';
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import PassManagement from './pages/admin/PassManagement';
import SystemSettings from './pages/admin/SystemSettings';
import AuditLogs from './pages/admin/AuditLogs';
import Analytics from './pages/admin/Analytics';
import NotificationCenter from './pages/admin/NotificationCenter';
import AdminReports from './pages/admin/Reports';
import { ROLES } from './utils/constants';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        return <Navigate to={getRoleDefaultRoute(user.role)} replace />;
    }

    return children;
};

// Get default route based on user role
const getRoleDefaultRoute = (role) => {
    switch (role) {
        case ROLES.STUDENT:
            return '/student/dashboard';
        case ROLES.CLASS_COORDINATOR:
        case ROLES.HOSTEL_OFFICE:
        case ROLES.CHIEF_WARDEN:
            return '/approvals';
        case ROLES.WATCHMAN:
            return '/scan';
        case ROLES.ADMIN:
        case ROLES.SUPER_ADMIN:
            return '/admin/dashboard';
        default:
            return '/';
    }
};

// Public Route Component
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                }
            />
            <Route
                path="/register-coordinator"
                element={
                    <PublicRoute>
                        <CoordinatorRegister />
                    </PublicRoute>
                }
            />

            {/* Protected Routes with Layout */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                {/* Student Routes */}
                <Route
                    path="student/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                            <StudentDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="passes"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                            <MyPasses />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="passes/new"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                            <NewPass />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                            <StudentProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="notifications"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                            <Notifications />
                        </ProtectedRoute>
                    }
                />

                {/* Approver Routes */}
                <Route
                    path="approvals"
                    element={
                        <ProtectedRoute
                            allowedRoles={[
                                ROLES.HOSTEL_OFFICE,
                                ROLES.CHIEF_WARDEN,
                                ROLES.CLASS_COORDINATOR,
                                ROLES.ADMIN,
                                ROLES.SUPER_ADMIN,
                            ]}
                        >
                            <Approvals />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="approvals/history"
                    element={
                        <ProtectedRoute
                            allowedRoles={[
                                ROLES.HOSTEL_OFFICE,
                                ROLES.CHIEF_WARDEN,
                                ROLES.CLASS_COORDINATOR,
                                ROLES.ADMIN,
                                ROLES.SUPER_ADMIN,
                            ]}
                        >
                            <ApprovalHistory />
                        </ProtectedRoute>
                    }
                />

                {/* Watchman Routes */}
                <Route
                    path="scan"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.WATCHMAN, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <ScanQR />
                        </ProtectedRoute>
                    }
                />

                {/* Reports Routes */}
                <Route
                    path="reports"
                    element={
                        <ProtectedRoute
                            allowedRoles={[
                                ROLES.HOSTEL_OFFICE,
                                ROLES.CHIEF_WARDEN,
                                ROLES.CLASS_COORDINATOR,
                                ROLES.ADMIN,
                                ROLES.SUPER_ADMIN,
                            ]}
                        >
                            <Reports />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Routes */}
                <Route
                    path="admin/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/users"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <UserManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/passes"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <PassManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/settings"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <SystemSettings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/audit-logs"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <AuditLogs />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/analytics"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <Analytics />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/notifications"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <NotificationCenter />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/reports"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                            <AdminReports />
                        </ProtectedRoute>
                    }
                />

                {/* Root redirect based on role */}
                <Route
                    path="/"
                    element={
                        user ? (
                            <Navigate to={getRoleDefaultRoute(user.role)} replace />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                {/* Legacy /dashboard route - redirect to role-specific dashboard */}
                <Route
                    path="dashboard"
                    element={
                        user ? (
                            <Navigate to={getRoleDefaultRoute(user.role)} replace />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Route>

            {/* 404 - redirect to role-specific dashboard */}
            <Route
                path="*"
                element={
                    user ? (
                        <Navigate to={getRoleDefaultRoute(user.role)} replace />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
