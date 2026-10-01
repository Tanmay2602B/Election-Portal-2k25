import api from './api';

/**
 * Fetch election winners using the public /votes/results endpoint.
 * This replaces the old approach of fetching raw /votes (admin-only)
 * and computing winners on the client.
 */
export async function getLastElectionWinners() {
  try {
    const res = await api.get('/votes/results');
    return res.data || [];
  } catch (error) {
    console.error('Error fetching election results:', error);
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
