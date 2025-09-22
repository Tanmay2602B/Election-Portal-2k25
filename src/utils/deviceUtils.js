// Device fingerprinting utility
export const generateDeviceFingerprint = async () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const canvasFingerprint = canvas.toDataURL();
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvasFingerprint.substring(0, 100), // First 100 chars
      cookieEnabled: navigator.cookieEnabled,
      localStorageEnabled: !!window.localStorage,
      sessionStorageEnabled: !!window.sessionStorage
    };
    
    // Generate a hash from the fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Store in localStorage for consistency across sessions on same device
    const existingDeviceId = localStorage.getItem('deviceId');
    if (existingDeviceId) {
      return existingDeviceId;
    }
    
    localStorage.setItem('deviceId', hashHex);
    return hashHex;
    
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to random ID
    const fallbackId = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', fallbackId);
    return fallbackId;
  }
};

export const getStoredDeviceId = () => {
  return localStorage.getItem('deviceId');
};

export const clearDeviceId = () => {
  localStorage.removeItem('deviceId');
};