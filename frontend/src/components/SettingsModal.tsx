import React from 'react';
import { X } from 'lucide-react';
import './SettingsModal.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: string;
    onThemeChange: (theme: string) => void;
}

function SettingsModal({ isOpen, onClose, theme, onThemeChange }: SettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h3>Pengaturan</h3>
                    <button onClick={onClose} className="close-btn"><X size={20} /></button>
                </div>
                <div className="settings-body">
                    <div className="settings-section">
                        <h4>Profil</h4>
                        <p>Informasi akun Anda.</p>
                        {/* Di sini bisa ditambahkan form untuk ubah nama/email */}
                    </div>
                    <div className="settings-section">
                        <h4>Tampilan</h4>
                        <div className="theme-switcher">
                            <span>Mode Aplikasi</span>
                            <div className="theme-options">
                                <button 
                                    className={theme === 'light' ? 'active' : ''}
                                    onClick={() => onThemeChange('light')}
                                >
                                    Terang
                                </button>
                                <button 
                                    className={theme === 'dark' ? 'active' : ''}
                                    onClick={() => onThemeChange('dark')}
                                >
                                    Gelap
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="settings-section">
                        <h4>Akun</h4>
                        <button className="btn-delete-account">Hapus Akun</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
