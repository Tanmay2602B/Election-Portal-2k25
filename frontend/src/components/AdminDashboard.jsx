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
import AdminAnnouncements from './admin/AdminAnnouncements';
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
  const [electionResults, setElectionResults] = useState([]); // pre-computed server-side results

  // Schedule State
  const [votingSchedule, setVotingSchedule] = useState({
    votingStart: '',
    votingEnd: '',
    isActive: false,
    enableDepartmentalVoting: false,
    allowCrossDepartmentVoting: true,
    batchVotingEnabled: false,
    batchSize: 30,
    batchClassFilter: []   // [] means all classes; populated array = selected classes only
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('position'); // 'position', 'candidate', 'student'
  const [editItem, setEditItem] = useState(null);

  // Stores plaintext passwords from the last import/add — merged map keyed by studentId
  // Passwords are hashed on the server, so this is the only place we can keep them
  const [credentialsCache, setCredentialsCache] = useState(() => {
    try {
      const saved = sessionStorage.getItem('electionCredCache');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persist cache to sessionStorage whenever it changes (survives tab refresh, clears on close)
  const addToCredCache = (entries) => {
    setCredentialsCache(prev => {
      const next = { ...prev };
      entries.forEach(({ studentId, name, password }) => {
        next[studentId] = { name, password };
      });
      try { sessionStorage.setItem('electionCredCache', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // --- Data Loading & Effects ---

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheduleRes, positionsRes, candidatesRes, usersRes, votesRes, resultsRes] = await Promise.allSettled([
        api.get('/settings/votingSchedule'),
        api.get('/positions'),
        api.get('/candidates'),
        api.get('/users'),
        api.get('/votes'),
        api.get('/votes/results') // server-side pre-computed results (no ID comparison needed)
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

      // 5. Raw votes (used for stats count)
      if (votesRes.status === 'fulfilled') setVotes(votesRes.value.data);

      // 6. Pre-computed results (server-side aggregated, no client ID comparison)
      if (resultsRes.status === 'fulfilled') setElectionResults(resultsRes.value.data);
      else console.error('Results fetch failed:', resultsRes.reason);

    } catch (error) {
      console.error("Error loading data:", error);
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
      alert(error.response?.data?.msg || "Error adding candidate");
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
      // Cache plaintext password before it's hashed on the server
      if (formData.studentId && formData.password) {
        addToCredCache([{ studentId: formData.studentId, name: formData.name || '', password: formData.password }]);
      }
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
    if (!confirm('⚠️ WARNING: This will permanently delete ALL students and their votes.\n\nThis cannot be undone. Are you sure?')) return;
    if (!confirm('Final confirmation: delete every student account and all vote records?')) return;
    try {
      await api.delete('/users');
      loadData();
      alert('All students and their votes have been deleted.');
    } catch (error) {
      console.error('Error deleting all students:', error);
      alert(error.response?.data?.msg || 'Error deleting all students');
    }
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



  const seedTestStudents = async () => {
    alert("Please use the 'Add Student' form.");
  };

  // Helper: generate an 8-char password from a student's name
  const generatePassword = (name) => {
    // Take first 4 letters of name (lowercase, letters only), pad if needed
    const letters = (name || '').replace(/[^a-zA-Z]/g, '').toLowerCase().substring(0, 4).padEnd(4, 'x');
    // 4 random digits
    const digits = Math.floor(1000 + Math.random() * 9000).toString();
    return letters + digits;
  };

  const handleUploadStudents = async (parsedRows) => {
    // parsedRows comes pre-parsed from ImportPreviewModal
    // Shape: [{ studentId, name, password, class, semester, selected, errors }]
    if (!Array.isArray(parsedRows) || parsedRows.length === 0) return;

    try {
      // Send ALL rows in a single bulk request — avoids rate-limit issues
      const res = await api.post('/users/bulk', {
        students: parsedRows.map(r => ({
          studentId: r.studentId,
          name: r.name,
          password: r.password,
          class: r.class || 'Unknown',
          semester: r.semester || 'Semester 1'
        }))
      });

      const { imported, skipped, results: rowResults } = res.data;

      loadData();

      // Cache plaintext passwords for the successfully imported rows
      const importedCredentials = parsedRows
        .filter(r => rowResults.find(rr => rr.studentId === r.studentId && rr.status === 'imported'))
        .map(r => ({ studentId: r.studentId, name: r.name, password: r.password }));

      if (importedCredentials.length > 0) {
        addToCredCache(importedCredentials);
      }

      // Build human-readable summary
      const failedRows = rowResults.filter(r => r.status === 'failed');
      let msg = `✅ Imported ${imported} of ${parsedRows.length} student(s).`;
      if (failedRows.length > 0) {
        msg += `\n\n⚠️ ${skipped} row(s) were NOT imported:\n`;
        msg += failedRows.map(f => `• [${f.studentId}] — ${f.reason}`).join('\n');
      }

      if (imported > 0) {
        const downloadCreds = window.confirm(msg + '\n\nDownload credentials sheet for imported students?');
        if (downloadCreds) {
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(importedCredentials.map(c => ({
            'Student ID': c.studentId,
            'Name': c.name,
            'Password': c.password
          })));
          ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 14 }];
          XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
          XLSX.writeFile(wb, 'imported_student_credentials.xlsx');
        }
      } else {
        alert(msg);
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      alert('Import failed: ' + (err.response?.data?.msg || err.message || 'Server error'));
    }
  };

  const exportResults = () => {
    const wb = XLSX.utils.book_new();
    // Use pre-computed server-side results for accurate export
    const rows = electionResults.flatMap(result =>
      result.allCandidates.map(c => ({
        Position: result.position.name,
        Name: c.candidate.name,
        Class: c.candidate.class || '',
        Votes: c.votes,
        Percentage: `${c.percentage}%`
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Note: 'No results yet' }]);
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "election_results.xlsx");
  };

  const exportCredentials = () => {
    const wb = XLSX.utils.book_new();
    const rows = students.map(s => {
      const cached = credentialsCache[s.studentId];
      return {
        'Student ID': s.studentId,
        'Name': s.name,
        'Class': s.class || '',
        'Semester': s.semester || '',
        'Password': cached?.password || '⚠ Not available (re-import to retrieve)'
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Note: 'No students found' }]);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
    XLSX.writeFile(wb, 'student_credentials.xlsx');
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
                setVotingSchedule={setVotingSchedule}
                handleSaveSchedule={handleSaveSchedule}
                saving={saving}
                saveStatus={saveStatus}
                formatDuration={formatDuration}
                handleStartVoting={handleStartVoting}
                handleEndVoting={handleEndVoting}
                loadData={loadData}
                students={students}
              />
            )}

            {activeTab === 'results' && (
              <AdminResults
                stats={stats}
                electionResults={electionResults}
                exportResults={exportResults}
              />
            )}

            {activeTab === 'announcements' && (
              <AdminAnnouncements />
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