import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Fetch last election winners
 * Returns winners for each position based on vote counts
 */
export async function getLastElectionWinners() {
  try {
    // Get all positions
    const positionsQuery = query(collection(db, 'positions'), orderBy('name'));
    const positionsSnapshot = await getDocs(positionsQuery);
    const positions = positionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all candidates
    const candidatesQuery = query(collection(db, 'candidates'), orderBy('name'));
    const candidatesSnapshot = await getDocs(candidatesQuery);
    const candidates = candidatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all votes
    const votesQuery = query(collection(db, 'votes'), orderBy('timestamp', 'desc'));
    const votesSnapshot = await getDocs(votesQuery);
    const votes = votesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate winners for each position
    const winners = positions.map(position => {
      const positionVotes = votes.filter(vote => vote.positionId === position.id);
      const positionCandidates = candidates.filter(c => c.positionId === position.id);
      
      // Count votes per candidate
      const candidateVoteCounts = positionCandidates.map(candidate => {
        const candidateVotes = positionVotes.filter(vote => vote.candidateId === candidate.id);
        return {
          candidate: candidate,
          votes: candidateVotes.length,
          percentage: positionVotes.length > 0 
            ? ((candidateVotes.length / positionVotes.length) * 100).toFixed(1)
            : 0
        };
      });

      // Sort by votes descending
      candidateVoteCounts.sort((a, b) => b.votes - a.votes);

      // Get winner (candidate with most votes)
      const winner = candidateVoteCounts.length > 0 && candidateVoteCounts[0].votes > 0
        ? candidateVoteCounts[0]
        : null;

      return {
        position: position,
        winner: winner,
        totalVotes: positionVotes.length,
        allCandidates: candidateVoteCounts
      };
    }).filter(result => result.winner !== null); // Only include positions with winners

    return winners;
  } catch (error) {
    console.error('Error fetching last election winners:', error);
    return [];
  }
}

import { doc, getDoc } from 'firebase/firestore';

/**
 * Get upcoming elections from voting schedule
 */
export async function getUpcomingElections() {
  try {
    const scheduleDocRef = doc(db, 'settings', 'electionConfig');
    const scheduleDoc = await getDoc(scheduleDocRef);
    
    if (scheduleDoc.exists()) {
      return scheduleDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching upcoming elections:', error);
    return null;
  }
}

