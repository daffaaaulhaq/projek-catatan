import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import { useNavigate } from 'react-router-dom';
import { removeAuthToken } from '../services/authService';
import 'react-quill/dist/quill.snow.css';
import './AppLayout.css';
import ConfirmationModal from '../components/ConfirmationModal';
import SettingsModal from '../components/SettingsModal';
import { Home, Settings, Trash2, LogOut } from 'lucide-react';

// --- Definisi Tipe Data ---
interface User { id: number; name: string; email: string; }
interface PageSidebar { id: number; sidebar_name: string; }
interface PageDetail extends PageSidebar { title: string; content: string; }
interface TrashedPage { id: number; sidebar_name: string; trashed_at: string; }

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

    const [isTrashView, setIsTrashView] = useState(false);
    const [trashedPages, setTrashedPages] = useState<TrashedPage[]>([]);

    // State untuk modal konfirmasi
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', message: '' });
    const [onConfirmAction, setOnConfirmAction] = useState<() => void>(() => {});

    // --- State BARU untuk Settings ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Ambil user & daftar halaman
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || 'null');
        setUser(userData);

        axios.get('http://localhost:4000/api/pages')
            .then(res => setPages(res.data))
            .catch(() => setError("Gagal memuat daftar halaman."));
    }, []);

    // Ambil detail halaman (hanya jika bukan trash view)
    useEffect(() => {
        if (selectedPageId !== null && !isTrashView) {
            setIsLoading(true);
            setError(null);
            axios.get(`http://localhost:4000/api/pages/${selectedPageId}`)
                .then(res => setCurrentPage(res.data))
                .catch(() => setError("Gagal memuat halaman ini."))
                .finally(() => setIsLoading(false));
        } else {
            setCurrentPage(null);
        }
    }, [selectedPageId, isTrashView]);

    // Ambil halaman di trash view
    useEffect(() => {
        if (isTrashView) {
            setIsLoading(true);
            axios.get('http://localhost:4000/api/trash')
                .then(res => setTrashedPages(res.data))
                .catch(() => setError("Gagal memuat sampah."))
                .finally(() => setIsLoading(false));
        }
    }, [isTrashView]);

    // Auto save konten
    useEffect(() => {
        if (!currentPage) return;
        const handler = setTimeout(() => {
            axios.put(`http://localhost:4000/api/pages/${currentPage.id}`, {
                title: currentPage.title,
                content: currentPage.content,
                sidebar_name: currentPage.sidebar_name
            }).then(() => console.log(`Halaman ${currentPage.id} disimpan!`));
        }, 1500);
        return () => clearTimeout(handler);
    }, [currentPage]);

    // Efek BARU untuk mengubah tema
    useEffect(() => {
        document.body.className = '';
        document.body.classList.add(`${theme}-theme`);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // --- Fungsi Helper Modal ---
    const openConfirmationModal = (title: string, message: string, onConfirm: () => void) => {
        setModalContent({ title, message });
        setOnConfirmAction(() => onConfirm);
        setIsModalOpen(true);
    };

    // --- Handler ---
    const handleLogout = () => {
        openConfirmationModal(
            'Konfirmasi Logout',
            'Apakah Anda yakin ingin logout?',
            () => {
                removeAuthToken();
                localStorage.removeItem('user');
                navigate('/login');
            }
        );
    };

    const handleAddPage = (name: string) => {
        axios.post('http://localhost:4000/api/pages', { name })
            .then(res => {
                setPages([...pages, res.data]);
                setSelectedPageId(res.data.id);
            });
    };

    const handleDeletePage = (pageId: number) => {
        openConfirmationModal(
            'Pindahkan ke Sampah?',
            'Halaman ini akan dipindahkan ke sampah dan akan dihapus permanen setelah 30 hari.',
            () => {
                axios.delete(`http://localhost:4000/api/pages/${pageId}`).then(() => {
                    setPages(pages.filter(p => p.id !== pageId));
                    if (selectedPageId === pageId) setSelectedPageId(null);
                    setIsModalOpen(false);
                });
            }
        );
    };

    const handleRestorePage = (pageId: number) => {
        axios.post(`http://localhost:4000/api/trash/${pageId}/restore`).then(() => {
            setTrashedPages(trashedPages.filter(p => p.id !== pageId));
            axios.get('http://localhost:4000/api/pages').then(res => setPages(res.data));
        });
    };

    const handlePermanentDelete = (pageId: number) => {
        openConfirmationModal(
            'Hapus Permanen?',
            'Tindakan ini tidak dapat diurungkan. Halaman akan dihapus selamanya.',
            () => {
                axios.delete(`http://localhost:4000/api/trash/${pageId}/permanent`).then(() => {
                    setTrashedPages(trashedPages.filter(p => p.id !== pageId));
                    setIsModalOpen(false);
                });
            }
        );
    };

    const handleContentChange = (content: string) => {
        if (currentPage) setCurrentPage({ ...currentPage, content });
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        if (currentPage) {
            const updatedPage = { ...currentPage, title: newTitle, sidebar_name: newTitle };
            setCurrentPage(updatedPage);
            setPages(pages.map(p =>
                p.id === currentPage.id ? { ...p, sidebar_name: newTitle } : p
            ));
        }
    };

    return (
        <div className="app-container">
            <ConfirmationModal
                isOpen={isModalOpen}
                title={modalContent.title}
                message={modalContent.message}
                onConfirm={onConfirmAction}
                onCancel={() => setIsModalOpen(false)}
            />

            {/* Modal Settings */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                theme={theme}
                onThemeChange={setTheme}
            />

            <Sidebar
                user={user}
                pages={pages}
                selectedPageId={selectedPageId}
                isTrashView={isTrashView}
                onSelectPage={(id) => { setIsTrashView(false); setSelectedPageId(id); }}
                onSelectTrash={() => { setIsTrashView(true); setSelectedPageId(null); }}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onLogout={handleLogout}
            />
            <div className="main-content">
                {isTrashView ? (
                    <TrashView 
                        pages={trashedPages} 
                        onRestore={handleRestorePage} 
                        onDelete={handlePermanentDelete} 
                    />
                ) : isLoading ? (
                    <div className="placeholder"><h2>Memuat...</h2></div>
                ) : error ? (
                    <div className="placeholder error"><h2>Error: {error}</h2></div>
                ) : currentPage ? (
                    <div className="document-wrapper">
                        <Editor
                            page={currentPage}
                            onContentChange={handleContentChange}
                            onTitleChange={handleTitleChange}
                            quillRef={quillRef}
                        />
                    </div>
                ) : (
                    <div className="placeholder">
                        <h2>Selamat Datang, {user?.name}!</h2>
                        <p>Pilih halaman di sebelah kiri atau buat yang baru untuk memulai.</p>
                    </div>
                )}
                {currentPage && !isTrashView && <FloatingMenu quillRef={quillRef} />}
            </div>
        </div>
    );
}

// --- Komponen Sidebar ---
function Sidebar({ user, pages, selectedPageId, isTrashView, onSelectPage, onSelectTrash, onOpenSettings, onAddPage, onDeletePage, onLogout }: any) {
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
                <div className="home-button"><Home size={18}/> <span>Home</span></div>
            </div>
            <div className="sidebar-scrollable">
                <form onSubmit={handleSubmit} className="add-page-form">
                    <button type="submit">+</button>
                    <input type="text" value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Halaman Baru"/>
                </form>
                <ul className="page-list">
                    {pages.map((page: PageSidebar) => (
                        <li key={page.id} className={!isTrashView && selectedPageId === page.id ? 'active' : ''} onClick={() => onSelectPage(page.id)}>
                            {page.sidebar_name}
                            <button onClick={e => { e.stopPropagation(); onDeletePage(page.id); }} className="delete-page-btn">×</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="sidebar-footer">
                <div className="menu-item" onClick={onOpenSettings}>
                    <Settings size={18} /> <span>Setting</span>
                </div>
                <div className={`menu-item ${isTrashView ? 'active' : ''}`} onClick={onSelectTrash}>
                    <Trash2 size={18} /> <span>Trash</span>
                </div>
                <div className="menu-item" onClick={onLogout}><LogOut size={18} /> <span>Logout</span></div>
            </div>
        </div>
    );
}

// --- Komponen Trash View ---
function TrashView({ pages, onRestore, onDelete }: any) {
    return (
        <div className="trash-view">
            <h2>Sampah</h2>
            <p>Halaman di sini akan dihapus permanen setelah 30 hari.</p>
            <ul className="trash-list">
                {pages.length === 0 ? (
                    <li className="empty-trash">Tempat sampah kosong.</li>
                ) : (
                    pages.map((page: TrashedPage) => (
                        <li key={page.id}>
                            <span className="trash-item-name">{page.sidebar_name}</span>
                            <div className="trash-item-actions">
                                <button onClick={() => onRestore(page.id)} className="btn-restore">Kembalikan</button>
                                <button onClick={() => onDelete(page.id)} className="btn-delete-perm">Hapus</button>
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}

// --- Komponen Editor ---
function Editor({ page, onContentChange, onTitleChange, quillRef }: any) {
    return (
        <>
            <input type="text" className="document-title" value={page.title} onChange={onTitleChange}/>
            <div className="editor-area">
                <ReactQuill ref={quillRef} theme="snow" value={page.content} onChange={onContentChange} modules={{ toolbar: false }} className="quill-editor"/>
            </div>
        </>
    );
}

// --- Komponen FloatingMenu ---
function FloatingMenu({ quillRef }: { quillRef: React.RefObject<ReactQuill> }) {
    const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);
    const PRESET_COLORS = [
        '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
        '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
        '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
    ];

    const toggleFormat = (type: string) => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
            editor.focus();
            const range = editor.getSelection();
            const format = range ? editor.getFormat(range) : editor.getFormat();
            editor.format(type, !format[type]);
        }
    };

    const applyHighlight = (color: string) => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
            editor.focus();
            const value = color === 'transparent' ? false : color;
            editor.format('background', value);
        }
        setIsColorPaletteOpen(false);
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
            editor.focus();
            editor.format('background', e.target.value);
        }
    };

    const toggleListFormat = (type: 'bullet' | 'ordered') => {
        const editor = quillRef.current?.getEditor();
        if (editor) {
            editor.focus();
            const range = editor.getSelection();
            if (range) {
                const currentFormats = editor.getFormat(range);
                const value = currentFormats.list === type ? false : type;
                editor.formatLine(range.index, range.length, 'list', value);
            }
        }
    };

    return (
        <div className="floating-menu">
            <div className="menu-content">
                <div className="tooltip-container">
                    <button onClick={() => toggleFormat('bold')}><b>B</b></button>
                    <span className="tooltip-text">Bold</span>
                </div>
                <div className="tooltip-container">
                    <button onClick={() => toggleFormat('italic')}><i>I</i></button>
                    <span className="tooltip-text">Italic</span>
                </div>
                <div className="tooltip-container">
                    <button onClick={() => setIsColorPaletteOpen(!isColorPaletteOpen)}>🖍️</button>
                    <span className="tooltip-text">Highlight</span>
                    {isColorPaletteOpen && (
                        <div className="color-palette-popup">
                            <div className="color-grid">
                                <button className="color-swatch no-color" onClick={() => applyHighlight('transparent')}/>
                                {PRESET_COLORS.map(color => (
                                    <button 
                                        key={color} 
                                        className="color-swatch"
                                        style={{ backgroundColor: color }}
                                        onClick={() => applyHighlight(color)}
                                    />
                                ))}
                            </div>
                            <div className="custom-color-section">
                                <div className="custom-color-label">KUSTOM</div>
                                <label className="custom-color-picker">
                                    +
                                    <input type="color" onInput={handleCustomColorChange} />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
                <div className="tooltip-container">
                    <button onClick={() => toggleListFormat('bullet')}>●</button>
                    <span className="tooltip-text">Bullet List</span>
                </div>
                <div className="tooltip-container">
                    <button onClick={() => toggleListFormat('ordered')}>1.</button>
                    <span className="tooltip-text">Numbered List</span>
                </div>
            </div>
        </div>
    );
}

export default AppLayout;
