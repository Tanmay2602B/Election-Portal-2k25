import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Vote, Users, Shield, Phone, Key, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { sendOTP, verifyOTP } from '../utils/otpUtils';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

function LoginPage() {
  const [isStudentLogin, setIsStudentLogin] = useState(true);
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [formData, setFormData] = useState({
    phoneNumber: '',
    studentId: '',
    adminId: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { loginWithOTP, forceLoginStudent } = useAuth();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const formatPhoneNumber = (phone) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Format as +1234567890 or similar
    return digits;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const phoneNumber = formatPhoneNumber(formData.phoneNumber);
      
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('Please enter a valid phone number');
      }

      if (isStudentLogin) {
        if (!formData.studentId) {
          throw new Error('Please enter your Student ID');
        }
        
        // Check if student exists and get their phone number
        const userDocRef = doc(db, 'users', formData.studentId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error('Student ID not found');
        }
        
        const userData = userDoc.data();
        
        // Check if phone number matches
        if (userData.phoneNumber && userData.phoneNumber !== phoneNumber) {
          throw new Error('Phone number does not match the registered number');
        }
        
        // Send OTP
        await sendOTP(phoneNumber, formData.studentId, 'student');
        setOtpSent(true);
        setStep('otp');
        setCountdown(60); // 60 seconds countdown
      } else {
        if (!formData.adminId) {
          throw new Error('Please enter your Admin ID');
        }
        
        // Check if admin exists
        const adminsQuery = query(collection(db, 'admins'), where('adminId', '==', formData.adminId));
        const adminsSnapshot = await getDocs(adminsQuery);
        
        if (adminsSnapshot.empty) {
          throw new Error('Admin ID not found');
        }
        
        const adminData = adminsSnapshot.docs[0].data();
        
        // Check if phone number matches
        if (adminData.phoneNumber && adminData.phoneNumber !== phoneNumber) {
          throw new Error('Phone number does not match the registered number');
        }
        
        // Send OTP
        await sendOTP(phoneNumber, formData.adminId, 'admin');
        setOtpSent(true);
        setStep('otp');
        setCountdown(60);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const phoneNumber = formatPhoneNumber(formData.phoneNumber);
      const otp = formData.otp.trim();
      
      if (!otp || otp.length !== 6) {
        throw new Error('Please enter a valid 6-digit OTP');
      }

      if (isStudentLogin) {
        // Verify OTP
        await verifyOTP(phoneNumber, otp, formData.studentId, 'student');
        
        // Login with OTP
        await loginWithOTP(formData.studentId, phoneNumber, 'student');
      } else {
        // Verify OTP
        await verifyOTP(phoneNumber, otp, formData.adminId, 'admin');
        
        // Login with OTP
        await loginWithOTP(formData.adminId, phoneNumber, 'admin');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      const phoneNumber = formatPhoneNumber(formData.phoneNumber);
      
      if (isStudentLogin) {
        await sendOTP(phoneNumber, formData.studentId, 'student');
      } else {
        await sendOTP(phoneNumber, formData.adminId, 'admin');
      }
      
      setCountdown(60);
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtpSent(false);
    setFormData({ ...formData, otp: '' });
    setError('');
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md card-shadow">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <Vote className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Election Portal
          </h1>
          <p className="text-gray-600">
            {isStudentLogin ? 'Student Portal' : 'Admin Portal'}
          </p>
        </div>

        {/* Login Type Toggle */}
        {step === 'phone' && (
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setIsStudentLogin(true);
                setFormData({ phoneNumber: '', studentId: '', adminId: '', otp: '' });
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
                setFormData({ phoneNumber: '', studentId: '', adminId: '', otp: '' });
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
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {otpSent && step === 'otp' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-green-700 text-sm">OTP sent successfully! Check your phone.</span>
          </div>
        )}

        {/* Phone Number Form */}
        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="form-label flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="form-input"
                placeholder="+1 234 567 8900"
                required
              />
            </div>

            {isStudentLogin ? (
              <div>
                <label className="form-label flex items-center">
                  <Users className="h-4 w-4 mr-2" />
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
                <label className="form-label flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin ID
                </label>
                <input
                  type="text"
                  name="adminId"
                  value={formData.adminId}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your admin ID"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="form-label flex items-center">
                <Key className="h-4 w-4 mr-2" />
                Enter OTP
              </label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                className="form-input text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength="6"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code sent to {formData.phoneNumber}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 btn-secondary"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={countdown > 0 || loading}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {/* Information */}
        <div className="mt-6 text-center">
          <div className="text-xs text-gray-500 space-y-1">
            {isStudentLogin ? (
              <>
                <p>• Secure OTP-based authentication</p>
                <p>• You can only vote once</p>
                <p>• One device per student</p>
              </>
            ) : (
              <>
                <p>• Secure OTP-based authentication</p>
                <p>• Contact system administrator for admin access</p>
                <p>• Manage elections, students, and voting schedule</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
