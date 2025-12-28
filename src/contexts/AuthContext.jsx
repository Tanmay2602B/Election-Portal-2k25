import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { generateDeviceFingerprint } from '../utils/deviceUtils';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState(null);
  const [votingSchedule, setVotingSchedule] = useState(null);

  // Check voting schedule
  const checkVotingSchedule = async () => {
    try {
      const scheduleDocRef = doc(db, 'settings', 'electionConfig');
      const scheduleDoc = await getDoc(scheduleDocRef);
      
      if (scheduleDoc.exists()) {
        const scheduleData = scheduleDoc.data();
        setVotingSchedule(scheduleData);
        return scheduleData;
      }
      return null;
    } catch (error) {
      console.error('Error checking voting schedule:', error);
      return null;
    }
  };

  // Refresh voting schedule (force update)
  const refreshVotingSchedule = async () => {
    console.log('🔄 Refreshing voting schedule...');
    const updatedSchedule = await checkVotingSchedule();
    if (updatedSchedule) {
      console.log('✅ Voting schedule refreshed successfully');
    }
    return updatedSchedule;
  };

  // Check if voting is currently active
  const isVotingActive = () => {
    if (!votingSchedule) return false;
    
    // First check the manual isActive flag
    if (!votingSchedule.isActive) return false;
    
    const now = new Date();
    const start = votingSchedule.votingStart ? new Date(votingSchedule.votingStart.seconds * 1000) : null;
    const end = votingSchedule.votingEnd ? new Date(votingSchedule.votingEnd.seconds * 1000) : null;
    
    if (!start || !end) return false;
    
    return now >= start && now <= end;
  };

  // Get voting status message with countdown
  const getVotingStatus = () => {
    if (!votingSchedule) {
      return { status: 'not_scheduled', message: 'Voting schedule has not been set.' };
    }
    
    // Check if voting is manually disabled
    if (!votingSchedule.isActive) {
      return { status: 'disabled', message: 'Voting is currently disabled by the administrator.' };
    }
    
    const now = new Date();
    const start = votingSchedule.votingStart ? new Date(votingSchedule.votingStart.seconds * 1000) : null;
    const end = votingSchedule.votingEnd ? new Date(votingSchedule.votingEnd.seconds * 1000) : null;
    
    if (!start || !end) {
      return { status: 'not_scheduled', message: 'Voting schedule has not been set.' };
    }
    
    if (now < start) {
      const timeToStart = start.getTime() - now.getTime();
      return { 
        status: 'not_started', 
        message: `Voting will begin at ${start.toLocaleString()}`,
        startTime: start,
        timeRemaining: timeToStart,
        countdown: true
      };
    }
    
    if (now > end) {
      return { 
        status: 'ended', 
        message: `Voting ended at ${end.toLocaleString()}`,
        endTime: end
      };
    }
    
    const timeToEnd = end.getTime() - now.getTime();
    return { 
      status: 'active', 
      message: `Voting is active until ${end.toLocaleString()}`,
      endTime: end,
      timeRemaining: timeToEnd,
      countdown: true
    };
  };

  // Get total positions count for credit calculation
  const getTotalPositions = async () => {
    try {
      const positionsQuery = query(collection(db, 'positions'), orderBy('name'));
      const positionsSnapshot = await getDocs(positionsQuery);
      return positionsSnapshot.docs.length;
    } catch (error) {
      console.error('Error getting total positions:', error);
      return 0;
    }
  };

  // Get positions data
  const getPositions = async () => {
    try {
      const positionsQuery = query(collection(db, 'positions'), orderBy('name'));
      const positionsSnapshot = await getDocs(positionsQuery);
      return positionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting positions:', error);
      return [];
    }
  };
  // Initialize device fingerprint and load voting schedule
  useEffect(() => {
    const initDeviceId = async () => {
      const id = await generateDeviceFingerprint();
      setDeviceId(id);
    };
    initDeviceId();
    checkVotingSchedule();
  }, []);

  // Temporary helper function to add test students (for debugging)

  // Login with OTP (for both students and admins)
  const loginWithOTP = async (userId, phoneNumber, userType = 'student') => {
    try {
      if (userType === 'student') {
        // Check if user exists in Firestore
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error('Student ID not found');
        }
        
        const userData = userDoc.data();
        
        // Verify phone number matches
        if (userData.phoneNumber && userData.phoneNumber !== phoneNumber) {
          throw new Error('Phone number does not match');
        }
        
        // Update phone number if not set
        if (!userData.phoneNumber) {
          await updateDoc(userDocRef, {
            phoneNumber: phoneNumber
          });
        }
        
        // Check if already voted
        if (userData.hasVoted) {
          throw new Error('You have already voted and cannot login again');
        }
        
        // Check if already logged in on another device
        if (userData.isLoggedIn) {
          throw new Error('Account is already logged in on another device');
        }
        
        // Check if this specific student has already used this device
        if (deviceId) {
          const deviceRef = doc(db, 'devices', `${deviceId}_${userId}`);
          const deviceDoc = await getDoc(deviceRef);
          
          if (deviceDoc.exists() && deviceDoc.data().used) {
            throw new Error('You have already used this device for voting');
          }
        }
        
        // Update user login status in Firestore
        await updateDoc(userDocRef, {
          isLoggedIn: true,
          deviceId: deviceId,
          lastLoginTime: new Date(),
          phoneNumber: phoneNumber
        });
        
        // Set user profile
        const studentProfile = {
          ...userData,
          phoneNumber: phoneNumber,
          isStudent: true
        };
        setUserProfile(studentProfile);
        
        // Set a mock currentUser for students to satisfy routing logic
        setCurrentUser({ uid: userId, isStudent: true });
      } else {
        // Admin login with OTP
        const adminsQuery = query(collection(db, 'admins'), where('adminId', '==', userId));
        const adminsSnapshot = await getDocs(adminsQuery);
        
        if (adminsSnapshot.empty) {
          throw new Error('Admin ID not found');
        }
        
        const adminData = adminsSnapshot.docs[0].data();
        const adminUid = adminsSnapshot.docs[0].id;
        
        // Verify phone number matches
        if (adminData.phoneNumber && adminData.phoneNumber !== phoneNumber) {
          throw new Error('Phone number does not match');
        }
        
        // Update phone number if not set
        if (!adminData.phoneNumber) {
          await updateDoc(doc(db, 'admins', adminUid), {
            phoneNumber: phoneNumber
          });
        }
        
        // For admin, we still use Firebase Auth but with a custom token approach
        // For now, we'll set the profile directly
        setUserProfile({ ...adminData, phoneNumber: phoneNumber, isAdmin: true });
        setCurrentUser({ uid: adminUid, isAdmin: true });
      }
    } catch (error) {
      throw error;
    }
  };

  // Legacy student login (kept for backward compatibility, but deprecated)
  const loginStudent = async (studentId, password) => {
    throw new Error('Password login is no longer supported. Please use OTP authentication.');
  };

  // Force login for students (clears previous session)
  const forceLoginStudent = async (studentId, password) => {
    console.log('forceLoginStudent called with:', { studentId, password });
    
    try {
      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userDocRef);
      
      console.log('User document exists:', userDoc.exists());
      
      if (!userDoc.exists()) {
        throw new Error('Student ID not found');
      }
      
      const userData = userDoc.data();
      console.log('User data:', userData);
      
      // Check password
      if (userData.password !== password) {
        throw new Error('Invalid password');
      }
      
      // Check if already voted
      if (userData.hasVoted) {
        throw new Error('You have already voted and cannot login again');
      }
      
      // Check if this specific student has already used this device
      if (deviceId) {
        const deviceRef = doc(db, 'devices', `${deviceId}_${studentId}`);
        const deviceDoc = await getDoc(deviceRef);
        
        if (deviceDoc.exists() && deviceDoc.data().used) {
          throw new Error('You have already used this device for voting');
        }
      }
      
      // Force clear previous session and login
      console.log('Updating user login status...');
      await updateDoc(userDocRef, {
        isLoggedIn: true,
        deviceId: deviceId,
        lastLoginTime: new Date()
      });
      
      // Set user profile
      const studentProfile = {
        ...userData,
        isStudent: true
      };
      
      setUserProfile(studentProfile);
      
      // Set a mock currentUser for students to satisfy routing logic
      setCurrentUser({ uid: studentId, isStudent: true });
      
    } catch (error) {
      console.error('forceLoginStudent error:', error);
      throw error;
    }
  };

  // Legacy admin login (kept for backward compatibility, but deprecated)
  const loginAdmin = async (email, password) => {
    throw new Error('Password login is no longer supported. Please use OTP authentication.');
  };

  // Logout
  const logout = async () => {
    try {
      if (userProfile && !userProfile.isAdmin) {
        // Update student logout status in Firestore
        const userDocRef = doc(db, 'users', userProfile.studentId);
        await updateDoc(userDocRef, {
          isLoggedIn: false,
          deviceId: null
        });
      }
      
      // Only sign out from Firebase Auth if user is admin
      if (userProfile && userProfile.isAdmin) {
        await signOut(auth);
      }
      
      setUserProfile(null);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear the local state
      setUserProfile(null);
      setCurrentUser(null);
    }
  };

  // Submit vote and lock account
  const submitVote = async (votes) => {
    try {
      if (!userProfile || userProfile.isAdmin) {
        throw new Error('Invalid user session');
      }
      
      // Check if voting is active
      if (!isVotingActive()) {
        const status = getVotingStatus();
        throw new Error(`Voting is not currently active. ${status.message}`);
      }
      
      const studentId = userProfile.studentId;
      const timestamp = new Date();
      
      // Save votes
      const votePromises = votes.map(vote => {
        const voteRef = doc(collection(db, 'votes'));
        return setDoc(voteRef, {
          positionId: vote.positionId,
          candidateId: vote.candidateId,
          voterId: studentId,
          deviceId: deviceId,
          timestamp: timestamp
        });
      });
      
      await Promise.all(votePromises);
      
      // Mark user as voted and logout
      const userDocRef = doc(db, 'users', studentId);
      await updateDoc(userDocRef, {
        hasVoted: true,
        isLoggedIn: false,
        voteTimestamp: timestamp
      });
      
      // Mark device as used by this specific student
      if (deviceId) {
        const deviceRef = doc(db, 'devices', `${deviceId}_${studentId}`);
        await setDoc(deviceRef, {
          deviceId: deviceId,
          used: true,
          usedBy: studentId,
          timestamp: timestamp
        });
      }
      
      // Force logout
      setUserProfile(null);
      setCurrentUser(null);
      
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only handle Firebase Auth for admin users, don't interfere with student auth
      if (user) {
        // This is a Firebase Auth user (admin)
        setCurrentUser(user);
        
        if (!userProfile) {
          try {
            // Check if admin
            const adminDocRef = doc(db, 'admins', user.uid);
            const adminDoc = await getDoc(adminDocRef);
            
            if (adminDoc.exists()) {
              setUserProfile({ ...adminDoc.data(), isAdmin: true });
            }
          } catch (error) {
            console.error('Error fetching admin profile:', error);
          }
        }
      } else {
        // No Firebase Auth user - only clear if it's not a student
        if (!userProfile || !userProfile.isStudent) {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);

  const value = {
    currentUser,
    userProfile,
    loginWithOTP,
    loginStudent,
    forceLoginStudent,
    loginAdmin,
    logout,
    submitVote,
    deviceId,
    votingSchedule,
    isVotingActive,
    getVotingStatus,
    checkVotingSchedule,
    refreshVotingSchedule,
    getTotalPositions,
    getPositions
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}