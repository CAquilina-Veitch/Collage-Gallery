# Photo Collage App Setup Guide

This guide will help you set up and deploy your private photo sharing and collage creation app.

## Prerequisites

- Node.js and npm installed
- A Google/Gmail account
- A GitHub account (for deployment)

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" and follow the steps
3. Name your project (e.g., "photo-collage-app")

### 2. Enable Authentication

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Google" provider
5. Add your project support email
6. Save the changes

### 3. Set up Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Start in "production mode"
4. Choose your preferred region
5. Once created, go to "Rules" tab and replace with contents of `firestore.rules`

### 4. Set up Storage

1. Go to "Storage" in the left sidebar
2. Click "Get started"
3. Start in "production mode"
4. Choose your preferred region
5. Once created, go to "Rules" tab and replace with contents of `storage.rules`

### 5. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>)
4. Register your app with a nickname
5. Copy the Firebase config object

## App Configuration

### 1. Update Firebase Config

Edit `src/firebase/config.ts` and replace the config object with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

### 2. Update Allowed Emails

In `src/firebase/config.ts`, update the ALLOWED_EMAILS array:

```typescript
export const ALLOWED_EMAILS = [
  'your-actual-email@gmail.com',
  'your-girlfriend-actual-email@gmail.com'
];
```

### 3. Update Security Rules

Update the email addresses in both `firestore.rules` and `storage.rules` files to match your allowed emails.

## Local Development

1. Install dependencies:
```bash
cd photo-collage-app
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000)

## Deployment to GitHub Pages

### 1. Create GitHub Repository

1. Go to GitHub and create a new repository named "photo-collage-app"
2. Don't initialize with README (we already have the code)

### 2. Update Package.json

Edit `package.json` and update the homepage field:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/photo-collage-app"
```

### 3. Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/photo-collage-app.git
git push -u origin main
```

### 4. Deploy to GitHub Pages

```bash
npm run deploy
```

This will build and deploy your app to GitHub Pages.

### 5. Enable GitHub Pages

1. Go to your repository settings on GitHub
2. Scroll to "Pages" section
3. Source should be set to "Deploy from a branch"
4. Branch should be "gh-pages" and folder "/ (root)"
5. Save

Your app will be available at: `https://YOUR_USERNAME.github.io/photo-collage-app`

## Firebase Deployment

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Initialize Firebase

```bash
firebase login
firebase init
```

Select:
- Firestore (for rules)
- Storage (for rules)

### 3. Deploy Firebase Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Usage

1. **Sign In**: Use one of the whitelisted Google accounts to sign in
2. **Create Album**: Click "Create" after entering an album name
3. **Upload Photos**: In Gallery mode, click "Upload Photos" and select images
4. **Send to Collage**: Hover over photos and click "Send to Collage"
5. **Collage Mode**: Switch to Collage view to arrange photos
6. **Export**: Use the Export button to save as image or PDF

## Troubleshooting

- **Authentication Error**: Make sure your email is in the whitelist
- **Upload Failed**: Check Firebase Storage quota and rules
- **Real-time Sync Issues**: Verify Firestore rules and network connection
- **HEIC Conversion**: Some browsers may have issues with HEIC files

## Security Notes

- Only the two whitelisted emails can access the app
- All data is private to these two accounts
- Photos are stored in Firebase Storage with security rules
- Consider enabling Firebase App Check for additional security