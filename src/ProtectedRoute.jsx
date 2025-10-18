// Option 1: Allow authenticated users to access login/register (redirect to dashboard)
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoutes = () => {
    const token = localStorage.getItem("isAuthenticated");
    const location = useLocation();

    // If no token, redirect to login
    if (!token) {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("userdata");
        return <Navigate to="/login" replace />;
    }

    // If user is authenticated, render the protected content
    return <Outlet />;
};

export default ProtectedRoutes;

// Option 2: Create a separate component for handling auth redirects


// Option 3: Updated App.jsx with proper route structure
