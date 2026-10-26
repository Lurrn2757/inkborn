import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.js';
import { ErrorBoundary } from './app/ErrorBoundary.js';
import './styles/base.css';
import './creative/theme.css';
import './creative/ritual.css';
import './creative/siege.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root is missing.');
ReactDOM.createRoot(root).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);

import './creative/boss.css';
