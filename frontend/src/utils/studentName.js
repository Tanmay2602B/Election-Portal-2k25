export const normalizeStudentName = (name) =>
  String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

export const generateVoterId = (reservedIds = new Set()) => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generation is unavailable in this browser.');
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let voterId = '';
  do {
    const chars = [];
    while (chars.length < 6) {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte >= 252) continue;
        chars.push(alphabet[byte % alphabet.length]);
        if (chars.length === 6) break;
      }
    }
    voterId = chars.join('');
  } while (reservedIds.has(voterId));
  reservedIds.add(voterId);
  return voterId;
};
