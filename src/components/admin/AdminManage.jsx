import React, { useState } from 'react';
import { Plus, Edit, Trash2, Settings, Download, Upload, Search, Filter, RefreshCw, Archive } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const AdminManage = ({
    positions,
    candidates,
    students,
    setModalType,
    setEditItem,
    setShowModal,
    handleDeletePosition,
    handleDeleteCandidate,
    handleDeleteStudent,
    handleDeleteStudentVotes,
    handleDeleteAllStudents,
    handleResetAllPasswords,
    exportCredentials,
    exportStudentsBySemester,
    handleUploadStudents,
    loadData
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('All');

    // Filter students
    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.class.toLowerCase().includes(searchTerm.toLowerCase());

        // Simple mock filter for now, can be expanded
        return matchesSearch;
    });

    return (
        <div className="space-y-10 animate-fade-in">

            {/* Positions Section */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Archive className="text-indigo-400" /> Positions
                    </h2>
                    <Button
                        onClick={() => { setModalType('position'); setEditItem(null); setShowModal(true); }}
                        icon={Plus}
                    >
                        Add Position
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {positions.map(position => (
                        <Card key={position.id} className="relative group" hover>
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setModalType('position'); setEditItem(position); setShowModal(true); }}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-blue-300"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeletePosition(position.id)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-red-500/20 text-red-300"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{position.name}</h3>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{position.description || 'No description provided.'}</p>
                            <div className="flex items-center gap-2 text-sm text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full w-fit">
                                <span>{candidates.filter(c => c.positionId === position.id).length} Annual Candidates</span>
                            </div>
                        </Card>
                    ))}
                    {positions.length === 0 && (
                        <div className="col-span-full p-8 rounded-2xl border-2 border-dashed border-white/10 text-center text-gray-500">
                            No positions found. Create one to start setup.
                        </div>
                    )}
                </div>
            </section>

            {/* Candidates Section */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-pink-400" /> Candidates
                    </h2>
                    <Button
                        onClick={() => { setModalType('candidate'); setEditItem(null); setShowModal(true); }}
                        icon={Plus}
                    >
                        Add Candidate
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {candidates.map(candidate => {
                        const position = positions.find(p => p.id === candidate.positionId);
                        return (
                            <Card key={candidate.id} className="relative group text-center" hover>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={() => { setModalType('candidate'); setEditItem(candidate); setShowModal(true); }}
                                        className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCandidate(candidate.id)}
                                        className="p-2 rounded-full bg-black/40 hover:bg-red-600/80 text-white"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg">
                                    {candidate.name.charAt(0)}
                                </div>
                                <h3 className="text-lg font-bold text-white">{candidate.name}</h3>
                                <p className="text-indigo-300 text-sm mb-1">{position?.name || 'Unknown Role'}</p>
                                <p className="text-gray-500 text-xs">{candidate.class}</p>
                            </Card>
                        );
                    })}
                    {candidates.length === 0 && (
                        <div className="col-span-full p-8 rounded-2xl border-2 border-dashed border-white/10 text-center text-gray-500">
                            No candidates found.
                        </div>
                    )}
                </div>
            </section>

            {/* Students Section */}
            <section>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-emerald-400" /> Student Registry
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={loadData} icon={RefreshCw}>Refresh</Button>

                        <div className="relative group">
                            <Button variant="secondary" icon={Upload}>Import</Button>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => e.target.files[0] && handleUploadStudents(e.target.files[0])}
                            />
                        </div>

                        <Button variant="secondary" onClick={exportCredentials} icon={Download}>Credentials</Button>
                        <Button
                            onClick={() => { setModalType('student'); setEditItem(null); setShowModal(true); }}
                            icon={Plus}
                        >
                            Add Student
                        </Button>
                    </div>
                </div>

                <Card className="overflow-hidden p-0">
                    {/* Search Toolbar */}
                    <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Name, ID, or Class..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="glass-input w-full pl-10 pr-4 py-2 rounded-lg"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="danger"
                                onClick={handleDeleteAllStudents}
                                disabled={students.length === 0}
                                className="text-xs px-3"
                            >
                                Delete All
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleResetAllPasswords}
                                disabled={students.length === 0}
                                className="text-xs px-3"
                            >
                                Reset Passwords
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5 text-gray-400 text-sm">
                                    <th className="p-4 font-medium">Student ID</th>
                                    <th className="p-4 font-medium">Name</th>
                                    <th className="p-4 font-medium">Class</th>
                                    <th className="p-4 font-medium">Semester</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredStudents.map(student => (
                                    <tr key={student.studentId} className="hover:bg-white/5 transition-colors text-gray-300">
                                        <td className="p-4 font-medium text-white">{student.studentId}</td>
                                        <td className="p-4">{student.name}</td>
                                        <td className="p-4">{student.class}</td>
                                        <td className="p-4">{student.semester || '-'}</td>
                                        <td className="p-4">
                                            {student.hasVoted ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">Voted</span>
                                            ) : student.isLoggedIn ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Online</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">Pending</span>
                                            )}
                                        </td>
                                        <td className="p-4 flex justify-end gap-2">
                                            <button
                                                onClick={() => { setModalType('student'); setEditItem(student); setShowModal(true); }}
                                                className="p-1.5 rounded hover:bg-white/10 text-blue-400 transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            {student.hasVoted && (
                                                <button
                                                    onClick={() => handleDeleteStudentVotes(student.studentId)}
                                                    className="p-1.5 rounded hover:bg-white/10 text-orange-400 transition-colors"
                                                    title="Reset Vote"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteStudent(student.studentId)}
                                                className="p-1.5 rounded hover:bg-white/10 text-red-400 transition-colors"
                                                disabled={student.hasVoted}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colspan="6" className="p-8 text-center text-gray-500">
                                            No students found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </section>
        </div>
    );
};

export default AdminManage;
