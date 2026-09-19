import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import LoadingSpinner from './LoadingSpinner';

// New Modular Components
import AdminSidebar from './admin/AdminSidebar';
import AdminOverview from './admin/AdminOverview';
import AdminManage from './admin/AdminManage';
import AdminSchedule from './admin/AdminSchedule';
import AdminResults from './admin/AdminResults';
import AdminModal from './admin/AdminModal';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data State
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [students, setStudents] = useState([]);
  const [votes, setVotes] = useState([]);

  // Schedule State
  const [votingSchedule, setVotingSchedule] = useState({
    votingStart: '',
    votingEnd: '',
    isActive: false,
    enableDepartmentalVoting: false,
    allowCrossDepartmentVoting: true
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('position'); // 'position', 'candidate', 'student'
  const [editItem, setEditItem] = useState(null);

  // --- Data Loading & Effects ---

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Parallelize requests for speed
      const [scheduleRes, positionsRes, candidatesRes, usersRes, votesRes] = await Promise.allSettled([
        api.get('/settings/votingSchedule'),
        api.get('/positions'),
        api.get('/candidates'),
        api.get('/users'), // Admin only endpoint
        api.get('/votes')
      ]);

      // 1. Schedule
      if (scheduleRes.status === 'fulfilled' && scheduleRes.value.data) {
        setVotingSchedule(scheduleRes.value.data);
      }

      // 2. Positions
      if (positionsRes.status === 'fulfilled') setPositions(positionsRes.value.data);

      // 3. Candidates
      if (candidatesRes.status === 'fulfilled') setCandidates(candidatesRes.value.data);

      // 4. Students
      if (usersRes.status === 'fulfilled') {
        const allUsers = usersRes.value.data;
        setStudents(allUsers.filter(u => u.role === 'student'));
      }

      // 5. Votes
      if (votesRes.status === 'fulfilled') setVotes(votesRes.value.data);

    } catch (error) {
      console.error("Error loading data:", error);
      // alert("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const totalStudents = students.length;
    // Check hasVoted flag. If users API returns it.
    const votedStudents = students.filter(s => s.hasVoted).length;
    const totalVotes = votes.length;
    const votingPercentage = totalStudents > 0 ? (votedStudents / totalStudents * 100).toFixed(1) : 0;

    return { totalStudents, votedStudents, totalVotes, votingPercentage };
  }, [students, votes]);

  // --- Handlers: Auth ---
  const handleLogout = async () => {
    logout();
  };

  // --- Handlers: Positions ---
  const handleAddPosition = async (formData) => {
    try {
      await api.post('/positions', formData);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error("Error adding position:", error);
      alert("Error adding position");
    }
  };

  const handleEditPosition = async (formData) => {
    if (!editItem) return;
    try {
      // Need ID. editItem has it.
      await api.put(`/positions/${editItem._id || editItem.id}`, formData);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error("Error updating position:", error);
      alert("Error updating position");
    }
  };

  const handleDeletePosition = async (id) => {
    if (!confirm('Are you sure? This will delete the position and all associated candidates.')) return;
    try {
      await api.delete(`/positions/${id}`);
      loadData();
    } catch (error) {
      console.error("Error deleting position:", error);
    }
  };

  // --- Handlers: Candidates ---
  const handleAddCandidate = async (formData) => {
    try {
      await api.post('/candidates', formData);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error("Error adding candidate:", error);
      alert("Error adding candidate");
    }
  };

  const handleEditCandidate = async (formData) => {
    if (!editItem) return;
    try {
      await api.put(`/candidates/${editItem._id || editItem.id}`, formData);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error("Error updating candidate:", error);
      alert("Error updating candidate");
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await api.delete(`/candidates/${id}`);
      loadData();
    } catch (error) {
      console.error("Error deleting candidate:", error);
    }
  };

  // --- Handlers: Students ---
  const handleAddStudent = async (formData) => {
    try {
      await api.post('/users', formData);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error("Error adding student:", error);
      alert(error.response?.data?.msg || "Error adding student");
    }
  };

  const handleEditStudent = async (formData) => {
    if (!editItem) return;
    try {
      await api.put(`/users/${editItem.studentId}`, formData);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error("Error updating student:", error);
      alert("Error updating student");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
      await api.delete(`/users/${studentId}`);
      loadData();
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const handleDeleteStudentVotes = async (studentId) => {
    if (!confirm('This will delete all votes by this student. Continue?')) return;
    try {
      await api.delete(`/users/${studentId}/votes`);
      loadData();
      alert(`Votes reset for student ${studentId}`);
    } catch (error) {
      console.error("Error resetting votes:", error);
      alert("Error resetting votes");
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!confirm('WARNING: Not implemented perfectly for safety. Contact Dev.')) return;
    // Would implement a delete-all endpoint in backend
  };

  const handleResetAllPasswords = async () => {
    alert("Functionality to be implemented.");
  };

  // --- Handlers: Schedule ---
  const handleSaveSchedule = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await api.post('/settings', { key: 'votingSchedule', value: votingSchedule });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Error saving schedule:", error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleStartVoting = async () => {
    try {
      const newSchedule = { ...votingSchedule, isActive: true };
      setVotingSchedule(newSchedule);
      await api.post('/settings', { key: 'votingSchedule', value: newSchedule });
    } catch (error) {
      console.error("Error starting voting:", error);
    }
  };

  const handleEndVoting = async () => {
    try {
      const newSchedule = { ...votingSchedule, isActive: false };
      setVotingSchedule(newSchedule);
      await api.post('/settings', { key: 'votingSchedule', value: newSchedule });
    } catch (error) {
      console.error("Error ending voting:", error);
    }
  };

  // --- Utilities ---
  const formatDuration = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getTimeRemaining = (targetDate) => {
    if (!targetDate) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const total = Date.parse(targetDate) - Date.parse(new Date());
    if (isNaN(total)) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  };

  const seedTestStudents = async () => {
    alert("Please use the 'Add Student' form.");
  };

  const handleUploadStudents = async (file) => {
    // Basic XLSX parsing to API calls
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      let count = 0;
      for (const row of json) {
        if (!row.studentId || !row.name) continue;
        try {
          await api.post('/users', {
            studentId: row.studentId,
            name: row.name,
            class: row.class || 'Unknown',
            semester: row.semester || 'Semester 1',
            password: row.password || 'password123'
          });
          count++;
        } catch { console.log("Skip duplicate"); }
      }
      loadData();
      alert(`Imported ${count} students.`);
    } catch (err) {
      console.error(err);
      alert("Error importing file.");
    }
  };

  const exportResults = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(candidates.map(c => {
      const cid = String(c._id || c.id);
      const cPosId = typeof c.positionId === 'object'
        ? String(c.positionId._id || c.positionId)
        : String(c.positionId);
      const cVotes = votes.filter(v => String(v.candidateId) === cid).length;
      const positionName = positions.find(p => String(p._id || p.id) === cPosId)?.name || 'Unknown';
      return { Name: c.name, Position: positionName, Votes: cVotes };
    }));
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "election_results.xlsx");
  };

  const exportCredentials = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(students.map(s => ({
      ID: s.studentId, Name: s.name, Password: "Hash Hidden"
    })));
    XLSX.utils.book_append_sheet(wb, ws, "Credentials");
    XLSX.writeFile(wb, "student_credentials.xlsx");
  };

  const exportStudentsBySemester = () => exportCredentials();

  // --- Render ---
  return (
    <div className="flex min-h-screen bg-[#0f172a] text-white font-sans">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      <main className="flex-1 ml-64 p-8 relative z-10">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner message="Loading Dashboard..." />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <AdminOverview
                stats={stats}
                positions={positions}
                candidates={candidates}
                students={students}
                votingSchedule={votingSchedule}
                setModalType={setModalType}
                setEditItem={setEditItem}
                setShowModal={setShowModal}
                seedTestStudents={seedTestStudents}
                handleStartVoting={handleStartVoting}
                handleEndVoting={handleEndVoting}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'manage' && (
              <AdminManage
                positions={positions}
                candidates={candidates}
                students={students}
                setModalType={setModalType}
                setEditItem={setEditItem}
                setShowModal={setShowModal}
                handleDeletePosition={handleDeletePosition}
                handleDeleteCandidate={handleDeleteCandidate}
                handleDeleteStudent={handleDeleteStudent}
                handleDeleteStudentVotes={handleDeleteStudentVotes}
                handleDeleteAllStudents={handleDeleteAllStudents}
                handleResetAllPasswords={handleResetAllPasswords}
                exportCredentials={exportCredentials}
                exportStudentsBySemester={exportStudentsBySemester}
                handleUploadStudents={handleUploadStudents}
                loadData={loadData}
              />
            )}

            {activeTab === 'schedule' && (
              <AdminSchedule
                votingSchedule={votingSchedule}
                setVotingSchedule={setVotingSchedule} // This updates local state, does not auto-save.
                handleSaveSchedule={handleSaveSchedule}
                saving={saving}
                saveStatus={saveStatus}
                formatDuration={formatDuration}
                getTimeRemaining={getTimeRemaining}
                handleStartVoting={handleStartVoting}
                handleEndVoting={handleEndVoting}
                loadData={loadData}
              />
            )}

            {activeTab === 'results' && (
              <AdminResults
                stats={stats}
                positions={positions}
                candidates={candidates}
                votes={votes}
                exportResults={exportResults}
              />
            )}
          </div>
        )}
      </main>

      <AdminModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        modalType={modalType}
        editItem={editItem}
        positions={positions}
        onSubmit={(data) => {
          if (modalType === 'position') {
            editItem ? handleEditPosition(data) : handleAddPosition(data);
          } else if (modalType === 'candidate') {
            editItem ? handleEditCandidate(data) : handleAddCandidate(data);
          } else {
            editItem ? handleEditStudent(data) : handleAddStudent(data);
          }
        }}
      />
    </div>
  );
};

export default AdminDashboard;