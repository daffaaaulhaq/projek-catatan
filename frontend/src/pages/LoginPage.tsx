import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { setAuthToken } from '../services/authService';
import './AuthPage.css';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post('http://localhost:4000/api/auth/login', { email, password });
            setAuthToken(response.data.accessToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
            // Reload halaman untuk memastikan semua state ter-reset dengan bersih
            window.location.reload();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login gagal. Silakan coba lagi.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Login</h2>
                <p>Selamat datang kembali!</p>
                <form onSubmit={handleSubmit}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit">Login</button>
                </form>
                <p className="redirect-link">
                    Belum punya akun? <Link to="/register">Daftar di sini</Link>
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
