import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import { useNavigate } from 'react-router-dom';
import { removeAuthToken } from '../services/authService';
import 'react-quill/dist/quill.snow.css';
import './AppLayout.css';

// --- Definisi Tipe Data ---
interface User { id: number; name: string; email: string; }
interface PageSidebar { id: number; sidebar_name: string; }
interface PageDetail extends PageSidebar { title: string; content: string; }

// =================================================================
// --- KOMPONEN UTAMA: AppLayout ---
// =================================================================
function AppLayout() {
    const [user, setUser] = useState<User | null>(null);
    const [pages, setPages] = useState<PageSidebar[]>([]);
    const [currentPage, setCurrentPage] = useState<PageDetail | null>(null);
    const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const quillRef = useRef<ReactQuill>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || 'null');
        setUser(userData);

        axios.get('http://localhost:4000/api/pages')
            .then(res => setPages(res.data))
            .catch(() => setError("Gagal memuat daftar halaman."));
    }, []);

    useEffect(() => {
        if (selectedPageId !== null) {
            setIsLoading(true);
            setError(null);
            axios.get(`http://localhost:4000/api/pages/${selectedPageId}`)
                .then(res => setCurrentPage(res.data))
                .catch(() => setError("Gagal memuat halaman ini."))
                .finally(() => setIsLoading(false));
        } else {
            setCurrentPage(null);
        }
    }, [selectedPageId]);

    useEffect(() => {
        if (!currentPage) return;
        const handler = setTimeout(() => {
            axios.put(`http://localhost:4000/api/pages/${currentPage.id}`, {
                title: currentPage.title,
                content: currentPage.content
            }).then(() => console.log(`Halaman ${currentPage.id} disimpan!`));
        }, 1500);
        return () => clearTimeout(handler);
    }, [currentPage]);

    const handleLogout = () => {
        removeAuthToken();
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleAddPage = (name: string) => {
        axios.post('http://localhost:4000/api/pages', { name })
            .then(res => {
                setPages([...pages, res.data]);
                setSelectedPageId(res.data.id);
            });
    };

    const handleDeletePage = (pageId: number) => {
        axios.delete(`http://localhost:4000/api/pages/${pageId}`).then(() => {
            setPages(pages.filter(p => p.id !== pageId));
            if (selectedPageId === pageId) setSelectedPageId(null);
        });
    };
    
    const handleContentChange = (content: string) => {
        if (currentPage) setCurrentPage({ ...currentPage, content });
    };
  
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentPage) setCurrentPage({ ...currentPage, title: e.target.value });
    };

    return (
        <div className="app-container">
            <Sidebar
                user={user}
                pages={pages}
                selectedPageId={selectedPageId}
                onSelectPage={setSelectedPageId}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onLogout={handleLogout}
            />
            <div className="main-content">
                {isLoading ? (
                    <div className="placeholder"><h2>Memuat...</h2></div>
                ) : error ? (
                    <div className="placeholder error"><h2>Error: {error}</h2></div>
                ) : currentPage ? (
                    <Editor
                        page={currentPage}
                        onContentChange={handleContentChange}
                        onTitleChange={handleTitleChange}
                        quillRef={quillRef}
                    />
                ) : (
                    <div className="placeholder">
                        <h2>Selamat Datang, {user?.name}!</h2>
                        <p>Pilih halaman di sebelah kiri atau buat yang baru untuk memulai.</p>
                    </div>
                )}
                {currentPage && <FloatingMenu quillRef={quillRef} />}
            </div>
        </div>
    );
}

// --- Komponen Anak ---

function Sidebar({ user, pages, selectedPageId, onSelectPage, onAddPage, onDeletePage, onLogout }: any) {
    const [newPageName, setNewPageName] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPageName.trim()) return;
        onAddPage(newPageName);
        setNewPageName('');
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="user-profile">
                    <span className="user-icon">📝</span>
                    <span className="user-name">{user?.name || 'User'}</span>
                </div>
            </div>
            <div className="sidebar-fixed">
                <input type="text" className="search-bar" placeholder="Cari..." />
                <div className="home-button">Home</div>
            </div>
            <div className="sidebar-scrollable">
                <form onSubmit={handleSubmit} className="add-page-form">
                    <button type="submit">+</button>
                    <input type="text" value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Halaman Baru"/>
                </form>
                <ul className="page-list">
                    {pages.map((page: PageSidebar) => (
                        <li key={page.id} className={selectedPageId === page.id ? 'active' : ''} onClick={() => onSelectPage(page.id)}>
                            {page.sidebar_name}
                            <button onClick={e => { e.stopPropagation(); onDeletePage(page.id); }} className="delete-page-btn">×</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="sidebar-footer">
                <div className="menu-item">Setting</div>
                <div className="menu-item" onClick={onLogout}>Logout</div>
            </div>
        </div>
    );
}

function Editor({ page, onContentChange, onTitleChange, quillRef }: any) {
    return (
        <div className="editor-area">
            <input type="text" className="document-title" value={page.title} onChange={onTitleChange}/>
            <ReactQuill ref={quillRef} theme="snow" value={page.content} onChange={onContentChange} modules={{ toolbar: false }} className="quill-editor"/>
        </div>
    );
}

function FloatingMenu({ quillRef }: { quillRef: React.RefObject<ReactQuill> }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const format = (type: string, value?: string | boolean) => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
            editor.format(type, value === undefined ? true : value);
        }
    };

    return (
        <>
            <div className={`floating-menu ${isMenuOpen ? 'open' : ''}`}>
                <div className="menu-content">
                    <button onClick={() => format('bold')}><b>B</b></button>
                    <button onClick={() => format('italic')}><i>I</i></button>
                    <button onClick={() => format('list', 'bullet')}>●</button>
                    <button onClick={() => format('list', 'ordered')}>1.</button>
                    <button onClick={() => format('list', 'check')}>✓</button>
                </div>
            </div>
            <button className="floating-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>⋮</button>
        </>
    );
}

export default AppLayout;
