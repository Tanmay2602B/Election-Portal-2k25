import api from './api';

/**
 * Fetch last election winners
 * Returns winners for each position based on vote counts
 */
export async function getLastElectionWinners() {
  try {
    const [positionsRes, candidatesRes, votesRes] = await Promise.all([
      api.get('/positions'),
      api.get('/candidates'),
      api.get('/votes')
    ]);

    const positions = positionsRes.data || [];
    const candidates = candidatesRes.data || [];
    const votes = votesRes.data || [];

    // Calculate winners for each position
    const winners = positions.map(position => {
      const positionId = position._id || position.id;
      const positionVotes = votes.filter(vote => vote.positionId === positionId);
      const positionCandidates = candidates.filter(c => c.positionId === positionId);

      // Count votes per candidate
      const candidateVoteCounts = positionCandidates.map(candidate => {
        const candidateId = candidate._id || candidate.id;
        const candidateVotes = positionVotes.filter(vote => vote.candidateId === candidateId);
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

/**
 * Get upcoming elections from voting schedule
 */
export async function getUpcomingElections() {
  try {
    const res = await api.get('/settings/votingSchedule');
    if (res.data) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching upcoming elections:', error);
    return null;
  }
}

