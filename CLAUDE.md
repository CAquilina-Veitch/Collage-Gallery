# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Photo Collage App - a private, mobile-first React application for photo sharing and collaborative collage creation with Firebase backend. The app features Google authentication with whitelisted users, real-time sync, and export capabilities.

## Essential Commands

### Development
```bash
cd photo-collage-app
npm start              # Start development server on port 3000
npm run build         # Build production bundle
npm test              # Run test suite
```

### Deployment
```bash
npm run deploy        # Build and deploy to GitHub Pages
npm run firebase:deploy-rules  # Deploy Firestore and Storage security rules
```

### Firebase Operations
```bash
npm run firebase:login         # Authenticate with Firebase
npm run firebase:init          # Initialize Firebase in project
```

## Architecture

### Core Technology Stack
- **Frontend**: React 19 with TypeScript, React Router (HashRouter for GitHub Pages compatibility)
- **Styling**: Tailwind CSS
- **State Management**: React Context API (AuthContext)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Animation**: Framer Motion
- **Export**: html2canvas (image), jsPDF (PDF)
- **Image Processing**: heic2any for HEIC to JPEG conversion

### Key Architectural Patterns

1. **Authentication Flow**:
   - Google Sign-In restricted to whitelisted emails in `src/firebase/config.ts`
   - AuthContext provides user state across the app
   - PrivateRoute component wraps protected routes

2. **Data Structure**:
   - Albums stored in Firestore at `/albums/{albumId}`
   - Photos metadata in `/albums/{albumId}/photos/{photoId}`
   - Collage items in `/albums/{albumId}/collageItems/{itemId}`
   - Photo files stored in Firebase Storage at `/photos/{albumId}/{filename}`

3. **Real-time Collaboration**:
   - Firestore listeners for live collage updates
   - Optimistic UI updates with server sync
   - Conflict resolution through Firestore transactions

4. **Mobile Gesture Handling**:
   - Custom touch event handlers for drag, pinch-to-zoom, rotation
   - Separate mobile and desktop interaction patterns in CollageView

## Critical Files

- `src/firebase/config.ts` - Firebase configuration and email whitelist
- `src/components/CollageView.tsx` - Core collage functionality with gesture handling
- `src/contexts/AuthContext.tsx` - Authentication state management
- `firestore.rules` - Database security rules
- `storage.rules` - Storage security rules

## Development Notes

- Working directory is at root level, but main app is in `photo-collage-app/` subdirectory
- Uses HashRouter for GitHub Pages compatibility
- Deployed to: https://caquilina-veitch.github.io/Collage-Gallery
- Authorized users are defined in ALLOWED_EMAILS array
- All Firebase operations use explicit node_modules paths in package.json scripts