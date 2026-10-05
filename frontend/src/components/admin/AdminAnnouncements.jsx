import React, { useState, useEffect } from 'react';
import {
    Megaphone, Plus, Pencil, Trash2, Eye, EyeOff, CheckCircle,
    AlertCircle, Clock, Tag, X, Save, AlertTriangle
} from 'lucide-react';
import api from '../../utils/api';
import Button from '../ui/Button';
import Card from '../ui/Card';

const CATEGORIES = ['General', 'Important', 'Election Update', 'Result Update'];
const BADGES = ['', 'IMPORTANT', 'NEW'];

const CATEGORY_STYLES = {
    'General': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Important': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Election Update': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'Result Update': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};
const BADGE_STYLES = {
    'IMPORTANT': 'bg-red-500 text-white',
    'NEW': 'bg-emerald-500 text-white',
};

const toLocalInput = (isoStr) => {
    if (!isoStr) return '';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '';
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch { return ''; }
};

const EMPTY_FORM = {
    title: '',
    description: '',
    category: 'General',
    badge: '',
    isActive: true,
    startDate: '',
    expiryDate: '',
};

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [previewItem, setPreviewItem] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await api.get('/announcements/all');
            setAnnouncements(res.data);
        } catch {
            setError('Failed to load announcements.');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditItem(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({
            title: item.title,
            description: item.description,
            category: item.category,
            badge: item.badge || '',
            isActive: item.isActive,
            startDate: toLocalInput(item.startDate),
            expiryDate: toLocalInput(item.expiryDate),
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.description.trim()) {
            setError('Title and description are required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
                expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
            };
            if (editItem) {
                await api.put(`/announcements/${editItem._id}`, payload);
            } else {
                await api.post('/announcements', payload);
            }
            setShowForm(false);
            loadAnnouncements();
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (item) => {
        try {
            await api.put(`/announcements/${item._id}`, { ...item, isActive: !item.isActive });
            loadAnnouncements();
        } catch {
            setError('Failed to update status.');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/announcements/${id}`);
            setDeleteConfirm(null);
            loadAnnouncements();
        } catch {
            setError('Failed to delete.');
        }
    };

    const isExpired = (item) => item.expiryDate && new Date(item.expiryDate) < new Date();

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Megaphone className="text-indigo-400" size={24} />
                        Announcements
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Manage public announcements shown on the landing page</p>
                </div>
                <Button onClick={openCreate} icon={Plus} variant="primary">New Announcement</Button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300">
                    <AlertCircle size={18} />
                    {error}
                    <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
                </div>
            )}

            {/* Announcement List */}
            {loading ? (
                <div className="text-center py-16 text-gray-400">Loading...</div>
            ) : announcements.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-2xl">
                    <Megaphone className="w-14 h-14 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Announcements Yet</h3>
                    <p className="text-gray-400 mb-6">Create your first announcement to show on the landing page.</p>
                    <Button onClick={openCreate} icon={Plus} variant="primary">Create Announcement</Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map(item => (
                        <div key={item._id} className={`glass-panel rounded-xl p-4 border transition-all ${
                            !item.isActive || isExpired(item) ? 'opacity-50 border-white/5' : 'border-white/10'
                        }`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        {item.badge && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${BADGE_STYLES[item.badge]}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_STYLES[item.category]}`}>
                                            {item.category}
                                        </span>
                                        {!item.isActive && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">INACTIVE</span>
                                        )}
                                        {isExpired(item) && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">EXPIRED</span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-white truncate">{item.title}</h4>
                                    <p className="text-sm text-gray-400 line-clamp-1 mt-0.5">{item.description}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Clock size={11} /> Created {new Date(item.createdAt).toLocaleDateString()}</span>
                                        {item.expiryDate && <span>· Expires {new Date(item.expiryDate).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => setPreviewItem(item)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                        title="Preview"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(item)}
                                        className={`p-2 rounded-lg transition-colors ${item.isActive
                                            ? 'text-green-400 hover:bg-green-500/10'
                                            : 'text-gray-500 hover:bg-white/10'}`}
                                        title={item.isActive ? 'Unpublish' : 'Publish'}
                                    >
                                        {item.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button
                                        onClick={() => openEdit(item)}
                                        className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(item)}
                                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white">
                                {editItem ? 'Edit Announcement' : 'New Announcement'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
                                    <AlertCircle size={16} />{error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Student Council Elections 2025"
                                    className="glass-input w-full px-4 py-3 rounded-xl"
                                    maxLength={120}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Write the announcement content here..."
                                    rows={4}
                                    className="glass-input w-full px-4 py-3 rounded-xl resize-none"
                                    maxLength={600}
                                />
                                <p className="text-xs text-gray-500 mt-1 text-right">{form.description.length}/600</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        <Tag size={14} className="inline mr-1" />Category
                                    </label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                        className="glass-input w-full px-4 py-3 rounded-xl"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Badge (optional)</label>
                                    <select
                                        value={form.badge}
                                        onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
                                        className="glass-input w-full px-4 py-3 rounded-xl"
                                    >
                                        <option value="">None</option>
                                        {BADGES.filter(b => b).map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Date (optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={form.startDate}
                                        onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                        className="glass-input w-full px-4 py-3 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date (optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={form.expiryDate}
                                        onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                                        className="glass-input w-full px-4 py-3 rounded-xl"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                                    className="h-5 w-5 rounded border-gray-600 text-indigo-600 bg-gray-700"
                                />
                                <div>
                                    <span className="font-medium text-white">Publish immediately</span>
                                    <span className="block text-xs text-gray-400 mt-0.5">If unchecked, announcement is saved as draft and hidden from public</span>
                                </div>
                            </label>

                            {/* Preview */}
                            {form.title && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Preview</p>
                                    <AnnouncementCard item={{ ...form, createdAt: new Date().toISOString() }} preview />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
                            <Button onClick={() => setShowForm(false)} variant="ghost">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} icon={saving ? null : Save} variant="primary">
                                {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Publish Announcement'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-red-400 w-8 h-8 flex-shrink-0" />
                            <h3 className="text-xl font-bold text-white">Delete Announcement?</h3>
                        </div>
                        <p className="text-gray-400 mb-2">This will permanently delete:</p>
                        <p className="font-bold text-white mb-6">"{deleteConfirm.title}"</p>
                        <div className="flex gap-3">
                            <Button onClick={() => setDeleteConfirm(null)} variant="ghost" className="flex-1 justify-center">Cancel</Button>
                            <Button onClick={() => handleDelete(deleteConfirm._id)} variant="danger" icon={Trash2} className="flex-1 justify-center">
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Public Preview</h3>
                            <button onClick={() => setPreviewItem(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <AnnouncementCard item={previewItem} preview />
                    </div>
                </div>
            )}
        </div>
    );
};

// Reusable card used both in landing page and admin preview
export const AnnouncementCard = ({ item, preview = false }) => {
    const now = new Date();
    const isNew = (new Date(item.createdAt) > new Date(now - 48 * 3600 * 1000));

    return (
        <div className={`relative glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-500/30 transition-all duration-300 group ${preview ? '' : 'hover:-translate-y-1'}`}>
            <div className={`h-1 w-full ${
                item.category === 'Important' ? 'bg-red-500' :
                item.category === 'Election Update' ? 'bg-indigo-500' :
                item.category === 'Result Update' ? 'bg-emerald-500' :
                'bg-blue-500'
            }`} />
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {item.badge && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE_STYLES[item.badge] || ''}`}>
                                {item.badge}
                            </span>
                        )}
                        {!item.badge && isNew && !preview && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">NEW</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[item.category]}`}>
                            {item.category}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>
                <h4 className="font-bold text-white text-base mb-2 group-hover:text-indigo-300 transition-colors">{item.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{item.description}</p>
                {item.expiryDate && (
                    <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
                        <Clock size={11} /> Valid until {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                )}
            </div>
        </div>
    );
};

export default AdminAnnouncements;
