import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import App from './App.jsx';
import { AuthProvider } from './state.jsx';
import 'react-toastify/dist/ReactToastify.css';
import './style.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><App/><ToastContainer position="bottom-right"/></AuthProvider></BrowserRouter></React.StrictMode>);
