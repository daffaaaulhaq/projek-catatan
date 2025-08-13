import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- SETUP AWAL ---
dotenv.config(); // Memuat variabel dari file .env
const app = express();
const port = 4000;
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Konfigurasi koneksi ke database MySQL Anda di Laragon
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'projek_catatan_db', // Pastikan nama database ini benar
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Membuat "kolam" koneksi agar lebih efisien
const pool = mysql.createPool(dbConfig);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_jika_env_tidak_ada';

// --- MIDDLEWARE: Verifikasi Token JWT ---
// Middleware ini akan melindungi rute yang membutuhkan login
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) return res.sendStatus(401); // 401 Unauthorized: Tidak ada token

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403); // 403 Forbidden: Token tidak valid atau kedaluwarsa
        req.user = user; // Simpan informasi user ke dalam objek request
        next(); // Lanjutkan ke rute berikutnya
    });
};

// =================================================================
// --- API RUTE AUTENTIKASI (Tidak Dilindungi) ---
// =================================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Semua field harus diisi' });
    }
    try {
        // Enkripsi password sebelum disimpan
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        res.status(201).json({ message: 'Registrasi berhasil' });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email sudah terdaftar' });
        }
        res.status(500).json({ message: 'Server error saat registrasi', error });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const users = rows as any[];
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }
        const user = users[0];
        // Bandingkan password yang diinput dengan yang ada di database
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        // Buat token JWT jika login berhasil
        const accessToken = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email } });

    } catch (error) {
        res.status(500).json({ message: 'Server error saat login', error });
    }
});

// =================================================================
// --- API RUTE HALAMAN (PAGES) - Dilindungi oleh AuthenticateToken ---
// =================================================================

// GET /api/pages (Hanya mendapatkan halaman milik user yang login)
app.get('/api/pages', authenticateToken, async (req: any, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.execute('SELECT id, sidebar_name FROM pages WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil halaman', error });
    }
});

// GET /api/pages/:id (Hanya bisa mengambil detail halaman milik user yang login)
app.get('/api/pages/:id', authenticateToken, async (req: any, res) => {
    const userId = req.user.id;
    const pageId = parseInt(req.params.id, 10);
    try {
        const [rows] = await pool.execute('SELECT * FROM pages WHERE id = ? AND user_id = ?', [pageId, userId]);
        const pages = rows as any[];
        if (pages.length > 0) {
            res.json(pages[0]);
        } else {
            res.status(404).json({ message: 'Halaman tidak ditemukan atau Anda tidak punya akses' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil detail halaman', error });
    }
});

// POST /api/pages
app.post('/api/pages', authenticateToken, async (req: any, res) => {
    const userId = req.user.id;
    const { name } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO pages (user_id, sidebar_name, title, content) VALUES (?, ?, ?, ?)',
            [userId, name, name, '<p>Mulai tulis di sini...</p>']
        );
        const insertId = (result as any).insertId;
        res.status(201).json({ id: insertId, sidebar_name: name });
    } catch (error) {
        res.status(500).json({ message: 'Gagal membuat halaman', error });
    }
});

// PUT /api/pages/:id
app.put('/api/pages/:id', authenticateToken, async (req: any, res) => {
    const userId = req.user.id;
    const pageId = parseInt(req.params.id, 10);
    const { title, content } = req.body;
    try {
        const [result] = await pool.execute(
            'UPDATE pages SET title = ?, content = ? WHERE id = ? AND user_id = ?',
            [title, content, pageId, userId]
        );
        const updateResult = result as any;
        if (updateResult.affectedRows === 0) {
             return res.status(404).json({ message: 'Halaman tidak ditemukan atau Anda tidak punya akses' });
        }
        res.status(200).json({ message: 'Halaman berhasil disimpan' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menyimpan halaman', error });
    }
});

// DELETE /api/pages/:id
app.delete('/api/pages/:id', authenticateToken, async (req: any, res) => {
    const userId = req.user.id;
    const pageId = parseInt(req.params.id, 10);
    try {
        const [result] = await pool.execute('DELETE FROM pages WHERE id = ? AND user_id = ?', [pageId, userId]);
        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
             return res.status(404).json({ message: 'Halaman tidak ditemukan atau Anda tidak punya akses' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus halaman', error });
    }
});


// --- Menjalankan Server ---
app.listen(port, () => {
    console.log(`Backend server (v-FINAL) berjalan di http://localhost:${port}`);
});
