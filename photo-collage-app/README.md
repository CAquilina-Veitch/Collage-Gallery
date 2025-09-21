# Photo Collage App

A mobile-friendly web application for private photo sharing and collaborative collage creation, built with React, TypeScript, and Firebase.

## Features

- 🔒 **Private Access**: Google Sign-In with email whitelist (only 2 authorized users)
- 📸 **Photo Management**: Upload, organize photos in albums with automatic HEIC to JPEG conversion
- 🎨 **Collage Creation**: Drag, resize, rotate photos with real-time collaboration
- 🖼️ **Display Modes**: Toggle between Polaroid (with captions) and Plain photo styles
- 💾 **Export Options**: Save collages as images or PDFs with optional area selection
- 📱 **Mobile-First**: Touch gestures support (pinch, drag, rotate, tap)
- ⚡ **Real-time Sync**: Live collaboration using Firestore

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Animation**: Framer Motion
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Export**: html2canvas, jsPDF
- **Image Processing**: heic2any
- **Deployment**: GitHub Pages

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Firebase (see SETUP_GUIDE.md)
4. Update allowed emails in `src/firebase/config.ts`
5. Run locally: `npm start`
6. Deploy: `npm run deploy`

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to GitHub Pages

## Project Structure

```
src/
├── components/       # React components
│   ├── AlbumSidebar.tsx
│   ├── CollageView.tsx
│   ├── ExportButton.tsx
│   ├── GalleryView.tsx
│   ├── Login.tsx
│   └── PrivateRoute.tsx
├── contexts/        # React contexts
│   └── AuthContext.tsx
├── firebase/        # Firebase configuration
│   └── config.ts
├── types/           # TypeScript interfaces
│   └── index.ts
└── App.tsx          # Main app component
```

## Security

- Authentication restricted to 2 whitelisted Google accounts
- Firestore rules ensure private data access
- Storage rules protect uploaded photos

See SETUP_GUIDE.md for detailed setup instructions.
