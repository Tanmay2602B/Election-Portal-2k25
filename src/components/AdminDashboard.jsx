import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  setDoc,
  getDoc 
} from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../firebase';
import { 
  LogOut, 
  Settings, 
  Users, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Upload,
  Download,
  Eye,
  UserCheck,
  Calendar,
  Clock,
  Vote
} from 'lucide-react';
import * as XLSX from 'xlsx';
import LoadingSpinner from './LoadingSpinner';
import UpcomingElection from './UpcomingElection';
import LiveClock from './LiveClock';

function AdminDashboard() {
  const { userProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [students, setStudents] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [votingSchedule, setVotingSchedule] = useState({
    votingStart: '',
    votingEnd: '',
    enableDepartmentalVoting: false,
    allowCrossDepartmentVoting: true,
    isActive: false
  });

  // Error boundary state
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData().catch(err => {
      console.error('Failed to load admin dashboard data:', err);
      setError(err);
    });
  }, []);

  // If there's an error, show error UI
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <div className="text-red-500 mb-4">
            <Settings className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button 
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="btn-primary"
          >
            Reload Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen if user profile is not loaded yet
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading admin dashboard..." />
      </div>
    );
  }

  const loadData = async () => {
    setLoading(true);
    try {
      // Load positions
      const positionsQuery = query(collection(db, 'positions'), orderBy('name'));
      const positionsSnapshot = await getDocs(positionsQuery);
      const positionsData = positionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPositions(positionsData);

      // Load candidates
      const candidatesQuery = query(collection(db, 'candidates'), orderBy('name'));
      const candidatesSnapshot = await getDocs(candidatesQuery);
      const candidatesData = candidatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidates(candidatesData);

      // Load students
      const studentsQuery = query(collection(db, 'users'), orderBy('name'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsData);

      // Load votes
      const votesQuery = query(collection(db, 'votes'));
      const votesSnapshot = await getDocs(votesQuery);
      const votesData = votesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVotes(votesData);

      // Load voting schedule
      const scheduleDoc = await getDoc(doc(db, 'settings', 'electionConfig'));
      if (scheduleDoc.exists()) {
        const scheduleData = scheduleDoc.data();
        setVotingSchedule({
          votingStart: scheduleData.votingStart ? new Date(scheduleData.votingStart.seconds * 1000).toISOString().slice(0, 16) : '',
          votingEnd: scheduleData.votingEnd ? new Date(scheduleData.votingEnd.seconds * 1000).toISOString().slice(0, 16) : '',
          enableDepartmentalVoting: scheduleData.enableDepartmentalVoting || false,
          allowCrossDepartmentVoting: scheduleData.allowCrossDepartmentVoting !== false, // default true
          isActive: scheduleData.isActive || false
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      throw error; // Re-throw to be caught by useEffect
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAddPosition = async (formData) => {
    try {
      await addDoc(collection(db, 'positions'), {
        name: formData.name,
        description: formData.description,
        createdAt: new Date()
      });
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Error adding position:', error);
    }
  };

  const handleAddCandidate = async (formData) => {
    try {
      await addDoc(collection(db, 'candidates'), {
        name: formData.name,
        class: formData.class,
        bio: formData.bio,
        positionId: formData.positionId,
        photoURL: formData.photoURL || '',
        createdAt: new Date()
      });
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Error adding candidate:', error);
    }
  };

  const handleAddStudent = async (formData) => {
    try {
      await setDoc(doc(db, 'users', formData.studentId), {
        studentId: formData.studentId,
        name: formData.name,
        class: formData.class,
        password: formData.password || 'password123',
        hasVoted: false,
        isLoggedIn: false,
        deviceId: null,
        createdAt: new Date()
      });
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Error adding student. Please check if Student ID already exists.');
    }
  };

  const handleEditPosition = async (formData) => {
    try {
      await updateDoc(doc(db, 'positions', editItem.id), {
        name: formData.name,
        description: formData.description,
        updatedAt: new Date()
      });
      loadData();
      setShowModal(false);
      setEditItem(null);
    } catch (error) {
      console.error('Error updating position:', error);
    }
  };

  const handleEditCandidate = async (formData) => {
    try {
      await updateDoc(doc(db, 'candidates', editItem.id), {
        name: formData.name,
        class: formData.class,
        bio: formData.bio,
        positionId: formData.positionId,
        photoURL: formData.photoURL || '',
        updatedAt: new Date()
      });
      loadData();
      setShowModal(false);
      setEditItem(null);
    } catch (error) {
      console.error('Error updating candidate:', error);
    }
  };

  const handleEditStudent = async (formData) => {
    try {
      await updateDoc(doc(db, 'users', editItem.studentId), {
        name: formData.name,
        class: formData.class,
        password: formData.password,
        updatedAt: new Date()
      });
      loadData();
      setShowModal(false);
      setEditItem(null);
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student? This will also delete all their votes.')) {
      return;
    }
    
    try {
      // Delete all votes by this student
      const votesToDelete = votes.filter(v => v.voterId === studentId);
      for (const vote of votesToDelete) {
        await deleteDoc(doc(db, 'votes', vote.id));
      }
      
      // Delete the student
      await deleteDoc(doc(db, 'users', studentId));
      
      loadData();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!confirm('Are you sure you want to delete ALL students? This will also delete all their votes. This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete all votes
      for (const vote of votes) {
        await deleteDoc(doc(db, 'votes', vote.id));
      }
      
      // Delete all students
      for (const student of students) {
        await deleteDoc(doc(db, 'users', student.studentId));
      }
      
      loadData();
      alert('All students and their votes have been successfully deleted!');
    } catch (error) {
      console.error('Error deleting all students:', error);
      alert('Error deleting all students. Please try again.');
    }
  };

  const handleDeletePosition = async (positionId) => {
    if (!confirm('Are you sure you want to delete this position? This will also delete all candidates and votes for this position.')) {
      return;
    }
    
    try {
      // Delete all candidates for this position
      const candidatesToDelete = candidates.filter(c => c.positionId === positionId);
      for (const candidate of candidatesToDelete) {
        await deleteDoc(doc(db, 'candidates', candidate.id));
      }
      
      // Delete all votes for this position
      const votesToDelete = votes.filter(v => v.positionId === positionId);
      for (const vote of votesToDelete) {
        await deleteDoc(doc(db, 'votes', vote.id));
      }
      
      // Delete the position
      await deleteDoc(doc(db, 'positions', positionId));
      
      loadData();
    } catch (error) {
      console.error('Error deleting position:', error);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!confirm('Are you sure you want to delete this candidate? This will also delete all votes for this candidate.')) {
      return;
    }
    
    try {
      // Delete all votes for this candidate
      const votesToDelete = votes.filter(v => v.candidateId === candidateId);
      for (const vote of votesToDelete) {
        await deleteDoc(doc(db, 'votes', vote.id));
      }
      
      // Delete the candidate
      await deleteDoc(doc(db, 'candidates', candidateId));
      
      loadData();
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
  };

  const handleSaveSchedule = async () => {
    if (!votingSchedule.votingStart || !votingSchedule.votingEnd) {
      alert('Please set both start and end times for voting.');
      return;
    }

    const startTime = new Date(votingSchedule.votingStart);
    const endTime = new Date(votingSchedule.votingEnd);
    
    if (startTime >= endTime) {
      alert('Voting end time must be after start time.');
      return;
    }

    setSaving(true);
    setSaveStatus('');

    try {
      const scheduleData = {
        votingStart: startTime,
        votingEnd: endTime,
        enableDepartmentalVoting: votingSchedule.enableDepartmentalVoting,
        allowCrossDepartmentVoting: votingSchedule.allowCrossDepartmentVoting,
        isActive: votingSchedule.isActive,
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'settings', 'electionConfig'), scheduleData);
      
      setSaveStatus('success');
      
      // Show success message with better styling
      const successMsg = `✅ Voting schedule saved successfully!\n\n` +
        `📅 Start: ${startTime.toLocaleString()}\n` +
        `📅 End: ${endTime.toLocaleString()}\n` +
        `⏱️ Duration: ${Math.round((endTime - startTime) / (1000 * 60 * 60))} hours\n\n` +
        `🏢 Departmental Voting: ${votingSchedule.enableDepartmentalVoting ? 'Enabled' : 'Disabled'}\n` +
        `🔄 Cross-Department Voting: ${votingSchedule.allowCrossDepartmentVoting ? 'Allowed' : 'Blocked'}\n` +
        `🔥 Voting Status: ${votingSchedule.isActive ? 'ACTIVE' : 'INACTIVE'}`;
      
      alert(successMsg);
      
      // Refresh data to show updated schedule
      loadData();
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setSaveStatus('error');
      alert('❌ Error saving schedule. Please try again.');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleStartVoting = async () => {
    if (!confirm('Start voting now? This will activate the voting system immediately.')) {
      return;
    }

    try {
      const now = new Date();
      const scheduleData = {
        votingStart: now,
        votingEnd: votingSchedule.votingEnd ? new Date(votingSchedule.votingEnd) : new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours from now if no end time
        enableDepartmentalVoting: votingSchedule.enableDepartmentalVoting,
        allowCrossDepartmentVoting: votingSchedule.allowCrossDepartmentVoting,
        isActive: true,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'settings', 'electionConfig'), scheduleData);
      
      alert(`🚀 Voting has been started!\n\n⏰ Started at: ${now.toLocaleString()}\n⏰ Will end at: ${scheduleData.votingEnd.toLocaleString()}`);
      
      loadData();
    } catch (error) {
      console.error('Error starting voting:', error);
      alert('❌ Error starting voting. Please try again.');
    }
  };

  const handleEndVoting = async () => {
    if (!confirm('End voting now? This will immediately stop all voting and cannot be undone.')) {
      return;
    }

    try {
      const now = new Date();
      const scheduleData = {
        votingStart: votingSchedule.votingStart ? new Date(votingSchedule.votingStart) : now,
        votingEnd: now,
        enableDepartmentalVoting: votingSchedule.enableDepartmentalVoting,
        allowCrossDepartmentVoting: votingSchedule.allowCrossDepartmentVoting,
        isActive: false,
        updatedAt: now
      };
      
      await setDoc(doc(db, 'settings', 'electionConfig'), scheduleData);
      
      alert(`🛑 Voting has been ended!\n\n⏰ Ended at: ${now.toLocaleString()}`);
      
      loadData();
    } catch (error) {
      console.error('Error ending voting:', error);
      alert('❌ Error ending voting. Please try again.');
    }
  };

  // Helper function to format time duration
  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Helper function to get time remaining
  const getTimeRemaining = (targetDate) => {
    const now = new Date();
    const target = new Date(targetDate);
    const difference = target - now;
    
    if (difference <= 0) {
      return { expired: true };
    }
    
    return {
      expired: false,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      total: difference
    };
  };

  const seedTestStudents = async () => {
    const confirmSeed = confirm('This will add 5 test students to the database. Continue?');
    if (!confirmSeed) return;

    const testStudents = [
      { studentId: 'S101', name: 'Alice Johnson', class: 'BCA-1', password: 'pass123' },
      { studentId: 'S102', name: 'Bob Smith', class: 'BCA-1', password: 'pass123' },
      { studentId: 'S103', name: 'Charlie Brown', class: 'BCA-2', password: 'pass123' },
      { studentId: 'S104', name: 'Diana Prince', class: 'BCA-2', password: 'pass123' },
      { studentId: 'S105', name: 'Eve Wilson', class: 'BCA-3', password: 'pass123' }
    ];

    try {
      for (const student of testStudents) {
        await setDoc(doc(db, 'users', student.studentId), {
          ...student,
          hasVoted: false,
          isLoggedIn: false,
          deviceId: null,
          createdAt: new Date()
        });
      }
      loadData();
      alert(`Successfully added ${testStudents.length} test students!`);
    } catch (error) {
      console.error('Error seeding test students:', error);
      alert('Error adding test students. Please try again.');
    }
  };

  const handleUploadStudents = async (file) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      for (const student of jsonData) {
        // Auto-generate student ID if not provided
        const studentId = student.studentId || generateStudentId();
        
        // Auto-generate password if not provided
        const password = student.password || generatePassword();
        
        await setDoc(doc(db, 'users', studentId), {
          studentId: studentId,
          name: student.name,
          class: student.class,
          password: password,
          hasVoted: false,
          isLoggedIn: false,
          createdAt: new Date()
        });
      }
      loadData();
      alert(`Successfully uploaded ${jsonData.length} students with auto-generated credentials where needed!`);
    } catch (error) {
      console.error('Error uploading students:', error);
      alert('Error uploading students. Please check the file format and try again.');
    }
  };

  // Function to generate student ID
  const generateStudentId = () => {
    const prefix = 'S';
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    return prefix + randomNum;
  };

  // Function to generate password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Function to reset all student passwords
  const handleResetAllPasswords = async () => {
    if (!confirm('Are you sure you want to reset passwords for ALL students? This will generate new passwords for every student.')) {
      return;
    }
    
    try {
      const updatedStudents = [];
      
      // Generate new passwords for all students
      for (const student of students) {
        const newPassword = generatePassword();
        await updateDoc(doc(db, 'users', student.studentId), {
          password: newPassword,
          updatedAt: new Date()
        });
        updatedStudents.push({ ...student, password: newPassword });
      }
      
      // Show summary of updated passwords
      let message = `Successfully reset passwords for ${students.length} students!\n\n`;
      message += "Updated credentials:\n";
      updatedStudents.forEach(student => {
        message += `
Student ID: ${student.studentId}
Name: ${student.name}
New Password: ${student.password}
`;
      });
      
      alert(message);
      loadData();
    } catch (error) {
      console.error('Error resetting all passwords:', error);
      alert('Error resetting all passwords. Please try again.');
    }
  };

  // Function to reset individual student password (kept for reference, but no UI button)
  const handleResetPassword = async (studentId) => {
    if (!confirm('Are you sure you want to reset this student\'s password?')) {
      return;
    }
    
    try {
      const newPassword = generatePassword();
      await updateDoc(doc(db, 'users', studentId), {
        password: newPassword,
        updatedAt: new Date()
      });
      
      // Show the new password to the admin
      alert(`Password reset successfully!

Student ID: ${studentId}
New Password: ${newPassword}

Please share this with the student securely.`);
      loadData();
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password. Please try again.');
    }
  };

  // Function to export student credentials
  const exportCredentials = () => {
    const credentials = students.map(student => ({
      studentId: student.studentId,
      name: student.name,
      class: student.class,
      password: student.password
    }));

    const ws = XLSX.utils.json_to_sheet(credentials);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Credentials');
    XLSX.writeFile(wb, 'student-credentials.xlsx');
  };

  const getStats = () => {
    const totalStudents = students.length;
    const votedStudents = students.filter(s => s.hasVoted).length;
    const totalVotes = votes.length;
    const votingPercentage = totalStudents > 0 ? (votedStudents / totalStudents * 100).toFixed(1) : 0;
    
    return { totalStudents, votedStudents, totalVotes, votingPercentage };
  };

  const stats = getStats();

  // Function to export results
  const exportResults = () => {
    // Prepare data for export
    const exportData = positions.map(position => {
      const positionVotes = votes.filter(vote => vote.positionId === position.id);
      const positionCandidates = candidates.filter(c => c.positionId === position.id);
      
      // Prepare candidate results
      const candidateResults = positionCandidates.map(candidate => {
        const candidateVotes = positionVotes.filter(vote => vote.candidateId === candidate.id);
        const percentage = positionVotes.length > 0 ? (candidateVotes.length / positionVotes.length * 100).toFixed(1) : 0;
        return {
          candidateName: candidate.name,
          candidateClass: candidate.class,
          votes: candidateVotes.length,
          percentage: parseFloat(percentage)
        };
      }).sort((a, b) => b.votes - a.votes); // Sort by votes descending
      
      return {
        position: position.name,
        totalVotes: positionVotes.length,
        candidates: candidateResults
      };
    });
    
    // Convert to worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Election Results');
    XLSX.writeFile(wb, 'election-results.xlsx');
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Upcoming Election Section */}
      <div className="mb-8">
        <UpcomingElection 
          isAdmin={true} 
          onScheduleSave={() => setActiveTab('schedule')}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Voted Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.votedStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <Vote className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVotes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Turnout</p>
              <p className="text-2xl font-bold text-gray-900">{stats.votingPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <button
            onClick={() => { setModalType('position'); setEditItem(null); setShowModal(true); }}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
          >
            <Plus className="h-6 w-6 text-gray-400 mr-2" />
            Add Position
          </button>
          <button
            onClick={() => { setModalType('candidate'); setEditItem(null); setShowModal(true); }}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
          >
            <Plus className="h-6 w-6 text-gray-400 mr-2" />
            Add Candidate
          </button>
          <button
            onClick={() => { setModalType('student'); setEditItem(null); setShowModal(true); }}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
          >
            <Plus className="h-6 w-6 text-gray-400 mr-2" />
            Add Student
          </button>
          <button
            onClick={seedTestStudents}
            className="flex items-center justify-center p-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 transition-colors bg-orange-50"
            title="Add 5 test students for demo"
          >
            <Users className="h-6 w-6 text-orange-500 mr-2" />
            Seed Test Data
          </button>
          
          {/* Start/End Voting Controls */}
          <button
            onClick={handleStartVoting}
            disabled={votingSchedule.isActive}
            className={`flex items-center justify-center p-4 border-2 rounded-lg transition-colors ${
              votingSchedule.isActive 
                ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-green-300 hover:border-green-500 bg-green-50 text-green-700'
            }`}
            title={votingSchedule.isActive ? 'Voting is already active' : 'Start voting immediately'}
          >
            <Vote className="h-6 w-6 mr-2" />
            {votingSchedule.isActive ? 'Active' : 'Start Voting'}
          </button>
          
          <button
            onClick={handleEndVoting}
            disabled={!votingSchedule.isActive}
            className={`flex items-center justify-center p-4 border-2 rounded-lg transition-colors ${
              !votingSchedule.isActive 
                ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-red-300 hover:border-red-500 bg-red-50 text-red-700'
            }`}
            title={!votingSchedule.isActive ? 'Voting is not active' : 'End voting immediately'}
          >
            <Clock className="h-6 w-6 mr-2" />
            End Voting
          </button>
        </div>
      </div>

      {/* Getting Started Guide */}
      {positions.length === 0 && candidates.length === 0 && students.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 Getting Started</h3>
          <div className="text-blue-800 space-y-2">
            <p className="font-medium">Quick setup for testing:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Click <strong>"Seed Test Data"</strong> to add 5 sample students (S101-S105, password: pass123)</li>
              <li>Go to <strong>"Manage"</strong> tab → Add some positions (e.g., President, Vice President)</li>
              <li>Add candidates for each position</li>
              <li>Go to <strong>"Schedule"</strong> tab → Set voting start/end times</li>
              <li>Test student login using Student ID: <code className="bg-blue-200 px-1 rounded">S101</code> Password: <code className="bg-blue-200 px-1 rounded">pass123</code></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Election Results</h3>
        <button
          onClick={exportResults}
          className="flex items-center btn-primary"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Results
        </button>
      </div>
      
      {/* Overall Statistics Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Voting Statistics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart for Overall Stats */}
          <div className="h-80">
            <h5 className="text-md font-medium text-gray-800 mb-2">Voter Participation</h5>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Total Students', value: stats.totalStudents },
                  { name: 'Voted Students', value: stats.votedStudents },
                  { name: 'Pending Votes', value: stats.totalStudents - stats.votedStudents }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Pie Chart for Voting Turnout */}
          <div className="h-80">
            <h5 className="text-md font-medium text-gray-800 mb-2">Voting Turnout</h5>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Voted', value: stats.votedStudents },
                    { name: 'Not Voted', value: stats.totalStudents - stats.votedStudents }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell key="cell-0" fill="#4ade80" />
                  <Cell key="cell-1" fill="#f87171" />
                </Pie>
                <Tooltip formatter={(value) => [value, 'Students']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {positions.map(position => {
        const positionVotes = votes.filter(vote => vote.positionId === position.id);
        const positionCandidates = candidates.filter(c => c.positionId === position.id);
        
        // Prepare data for charts
        const chartData = positionCandidates.map(candidate => {
          const candidateVotes = positionVotes.filter(vote => vote.candidateId === candidate.id);
          const percentage = positionVotes.length > 0 ? (candidateVotes.length / positionVotes.length * 100).toFixed(1) : 0;
          return {
            name: candidate.name,
            votes: candidateVotes.length,
            percentage: parseFloat(percentage)
          };
        }).sort((a, b) => b.votes - a.votes); // Sort by votes descending
        
        // Colors for the charts
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
        
        return (
          <div key={position.id} className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">{position.name}</h4>
            
            {/* Charts for this position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Bar Chart */}
              <div className="h-64">
                <h5 className="text-md font-medium text-gray-800 mb-2">Vote Distribution</h5>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="votes" name="Votes">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Pie Chart */}
              <div className="h-64">
                <h5 className="text-md font-medium text-gray-800 mb-2">Vote Share</h5>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="votes"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Votes']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Detailed results table */}
            <div className="space-y-3">
              {positionCandidates.map(candidate => {
                const candidateVotes = positionVotes.filter(vote => vote.candidateId === candidate.id);
                const percentage = positionVotes.length > 0 ? (candidateVotes.length / positionVotes.length * 100).toFixed(1) : 0;
                
                return (
                  <div key={candidate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{candidate.name}</p>
                      <p className="text-sm text-gray-600">{candidate.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">{candidateVotes.length}</p>
                      <p className="text-sm text-gray-600">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderManage = () => (
    <div className="space-y-6">
      {/* Positions Management */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Positions</h3>
          <button
            onClick={() => { setModalType('position'); setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.map(position => {
                const positionCandidates = candidates.filter(c => c.positionId === position.id);
                return (
                  <tr key={position.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {position.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position.description || 'No description'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {positionCandidates.length} candidate{positionCandidates.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => { setModalType('position'); setEditItem(position); setShowModal(true); }}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePosition(position.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {positions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No positions found. Add one to get started.
            </div>
          )}
        </div>
      </div>

      {/* Candidates Management */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Candidates</h3>
          <button
            onClick={() => { setModalType('candidate'); setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {candidates.map(candidate => {
                const position = positions.find(p => p.id === candidate.positionId);
                return (
                  <tr key={candidate.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {candidate.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {candidate.class}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position?.name || 'Unknown Position'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {candidate.bio || 'No bio'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => { setModalType('candidate'); setEditItem(candidate); setShowModal(true); }}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {candidates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No candidates found. Add one to get started.
            </div>
          )}
        </div>
      </div>

      {/* Students Management */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Students</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => { setModalType('student'); setEditItem(null); setShowModal(true); }}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </button>
            <button
              onClick={handleDeleteAllStudents}
              className="btn-danger flex items-center"
              disabled={students.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Students
            </button>
            <button
              onClick={handleResetAllPasswords}
              className="btn-secondary flex items-center"
              disabled={students.length === 0}
            >
              <Settings className="h-4 w-4 mr-2" />
              Reset All Passwords
            </button>
            <button
              onClick={exportCredentials}
              className="btn-secondary flex items-center"
              disabled={students.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Credentials
            </button>
            <div className="relative group">
              <label className="btn-secondary flex items-center cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleUploadStudents(e.target.files[0])}
                />
              </label>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 w-64 z-10">
                <p>Upload Excel/CSV with columns:</p>
                <p>studentId, name, class, password</p>
                <p className="mt-1"><a href="/student-template.csv" download className="text-blue-300 hover:underline">Download template</a></p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => (
                <tr key={student.studentId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.class}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.hasVoted 
                        ? 'bg-green-100 text-green-800' 
                        : student.isLoggedIn 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.hasVoted ? 'Voted' : student.isLoggedIn ? 'Online' : 'Ready'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => { setModalType('student'); setEditItem(student); setShowModal(true); }}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student.studentId)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center"
                      disabled={student.hasVoted}
                      title={student.hasVoted ? 'Cannot delete student who has already voted' : 'Delete student'}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No students found. Add some to get started.
            </div>
          )}
        </div>
        
        {/* Template Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">📄 Excel/CSV Upload Template</h4>
          <p className="text-blue-800 text-sm mb-2">
            Download and use this template for uploading students:
          </p>
          <a 
            href="/student-template.csv" 
            download 
            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-1" />
            Download CSV Template
          </a>
          <div className="mt-3 text-xs text-blue-700">
            <p className="font-medium">Template Format:</p>
            <p>Columns: studentId, name, class, password</p>
            <p>• studentId: Optional (auto-generated if empty)</p>
            <p>• password: Optional (auto-generated if empty)</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-6">
      {/* Schedule Management */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Voting Schedule & Settings</h3>
          </div>
          <button
            onClick={loadData}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Clock className="h-4 w-4 mr-1" />
            Refresh Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="form-label">Voting Start Date & Time</label>
            <input
              type="datetime-local"
              value={votingSchedule.votingStart}
              onChange={(e) => setVotingSchedule(prev => ({ ...prev, votingStart: e.target.value }))}
              className="form-input"
              required
            />
          </div>
          
          <div>
            <label className="form-label">Voting End Date & Time</label>
            <input
              type="datetime-local"
              value={votingSchedule.votingEnd}
              onChange={(e) => setVotingSchedule(prev => ({ ...prev, votingEnd: e.target.value }))}
              className="form-input"
              required
            />
          </div>
        </div>
        
        {/* Departmental Voting Settings */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">🏢 Departmental Voting Settings</h4>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableDepartmental"
                checked={votingSchedule.enableDepartmentalVoting}
                onChange={(e) => setVotingSchedule(prev => ({ ...prev, enableDepartmentalVoting: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableDepartmental" className="ml-2 block text-sm text-gray-900">
                <span className="font-medium">Enable Departmental Voting</span>
                <div className="text-gray-500">Allow simultaneous elections in different departments</div>
              </label>
            </div>
            
            {votingSchedule.enableDepartmentalVoting && (
              <div className="ml-6 pl-4 border-l-2 border-blue-200">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowCrossDept"
                    checked={votingSchedule.allowCrossDepartmentVoting}
                    onChange={(e) => setVotingSchedule(prev => ({ ...prev, allowCrossDepartmentVoting: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowCrossDept" className="ml-2 block text-sm text-gray-900">
                    <span className="font-medium">Allow Cross-Department Voting</span>
                    <div className="text-gray-500">Students can vote for other departments (recommended for fair elections)</div>
                  </label>
                </div>
                
                {!votingSchedule.allowCrossDepartmentVoting && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      <span className="text-sm text-yellow-800">
                        <strong>Restricted Mode:</strong> Students can only vote for their own department.
                        This may limit participation in other department elections.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Voting Control Section */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">🔥 Voting Control</h4>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={votingSchedule.isActive}
                onChange={(e) => setVotingSchedule(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                <span className="font-medium">Voting Active</span>
                <div className="text-gray-500">Toggle this to activate/deactivate voting</div>
              </label>
            </div>
            
            <div className={`p-4 rounded-lg ${
              votingSchedule.isActive 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${
                  votingSchedule.isActive ? 'bg-green-500' : 'bg-red-500'
                } mr-2`}></div>
                <span className={`font-medium ${
                  votingSchedule.isActive ? 'text-green-800' : 'text-red-800'
                }`}>
                  Voting is currently {votingSchedule.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${
                votingSchedule.isActive ? 'text-green-700' : 'text-red-700'
              }`}>
                {votingSchedule.isActive 
                  ? 'Students can now cast their votes during the scheduled time period.'
                  : 'Students cannot vote until voting is activated.'}
              </p>
            </div>
            
            {/* Quick Control Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleStartVoting}
                disabled={votingSchedule.isActive}
                className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                  votingSchedule.isActive 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <Vote className="h-4 w-4 mr-2" />
                Start Voting Now
              </button>
              
              <button
                onClick={handleEndVoting}
                disabled={!votingSchedule.isActive}
                className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                  !votingSchedule.isActive 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <Clock className="h-4 w-4 mr-2" />
                End Voting Now
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSaveSchedule}
            disabled={!votingSchedule.votingStart || !votingSchedule.votingEnd || saving}
            className={`btn-primary flex items-center ${
              saving ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
              saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : ''
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Saving...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                ✓ Saved Successfully!
              </>
            ) : saveStatus === 'error' ? (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                ✗ Save Failed
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Save Schedule
              </>
            )}
          </button>
          
          {votingSchedule.votingStart && votingSchedule.votingEnd && (
            <div className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✓</span>
              Ready to save - Duration: {Math.round((new Date(votingSchedule.votingEnd) - new Date(votingSchedule.votingStart)) / (1000 * 60 * 60))} hours
            </div>
          )}
        </div>
        
        {votingSchedule.votingStart && votingSchedule.votingEnd && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Current Schedule Preview</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Start:</strong> {new Date(votingSchedule.votingStart).toLocaleString()}</p>
              <p><strong>End:</strong> {new Date(votingSchedule.votingEnd).toLocaleString()}</p>
              <p><strong>Duration:</strong> {formatDuration(new Date(votingSchedule.votingEnd) - new Date(votingSchedule.votingStart))}</p>
              <p><strong>Departmental Voting:</strong> {votingSchedule.enableDepartmentalVoting ? '✅ Enabled' : '❌ Disabled'}</p>
              {votingSchedule.enableDepartmentalVoting && (
                <p><strong>Cross-Department Voting:</strong> {votingSchedule.allowCrossDepartmentVoting ? '✅ Allowed' : '❌ Blocked'}</p>
              )}
              <p><strong>Voting Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                  votingSchedule.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                }`}>
                  {votingSchedule.isActive ? '🔥 ACTIVE' : '🛑 INACTIVE'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Current Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Current Voting Status</h4>
          <LiveClock className="text-right" showIcon={false} showDate={true} />
        </div>
        {(() => {
          const now = new Date();
          const start = votingSchedule.votingStart ? new Date(votingSchedule.votingStart) : null;
          const end = votingSchedule.votingEnd ? new Date(votingSchedule.votingEnd) : null;
          
          if (!start || !end) {
            return (
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-600 font-medium">No voting schedule set</p>
                <p className="text-gray-500 text-sm mt-1">Please configure the voting schedule first</p>
              </div>
            );
          }
          
          // Check if voting is manually disabled
          if (!votingSchedule.isActive) {
            return (
              <div className="p-4 bg-red-100 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <p className="text-red-800 font-medium">Voting is manually disabled</p>
                </div>
                <p className="text-red-700 text-sm mt-1">Enable voting in the controls above to allow students to vote</p>
              </div>
            );
          }
          
          if (now < start) {
            const timeRemaining = getTimeRemaining(start);
            const progressPercentage = 0;
            
            return (
              <div className="p-4 bg-yellow-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <p className="text-yellow-800 font-medium">Voting has not started yet</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-800 font-medium text-lg">
                      {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                    </p>
                    <p className="text-yellow-700 text-xs">Time until voting begins</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-yellow-700 mb-1">
                    <span>Start</span>
                    <span>{progressPercentage.toFixed(1)}% Complete</span>
                    <span>End</span>
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <p className="text-yellow-700 text-sm mt-2">Scheduled start: {start.toLocaleString()}</p>
              </div>
            );
          }
          
          if (now > end) {
            return (
              <div className="p-4 bg-red-100 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <p className="text-red-800 font-medium">Voting has ended</p>
                </div>
                <p className="text-red-700 text-sm mt-1">Ended {Math.ceil((now - end) / (1000 * 60 * 60))} hours ago</p>
                <p className="text-red-700 text-sm">Ended at: {end.toLocaleString()}</p>
              </div>
            );
          }
          
          const timeRemaining = getTimeRemaining(end);
          const totalDuration = end - start;
          const elapsed = now - start;
          const progressPercentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
          
          return (
            <div className="p-4 bg-green-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <p className="text-green-800 font-medium">Voting is currently active 🔥</p>
                </div>
                <div className="text-right">
                  <p className="text-green-800 font-medium text-lg">
                    {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                  </p>
                  <p className="text-green-700 text-xs">Time remaining</p>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="flex justify-between text-xs text-green-700 mb-1">
                  <span>Started</span>
                  <span>{progressPercentage.toFixed(1)}% Complete</span>
                  <span>Ends</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <p className="text-green-700 text-sm mt-2">Scheduled end: {end.toLocaleString()}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Election Administration</h1>
                <p className="text-sm text-gray-500">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <LiveClock className="bg-gray-100 px-4 py-2 rounded-lg" showIcon={true} showDate={false} />
              <span className="text-sm text-gray-600">Welcome, {userProfile?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'manage', label: 'Manage', icon: Settings },
              { id: 'schedule', label: 'Schedule', icon: Calendar },
              { id: 'results', label: 'Results', icon: Eye }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <LoadingSpinner size="lg" message="Loading data..." />
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'manage' && renderManage()}
            {activeTab === 'schedule' && renderSchedule()}
            {activeTab === 'results' && renderResults()}
          </>
        )}
      </main>

      {/* Modal for adding/editing positions/candidates/students */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editItem ? 'Edit' : 'Add'} {modalType === 'position' ? 'Position' : modalType === 'candidate' ? 'Candidate' : 'Student'}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                if (editItem) {
                  if (modalType === 'position') {
                    handleEditPosition(data);
                  } else if (modalType === 'candidate') {
                    handleEditCandidate(data);
                  } else {
                    handleEditStudent(data);
                  }
                } else {
                  if (modalType === 'position') {
                    handleAddPosition(data);
                  } else if (modalType === 'candidate') {
                    handleAddCandidate(data);
                  } else {
                    handleAddStudent(data);
                  }
                }
              }}
              className="space-y-4"
            >
              {modalType === 'student' ? (
                <>
                  <div>
                    <label className="form-label">Student ID</label>
                    <input 
                      name="studentId" 
                      type="text" 
                      className="form-input" 
                      defaultValue={editItem?.studentId || ''}
                      disabled={!!editItem} // Can't change Student ID when editing
                      placeholder="e.g., S101, 2024001, etc."
                      required 
                    />
                    {editItem && (
                      <p className="text-xs text-gray-500 mt-1">Student ID cannot be changed</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Full Name</label>
                    <input 
                      name="name" 
                      type="text" 
                      className="form-input" 
                      defaultValue={editItem?.name || ''}
                      placeholder="e.g., John Doe"
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Class</label>
                    <input 
                      name="class" 
                      type="text" 
                      className="form-input" 
                      defaultValue={editItem?.class || ''}
                      placeholder="e.g., BCA-1, Grade 12A, etc."
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <input 
                      name="password" 
                      type="text" 
                      className="form-input" 
                      defaultValue={editItem?.password || ''}
                      placeholder="Default: password123"
                    />
                     <p className="text-xs text-gray-500 mt-1">
                      {editItem ? 'Leave blank to keep current password' : 'Leave blank for default: password123'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="form-label">Name</label>
                    <input 
                      name="name" 
                      type="text" 
                      className="form-input" 
                      defaultValue={editItem?.name || ''}
                      required 
                    />
                  </div>
                  
                  {modalType === 'position' ? (
                    <>
                      <div>
                        <label className="form-label">Description</label>
                        <textarea 
                          name="description" 
                          className="form-input" 
                          rows="3"
                          defaultValue={editItem?.description || ''}
                        ></textarea>
                      </div>

                    </>
                  ) : (
                    <>
                      <div>
                        <label className="form-label">Class</label>
                        <input 
                          name="class" 
                          type="text" 
                          className="form-input" 
                          defaultValue={editItem?.class || ''}
                          placeholder="e.g., BCA-1, MBA-2A"
                          required 
                        />
                      </div>

                      <div>
                        <label className="form-label">Position</label>
                        <select 
                          name="positionId" 
                          className="form-input" 
                          defaultValue={editItem?.positionId || ''}
                          required
                        >
                          <option value="">Select Position</option>
                          {positions.map(pos => (
                            <option key={pos.id} value={pos.id}>{pos.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Bio</label>
                        <textarea 
                          name="bio" 
                          className="form-input" 
                          rows="3"
                          defaultValue={editItem?.bio || ''}
                        ></textarea>
                      </div>
                      <div>
                        <label className="form-label">Photo URL (optional)</label>
                        <input 
                          name="photoURL" 
                          type="url" 
                          className="form-input" 
                          defaultValue={editItem?.photoURL || ''}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditItem(null); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editItem ? 'Update' : 'Add'} {modalType === 'position' ? 'Position' : modalType === 'candidate' ? 'Candidate' : 'Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;