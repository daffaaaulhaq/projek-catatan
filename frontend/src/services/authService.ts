import axios from 'axios';

const TOKEN_KEY = 'authToken';

// Fungsi untuk mendapatkan token dari localStorage
export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

// Fungsi untuk menyimpan token ke localStorage dan mengatur header default axios
export function setAuthToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Fungsi untuk menghapus token dari localStorage dan header axios
export function removeAuthToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
}

// Fungsi ini dijalankan sekali saat aplikasi dimuat
// untuk memeriksa apakah sudah ada token yang tersimpan
export function initializeAuthHeader(): void {
    const token = getAuthToken();
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
}

// Panggil fungsi inisialisasi
initializeAuthHeader();
