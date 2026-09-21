import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { uploadImageToCloudinary } from '../../utils/uploadImage';

const AdminModal = ({
    isOpen,
    onClose,
    modalType,
    editItem,
    positions,
    onSubmit
}) => {
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(editItem?.photoURL || '');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);

    // Reset photo state when modal opens/closes or editItem changes
    React.useEffect(() => {
        setPhotoFile(null);
        setPhotoPreview(editItem?.photoURL || '');
        setUploadError('');
    }, [editItem, isOpen]);

    const getTitle = () => {
        const action = editItem ? 'Edit' : 'Add New';
        switch (modalType) {
            case 'position': return `${action} Position`;
            case 'candidate': return `${action} Candidate`;
            case 'student': return `${action} Student`;
            default: return action;
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select a valid image file (JPG, PNG, WEBP, etc.)');
            return;
        }
        // Validate file size (max 5 MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Image must be smaller than 5 MB');
            return;
        }

        setUploadError('');
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview('');
        setUploadError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // If a new file was picked, upload it to Cloudinary first
        if (modalType === 'candidate' && photoFile) {
            setUploading(true);
            setUploadError('');
            try {
                const url = await uploadImageToCloudinary(photoFile);
                data.photoURL = url;
            } catch (err) {
                setUploadError('Photo upload failed: ' + err.message);
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        } else if (modalType === 'candidate') {
            // Keep existing photoURL (from hidden input / editItem)
            data.photoURL = photoPreview || '';
        }

        onSubmit(data);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Student Form */}
                {modalType === 'student' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Student ID</label>
                            <input
                                name="studentId"
                                type="text"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.studentId || ''}
                                readOnly={!!editItem}
                                placeholder="e.g., S101, 2024001"
                                required
                            />
                            {editItem && <p className="text-xs text-gray-500 mt-1">ID cannot be changed</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                            <input
                                name="name"
                                type="text"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.name || ''}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Class</label>
                            <input
                                name="class"
                                type="text"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.class || ''}
                                placeholder="e.g., BCA-1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Semester</label>
                            <select
                                name="semester"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.semester || ''}
                            >
                                <option value="" className="bg-gray-800">Select Semester</option>
                                <option value="Semester 1" className="bg-gray-800">Semester 1</option>
                                <option value="Semester 3" className="bg-gray-800">Semester 3</option>
                                <option value="Semester 5" className="bg-gray-800">Semester 5</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input
                                name="password"
                                type="text"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.password || ''}
                                placeholder={editItem ? "Leave blank to keep current" : "Default: password123"}
                            />
                        </div>
                    </>
                )}

                {/* Position Form */}
                {modalType === 'position' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Position Name</label>
                            <input
                                name="name"
                                type="text"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.name || ''}
                                placeholder="e.g., President"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                            <textarea
                                name="description"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                rows="3"
                                defaultValue={editItem?.description || ''}
                                placeholder="Role responsibilities..."
                            />
                        </div>
                    </>
                )}

                {/* Candidate Form */}
                {modalType === 'candidate' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Candidate Name</label>
                            <input
                                name="name"
                                type="text"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.name || ''}
                                placeholder="Jane Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Class</label>
                            <input
                                name="class"
                                type="text"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.class || ''}
                                placeholder="e.g., MCA-1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Position</label>
                            <select
                                name="positionId"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.positionId?._id || editItem?.positionId || ''}
                                required
                            >
                                <option value="" className="bg-gray-800">Select Position</option>
                                {positions.map(pos => (
                                    <option key={pos._id} value={pos._id} className="bg-gray-800">{pos.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Bio / Manifesto</label>
                            <textarea
                                name="bio"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                rows="3"
                                defaultValue={editItem?.bio || ''}
                                placeholder="Why should students vote for you?"
                            />
                        </div>

                        {/* ── Photo Upload Section ── */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Candidate Photo{' '}
                                <span className="text-gray-500 font-normal">(Optional)</span>
                            </label>

                            <div className="flex items-start gap-4">
                                {/* Preview / Placeholder Avatar */}
                                <div className="relative flex-shrink-0">
                                    {photoPreview ? (
                                        <div className="relative w-20 h-20">
                                            <img
                                                src={photoPreview}
                                                alt="Preview"
                                                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/60 shadow-lg shadow-indigo-500/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md transition-colors"
                                                title="Remove photo"
                                            >
                                                <X size={12} className="text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-dashed border-indigo-500/40 flex items-center justify-center">
                                            <Camera size={24} className="text-indigo-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Upload Controls */}
                                <div className="flex-1 space-y-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="candidate-photo-upload"
                                    />
                                    <label
                                        htmlFor="candidate-photo-upload"
                                        className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-medium transition-all w-full justify-center select-none ${
                                            uploading
                                                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 cursor-not-allowed pointer-events-none'
                                                : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/30 hover:text-white'
                                        }`}
                                    >
                                        {uploading ? (
                                            <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                                        ) : (
                                            <><Upload size={16} /> {photoPreview ? 'Change Photo' : 'Upload Photo'}</>
                                        )}
                                    </label>
                                    <p className="text-xs text-gray-500">
                                        JPG, PNG, WEBP · Max 5 MB · Stored on Cloudinary CDN
                                    </p>

                                    {/* Hidden input carries the resolved URL into FormData */}
                                    <input
                                        name="photoURL"
                                        type="hidden"
                                        value={photoPreview}
                                        readOnly
                                    />
                                </div>
                            </div>

                            {/* Upload progress bar */}
                            {uploading && (
                                <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse rounded-full w-2/3" />
                                </div>
                            )}

                            {/* Error message */}
                            {uploadError && (
                                <div className="mt-2 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    <X size={12} className="flex-shrink-0" />
                                    {uploadError}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button type="button" onClick={onClose} variant="ghost">Cancel</Button>
                    <Button type="submit" variant="primary" disabled={uploading}>
                        {uploading ? 'Uploading…' : editItem ? 'Update Changes' : 'Create Entry'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AdminModal;
