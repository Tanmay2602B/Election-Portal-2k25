import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Generate a 6-digit OTP
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to user (store in Firestore)
 * In production, you would integrate with SMS service like Twilio, AWS SNS, etc.
 */
export async function sendOTP(phoneNumber, userId, userType = 'student') {
  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
    // Store OTP in Firestore
    const otpRef = doc(db, 'otps', `${userType}_${userId}`);
    await setDoc(otpRef, {
      otp: otp,
      phoneNumber: phoneNumber,
      userId: userId,
      userType: userType,
      expiresAt: expiresAt,
      createdAt: serverTimestamp(),
      verified: false
    });

    // In production, send SMS here using a service like Twilio
    // For now, we'll return the OTP (remove this in production!)
    console.log(`OTP for ${phoneNumber}: ${otp}`);
    
    return { success: true, otp: otp }; // Remove otp from return in production
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP. Please try again.');
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(phoneNumber, otp, userId, userType = 'student') {
  try {
    const otpRef = doc(db, 'otps', `${userType}_${userId}`);
    const otpDoc = await getDoc(otpRef);
    
    if (!otpDoc.exists()) {
      throw new Error('OTP not found. Please request a new OTP.');
    }
    
    const otpData = otpDoc.data();
    const expiresAt = otpData.expiresAt?.toDate ? otpData.expiresAt.toDate() : new Date(otpData.expiresAt);
    
    // Check if OTP is expired
    if (new Date() > expiresAt) {
      throw new Error('OTP has expired. Please request a new OTP.');
    }
    
    // Check if OTP is already verified
    if (otpData.verified) {
      throw new Error('OTP has already been used. Please request a new OTP.');
    }
    
    // Check if phone number matches
    if (otpData.phoneNumber !== phoneNumber) {
      throw new Error('Invalid phone number.');
    }
    
    // Verify OTP
    if (otpData.otp !== otp) {
      throw new Error('Invalid OTP. Please check and try again.');
    }
    
    // Mark OTP as verified
    await updateDoc(otpRef, {
      verified: true,
      verifiedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs() {
  try {
    // This would require a Cloud Function in production
    // For now, we'll handle expiry during verification
    console.log('OTP cleanup - handled during verification');
  } catch (error) {
    console.error('Error cleaning up OTPs:', error);
  }
}

