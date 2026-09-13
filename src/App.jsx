import React from 'react';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/Elements/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="app-container">
        <AppRoutes />
      </div>
    </ErrorBoundary>
  );
}

export default App;
