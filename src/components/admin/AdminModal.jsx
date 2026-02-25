import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const AdminModal = ({
    isOpen,
    onClose,
    modalType,
    editItem,
    positions,
    onSubmit
}) => {
    const getTitle = () => {
        const action = editItem ? 'Edit' : 'Add New';
        switch (modalType) {
            case 'position': return `${action} Position`;
            case 'candidate': return `${action} Candidate`;
            case 'student': return `${action} Student`;
            default: return action;
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
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
                                defaultValue={editItem?.positionId || ''}
                                required
                            >
                                <option value="" className="bg-gray-800">Select Position</option>
                                {positions.map(pos => (
                                    <option key={pos.id} value={pos.id} className="bg-gray-800">{pos.name}</option>
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
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Photo URL (Optional)</label>
                            <input
                                name="photoURL"
                                type="url"
                                className="glass-input w-full px-4 py-2 rounded-lg"
                                defaultValue={editItem?.photoURL || ''}
                                placeholder="https://example.com/photo.jpg"
                            />
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button type="button" onClick={onClose} variant="ghost">Cancel</Button>
                    <Button type="submit" variant="primary">
                        {editItem ? 'Update Changes' : 'Create Entry'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AdminModal;
