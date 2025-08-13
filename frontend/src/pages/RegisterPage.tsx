import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './AuthPage.css';

function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await axios.post('http://localhost:4000/api/auth/register', { name, email, password });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registrasi gagal. Silakan coba lagi.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Buat Akun Baru</h2>
                <form onSubmit={handleSubmit}>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Lengkap" required />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit">Daftar</button>
                </form>
                <p className="redirect-link">
                    Sudah punya akun? <Link to="/login">Login di sini</Link>
                </p>
            </div>
        </div>
    );
}

export default RegisterPage;
