# 🔐 Firestore Security Rules Deployment Guide

## Overview
The election portal includes comprehensive Firestore security rules that enforce voting schedules at the database level, preventing students from bypassing time restrictions even if they manipulate the frontend.

## Key Security Features

### 🕐 Time-Based Voting Enforcement
- **Database-level schedule checking**: Rules read from `settings/electionConfig` to verify voting is active
- **Prevents bypass attempts**: Even if frontend is manipulated, database rejects out-of-schedule votes
- **Real-time validation**: Every vote creation is checked against current timestamp

### 🔒 Access Control
- **Admin-only operations**: Position/candidate management, results viewing
- **Student restrictions**: Can only vote during active periods, cannot read others' votes
- **Device tracking**: Enforces one-device-per-vote policy

## Deployment Instructions

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase (if not done)
```bash
firebase init firestore
```

### 4. Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

### 5. Verify Deployment
Check the Firebase Console → Firestore → Rules tab to confirm the rules are active.

## Rule Highlights

### Voting Schedule Enforcement
```javascript
function isVotingActive() {
  let config = get(/databases/$(database)/documents/settings/electionConfig).data;
  let now = request.time;
  return config.votingStart <= now && now <= config.votingEnd;
}
```

### Vote Creation Security
```javascript
allow create: if isAuthenticated() && 
                 !isAdmin() && 
                 isVotingActive() && // Must be during voting period
                 request.resource.data.voterId == getStudentId() && // Must match authenticated user
                 // Additional validation...
```

### Admin Protection
```javascript
function isAdmin() {
  return isAuthenticated() && 
         exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

## Testing the Rules

### 1. Test Schedule Enforcement
- Set voting schedule in admin panel
- Try voting before start time → Should be blocked
- Try voting after end time → Should be blocked
- Vote during active period → Should succeed

### 2. Test Admin Protection
- Try accessing admin features without admin account → Should be blocked
- Admin operations should only work with proper admin authentication

### 3. Test Vote Integrity
- Attempt to vote multiple times → Should be blocked by device tracking
- Try to modify vote data → Should be blocked by read-only vote rules

## Security Rule Structure

```
├── Helper Functions
│   ├── isAuthenticated() - Check if user is logged in
│   ├── isAdmin() - Verify admin privileges
│   ├── isVotingActive() - Check if voting is currently allowed
│   └── getStudentId() - Extract student ID from auth token
│
├── Collection Rules
│   ├── /admins/{adminId} - Admin account management
│   ├── /settings/{document} - Voting configuration
│   ├── /users/{studentId} - Student account data
│   ├── /positions/{positionId} - Election positions
│   ├── /candidates/{candidateId} - Candidate information
│   ├── /votes/{voteId} - Vote records (critical security)
│   └── /devices/{deviceId} - Device tracking
│
└── Default Deny - Block all other access
```

## Important Notes

⚠️ **Critical**: The voting schedule enforcement relies on server-side timestamp validation in Firestore rules. This cannot be bypassed by client-side manipulation.

✅ **Secure**: All vote operations are validated against the current server time and voting schedule configuration.

🔄 **Real-time**: Schedule changes take effect immediately without requiring application restart.

📊 **Audit Trail**: All database operations are logged by Firebase for security auditing.