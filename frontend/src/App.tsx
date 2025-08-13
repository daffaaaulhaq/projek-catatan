import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppLayout from './pages/AppLayout';
import { getAuthToken } from './services/authService';

// Komponen untuk melindungi rute yang hanya bisa diakses setelah login
function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = getAuthToken();
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route 
        path="/*" 
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}

export default App;
