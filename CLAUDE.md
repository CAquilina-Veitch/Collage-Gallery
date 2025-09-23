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

## Recent UI Improvements (September 2025)

### Changes Made:
1. **Top Toolbar Reorganization**:
   - Album name moved from floating elements to top toolbar (left of Gallery/Collage buttons)
   - Upload Photos button moved from Gallery view to top toolbar (shows only in Gallery mode)
   - Export button remains in top toolbar (shows only in Collage mode)

2. **Sidebar Fixes**:
   - Fixed overflow issues with proper containment (`overflow-hidden`, `flex-shrink-0`)
   - Album creation section no longer leaks into main content

3. **Gallery View Improvements**:
   - Added photo selection on tap/click (shows selected with blue ring)
   - Bottom toolbar appears when photo is selected with actions:
     - Send to Collage / Remove from Collage
     - Download

4. **Collage View Improvements**:
   - Settings panel converted from floating modal to fixed bottom toolbar
   - Removed overlay background for better mobile experience
   - Tap on photo shows settings in bottom toolbar (not floating window)

### Deployment Notes:
- **IMPORTANT**: GitHub Pages must be configured to serve from `gh-pages` branch, NOT master
- The `gh-pages` branch contains only built files (created by `npm run deploy`)
- The `master` branch contains source code
- If deployment shows old version, check GitHub Settings → Pages → Source is set to `gh-pages`

### Known State:
- Upload functionality lifted to App.tsx and passed as props to GalleryView
- File input ref and uploading state managed at App level
- Bottom toolbars implemented for both Gallery (photo selection) and Collage (settings)

## Latest Fixes (December 2025)

### Mobile Touch Issues Resolved:
1. **Gallery View Touch Detection**:
   - Removed conflicting event handlers and pointer-events-none
   - Added `touch-action: manipulation` for better mobile response
   - Photos now properly selectable on mobile devices

2. **Collage View Touch Detection**:
   - Removed `touch-none` class that was blocking all touch events
   - Fixed pointer-events on images
   - Added debug overlay for touch event monitoring (can be toggled)

3. **Bottom Toolbar Positioning Fix**:
   - Used React Portal to render toolbar outside component tree
   - Toolbar now properly fixed to device screen (not canvas)
   - Renders directly to document.body with position:fixed
   - Implementation in CollageView.tsx using `ReactDOM.createPortal`

4. **Export Functionality**:
   - Export button now has proper dropdown toggle
   - Dropdown closes after selecting export option
   - Canvas properly targeted with `id="collage-export-canvas"`
   - Note: CrossOrigin attribute removed from images due to Firebase Storage CORS limitations
   - Export uses html2canvas with `useCORS: true` and `allowTaint: false`

### Critical Implementation Details:

#### React Portal for Fixed Bottom Toolbar:
```jsx
{showSettings && selectedItem && ReactDOM.createPortal(
  <div style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99999
  }}>
    {/* Settings content */}
  </div>,
  document.body
)}
```

#### CollageView Positioning:
- Changed from `absolute inset-0` to `relative h-full` to prevent covering top toolbar
- Canvas has `id="collage-export-canvas"` for export targeting

### Batch Files Created:
- `dev.bat` - Start development server
- `deploy.bat` - Full deployment with git checks
- `deploy-quick.bat` - Quick deployment without prompts

### Important NPM Note:
- NPM commands often timeout when run through Claude
- Always provide commands for user to run manually
- Do not attempt to run npm commands directly in production deployments