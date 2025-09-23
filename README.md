# 🗳️ Student Council Election Portal

A comprehensive web-based election system for student council elections with secure voting, device tracking, and real-time results.

## ✨ Features

### 👨‍💼 Admin Features
- **Election Management**: Add/edit/delete positions and candidates
- **Voting Schedule**: Set voting start and end times
- **Student Data Management**: Upload students via Excel/CSV
- **Real-time Results**: View vote counts per position
- **Audit Logs**: Track who voted for whom
- **Export Results**: Download results as Excel/CSV

### 🎓 Student Features
- **Secure Login**: Student ID + password authentication
- **Schedule-based Voting**: Can only vote during scheduled times
- **Device Locking**: One device = one vote (prevents sharing)
- **Session Control**: Prevents multiple logins of same account
- **Mandatory Voting**: Must select ALL positions before submission
- **Auto-logout**: Automatic logout after voting

### 🔒 Security Features
- **Voting Schedule Enforcement**: Database-level time restrictions
- **Device Fingerprinting**: Unique device identification
- **Account Locking**: Prevents re-voting after submission
- **Session Management**: Single active session per account
- **Firestore Security Rules**: Database-level access control

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Firebase account
- Modern web browser

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Firebase**:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Create Firestore database
   - Copy your config and update `src/firebase.js`

3. **Deploy Firestore security rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📋 Setup Guide

### 1. Firebase Configuration
Update `src/firebase.js` with your Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 2. Create Admin Account
In Firebase Authentication, manually create an admin account, then add to Firestore:

**Collection**: `admins`
**Document ID**: `[admin-uid-from-auth]`
**Data**:
```json
{
  "name": "Admin Name",
  "email": "admin@school.edu",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 3. Upload Student Data
Prepare an Excel/CSV file with columns:
- `studentId`: Unique student identifier
- `name`: Student full name
- `class`: Student class/grade (e.g., BCA-1, MCA-1)
- `semester`: Semester information (optional, auto-detected for BCA/MCA)
- `password`: Login password (optional, defaults to 'password123')

### 4. Export Student Data
The admin portal provides multiple export options:
- **Export Credentials (by Semester)**: Exports all student credentials organized by semester
- **Export by Semester & Class**: Exports students organized by both semester and class combinations
- **Export Results (by Semester)**: Election results with student participation data organized by semester

## 🗃️ Database Structure

```
Firestore Collections:
├── users/           # Student accounts
├── admins/          # Admin accounts  
├── positions/       # Election positions
├── candidates/      # Candidates per position
├── votes/           # Cast votes (anonymous)
├── devices/         # Device tracking
└── settings/        # Election configuration (voting schedule)
```

### Election Schedule Configuration
The voting schedule is stored in `settings/electionConfig`:
```json
{
  "votingStart": "2025-09-21T09:00:00Z",
  "votingEnd": "2025-09-21T17:00:00Z",
  "updatedAt": "2025-09-20T12:00:00Z"
}
```

## 📅 Voting Schedule Features

### Admin Schedule Management
- Set specific start and end date/time for voting period
- Real-time status monitoring (not started/active/ended)
- Duration calculation and validation

### Student Schedule Enforcement
- **Before voting starts**: Students see "Voting has not started yet" message
- **During voting period**: Full voting access with countdown timer
- **After voting ends**: Students see "Voting has ended" message
- **Database-level enforcement**: Security rules prevent out-of-schedule votes

## 🔧 Tech Stack

- **Frontend**: React.js + Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth + Firestore)
- **Icons**: Lucide React
- **File Processing**: XLSX, PapaParse

---

**Made with ❤️ for democratic student elections**

# Election-Portal-2k25