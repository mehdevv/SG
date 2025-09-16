# Game Admin Dashboard

A comprehensive admin dashboard for managing players and quests in your 2D adventure game.

## Features

### 🔐 Authentication
- Secure admin login with Firebase Authentication
- Role-based access control
- Session management

### 📊 Dashboard Overview
- **Header**: Admin name and logout button
- **Leaderboard**: Top 5 players with rankings
- **Player Management**: Full CRUD operations for player accounts
- **Quest Management**: Create and assign quests to players

### 👥 Player Management
- View all registered players
- Add new players manually
- Edit player details:
  - Name, email, password
  - Skin selection
  - Coins (DZD), level, experience
- Delete players
- Real-time leaderboard updates

### 🎯 Quest Management
- Create custom quests
- Assign quests to specific players or all players
- Set quest rewards (XP and coins)
- Set quest deadlines
- Add verification requirements
- Edit and delete existing quests

## Firebase Setup Required

### 1. Firestore Collections
Create these collections in your Firebase Firestore:

#### `admin_users` Collection
```javascript
// Document ID: [admin_user_uid]
{
  role: "admin",
  email: "admin@example.com",
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

#### `quests` Collection
```javascript
// Document ID: [auto_generated]
{
  name: "Quest Name",
  description: "Quest description",
  xpReward: 100,
  coinsReward: 50,
  assignedPlayer: "player_uid" | null, // null for all players
  endTime: "2024-01-02T00:00:00.000Z",
  verificationName: "Screenshot",
  verificationLink: "https://example.com",
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### 2. Firestore Security Rules
Update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin access
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Regular user access to their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access to quests
    match /quests/{questId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 3. Create Admin User
1. Go to Firebase Authentication
2. Create a new user with email/password
3. Copy the user's UID
4. In Firestore, create a document in `admin_users` collection with the UID as document ID
5. Set the document data:
   ```javascript
   {
     role: "admin",
     adminfaouzi@gmail.com: "your-admin-email@example.com",
     createdAt: new Date().toISOString()
   }
   ```

## Installation

1. **Copy Files**: Place all files in your web server directory
2. **Configure Firebase**: Update the Firebase config in `index.html` if needed
3. **Set up Collections**: Create the required Firestore collections
4. **Create Admin User**: Follow the admin user creation steps above
5. **Deploy**: Upload to your web server

## Usage

### Login
1. Open the dashboard in your browser
2. Use your admin email and password to log in
3. The dashboard will load with current player and quest data

### Managing Players
- **View Players**: All registered players appear in the left panel
- **Add Player**: Click "Add Player" to create a new account
- **Edit Player**: Click "Edit" on any player to modify their details
- **Delete Player**: Click "Delete" to remove a player (with confirmation)

### Managing Quests
- **View Quests**: All active quests appear in the right panel
- **Add Quest**: Click "Add Quest" to create a new quest
- **Edit Quest**: Click "Edit" on any quest to modify it
- **Delete Quest**: Click "Delete" to remove a quest (with confirmation)

### Leaderboard
- Automatically shows top 5 players by level and experience
- Updates in real-time when player data changes
- Displays player avatar, name, and level

## File Structure

```
admin dashboard/
├── index.html          # Main HTML structure
├── style.css           # Styling and responsive design
├── script.js           # JavaScript functionality
└── README.md           # This documentation
```

## Security Notes

- Admin authentication is required for all operations
- Firestore security rules prevent unauthorized access
- All admin operations are logged in the browser console
- Player passwords are handled securely through Firebase Auth

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile responsive design

## Troubleshooting

### Common Issues

1. **Login Fails**: Check if admin user exists in `admin_users` collection
2. **Permission Denied**: Verify Firestore security rules
3. **Data Not Loading**: Check browser console for Firebase errors
4. **Modal Not Opening**: Ensure JavaScript is enabled

### Console Logs
The dashboard provides detailed console logging for debugging:
- ✅ Success operations
- ❌ Error operations
- 📊 Data loading status
- 👤 Authentication events

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Firebase configuration and permissions
3. Ensure all required collections exist in Firestore
