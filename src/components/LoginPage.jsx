import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Vote, Users, Shield } from 'lucide-react';

function LoginPage() {
  const [isStudentLogin, setIsStudentLogin] = useState(true);
  const [formData, setFormData] = useState({
    studentId: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForceLogin, setShowForceLogin] = useState(false);
  const { loginStudent, forceLoginStudent, loginAdmin } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isStudentLogin) {
        if (!formData.studentId || !formData.password) {
          throw new Error('Please fill in all fields');
        }
        await loginStudent(formData.studentId, formData.password);
      } else {
        if (!formData.email || !formData.password) {
          throw new Error('Please fill in all fields');
        }
        await loginAdmin(formData.email, formData.password);
      }
    } catch (error) {
      if (error.message === 'Student ID not found' && isStudentLogin) {
        setError('Student ID not found. Please check your credentials or contact the administrator.');
      } else if (error.message === 'Account is already logged in on another device' && isStudentLogin) {
        setShowForceLogin(true);
        setError('Account is already logged in. Click "Force Login" to clear previous session.');
      } else if (!isStudentLogin && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.message.includes('Access denied'))) {
        // Admin authentication failed - show a simpler error message
        setError('Admin account not found. Please contact the system administrator.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogin = async () => {
    if (!formData.studentId || !formData.password) {
      setError('Please fill in Student ID and Password first');
      return;
    }

    setLoading(true);
    setError(''); // Clear previous errors
    
    try {
      await forceLoginStudent(formData.studentId, formData.password);
      setShowForceLogin(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md card-shadow">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Vote className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Student Council Election
          </h1>
          <p className="text-gray-600">
            {isStudentLogin ? 'Student Portal' : 'Admin Portal'}
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setIsStudentLogin(true);
              setFormData({ studentId: '', email: '', password: '' });
              setError('');
            }}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isStudentLogin
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Student
          </button>
          <button
            type="button"
            onClick={() => {
              setIsStudentLogin(false);
              setFormData({ studentId: '', email: '', password: '' });
              setError('');
            }}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isStudentLogin
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isStudentLogin ? (
            <div>
              <label className="form-label">
                Student ID
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your student ID"
                required
              />
            </div>
          ) : (
            <div>
              <label className="form-label">
                Admin Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your admin email"
                required
              />
            </div>
          )}

          <div>
            <label className="form-label">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Force Login Helper */}
        {isStudentLogin && showForceLogin && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="font-medium text-yellow-800">Session Conflict</span>
            </div>
            <p className="text-yellow-700 text-sm mb-3">
              Your account shows as logged in elsewhere. This can happen if the browser was closed without proper logout.
            </p>
            <button
              onClick={handleForceLogin}
              disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Clearing Session...' : 'Force Login (Clear Previous Session)'}
            </button>
            <p className="text-xs text-yellow-600 mt-2">
              This will clear your previous session and log you in on this device.
            </p>
          </div>
        )}

        {/* Information */}
        <div className="mt-6 text-center">
          <div className="text-xs text-gray-500 space-y-1">
            {isStudentLogin ? (
              <>
                <p>• You can only vote once</p>
                <p>• One device per student</p>
              </>
            ) : (
              <>
                <p>• Contact system administrator for admin access</p>
                <p>• Manage elections, students, and voting schedule</p>
                <p>• View real-time results and audit logs</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;