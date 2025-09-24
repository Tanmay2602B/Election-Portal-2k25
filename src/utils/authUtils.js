import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Get total positions count for credit calculation
export const getTotalPositions = async () => {
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
export const getPositions = async () => {
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

// Check voting schedule
export const checkVotingSchedule = async () => {
  try {
    const scheduleDocRef = doc(db, 'settings', 'electionConfig');
    const scheduleDoc = await getDoc(scheduleDocRef);
    
    if (scheduleDoc.exists()) {
      const scheduleData = scheduleDoc.data();
      return scheduleData;
    }
    return null;
  } catch (error) {
    console.error('Error checking voting schedule:', error);
    return null;
  }
};

// Refresh voting schedule (force update)
export const refreshVotingSchedule = async () => {
  console.log('🔄 Refreshing voting schedule...');
  const updatedSchedule = await checkVotingSchedule();
  if (updatedSchedule) {
    console.log('✅ Voting schedule refreshed successfully');
  }
  return updatedSchedule;
};

// Check if voting is currently active
export const isVotingActive = (votingSchedule) => {
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
export const getVotingStatus = (votingSchedule) => {
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