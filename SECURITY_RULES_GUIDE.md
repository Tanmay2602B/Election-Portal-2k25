# Firestore Security Rules Implementation Guide

## Overview
This document provides comprehensive Firestore security rules that enforce time-based voting control and prevent unauthorized access to the election system.

## Key Security Features

### 1. Time-Based Voting Control
- **Manual Control**: `isActive` flag in `settings/electionConfig` must be `true`
- **Scheduled Control**: Current time must be between `votingStart` and `votingEnd`
- **Double Protection**: Both conditions must be met for voting to be allowed

### 2. User Authentication & Authorization
- **Admin Access**: Full read/write access to all collections
- **Student Access**: Limited to reading their own data and creating votes during active periods
- **Guest Access**: Can only read positions, candidates, and voting settings

### 3. Vote Integrity
- **One Vote Per Student**: Validates user hasn't already voted
- **One Vote Per Device**: Tracks device usage to prevent multiple votes
- **Immutable Votes**: Once created, votes cannot be modified or deleted
- **Timestamp Validation**: All votes must include valid timestamps

### 4. Data Validation
- **Required Fields**: Enforces presence of mandatory fields in vote records
- **Type Checking**: Validates data types for all fields
- **User Status**: Checks if user is logged in and eligible to vote

## Implementation Steps

### Step 1: Deploy Security Rules
1. Copy the rules from `FIRESTORE_SECURITY_RULES.txt`
2. Go to Firebase Console → Firestore Database → Rules
3. Replace existing rules with the new comprehensive rules
4. Test the rules using the Firebase Rules Playground

### Step 2: Update Authentication System
The current system uses Firestore-based authentication for students. To fully utilize these security rules, you may need to implement custom claims:

```javascript
// In your admin functions, set custom claims for students
await admin.auth().setCustomUserClaims(uid, { 
  studentId: 'S101',
  isStudent: true 
});
```

### Step 3: Voting Flow Validation

#### Admin Controls
```javascript
// Start voting
await setDoc(doc(db, 'settings', 'electionConfig'), {
  votingStart: new Date(),
  votingEnd: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
  isActive: true,
  enableDepartmentalVoting: false,
  allowCrossDepartmentVoting: true
});

// End voting
await updateDoc(doc(db, 'settings', 'electionConfig'), {
  votingEnd: new Date(),
  isActive: false
});
```

#### Student Voting
```javascript
// Vote submission (automatically validated by security rules)
const voteData = {
  positionId: 'position123',
  candidateId: 'candidate456',
  voterId: userProfile.studentId,
  deviceId: deviceFingerprint,
  timestamp: new Date()
};

await addDoc(collection(db, 'votes'), voteData);
```

## Security Rule Functions Explained

### `isVotingActive()`
Combines multiple checks:
- Settings document exists
- `isActive` flag is true
- Current time is within voting window
- Start and end times are properly set

### `isValidStudent(studentId)`
Validates student eligibility:
- Student record exists
- Student hasn't voted yet
- Student is currently logged in

### `hasUserVoted(studentId)`
Prevents double voting by checking:
- User's `hasVoted` flag
- Existing vote records

## Error Handling

### Common Security Rule Violations
1. **"Permission denied"** - User lacks required permissions
2. **"Voting not active"** - Time-based restrictions in effect
3. **"User already voted"** - Double voting attempt
4. **"Invalid device"** - Device already used for voting

### Testing Security Rules
Use Firebase Rules Playground to test scenarios:
```javascript
// Test voting during inactive period
request: {
  auth: { uid: 'student123', token: { studentId: 'S101' } },
  time: timestamp.date(2025, 1, 1), // Before voting starts
}

// Test admin access
request: {
  auth: { uid: 'admin123' },
  resource: { data: { /* admin operation */ } }
}
```

## Best Practices

### 1. Regular Monitoring
- Monitor vote counts vs. registered students
- Check for suspicious device patterns
- Audit admin actions

### 2. Backup Procedures
- Regular database backups before elections
- Export results immediately after voting ends
- Maintain audit logs

### 3. Performance Considerations
- Index frequently queried fields
- Optimize security rule queries
- Monitor read/write operations

## Troubleshooting

### Issue: Students can't vote despite active voting
**Check:**
1. `isActive` flag in settings
2. Current time vs. voting window
3. Student's `hasVoted` and `isLoggedIn` status
4. Device hasn't been used before

### Issue: Admins can't access data
**Check:**
1. Admin record exists in `/admins/{uid}`
2. Proper authentication state
3. Firebase Auth UID matches admin document ID

### Issue: Vote submission fails
**Check:**
1. All required fields present
2. Correct data types
3. Valid timestamp
4. Student eligibility

## Migration Notes

If upgrading from a less secure system:
1. Backup all existing data
2. Gradually roll out new rules
3. Test with a small group first
4. Monitor for unexpected access denials
5. Have rollback plan ready

## Security Audit Checklist

- [ ] Only admins can modify positions and candidates
- [ ] Students can only vote during active periods
- [ ] Votes are immutable once created
- [ ] Device tracking prevents multiple votes
- [ ] Time-based restrictions are enforced
- [ ] User authentication is properly validated
- [ ] Audit logs are protected
- [ ] Settings can only be modified by admins
- [ ] No unauthorized data access possible