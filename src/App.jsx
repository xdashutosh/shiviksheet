// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';       // ← add these
import { motion, useScroll } from 'framer-motion';
import { Helmet, HelmetProvider } from 'react-helmet-async';

import { ThemeProvider } from '@/components/theme-provider';
import SpreadSheet from './components/pages/SpreadSheet';



function App() {
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    document.documentElement.classList.add('has-scroll-smooth');
    return () => {
      document.documentElement.classList.remove('has-scroll-smooth');
    };
  }, []);

  const defaultTitle = "Shivik-Sheet";
  const defaultDescription = "";
  const siteUrl = "https://shiviksheet.in/";

  return (
    <HelmetProvider>
      <BrowserRouter> {/* ← wrap with your Router */}
        <Helmet htmlAttributes={{ lang: 'en-IN' }}>
          <title>{defaultTitle}</title>
          <meta name="description" content={defaultDescription} />
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="canonical" href={siteUrl} />
          {/* …other meta tags… */}
        </Helmet>

        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          {/* scroll progress bar */}
          <motion.div
            className="scroll-progress-bar"
            style={{ scaleX: scrollYProgress }}
          />

          <main>
              <Routes>
            <Route path="/" element={<SpreadSheet/>} />    
        </Routes>
          </main>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

const AuthRedirect = ({ children }) => {
    const token = localStorage.getItem("isAuthenticated");
    const userdata = JSON.parse(localStorage.getItem("userdata") || "{}");
    
    // If user is already logged in, redirect to appropriate dashboard
    if (token) {
        // Assuming you have user role information
        if (userdata.role == 1) {
            return <Navigate to="/dashboard-admin" replace />;
        } else {
            return <Navigate to="/dashboard-user" replace />;
        }
    }
    
    return children;
};

export default App;
