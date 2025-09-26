import React, { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './components/Login';
import { AlbumSidebar } from './components/AlbumSidebar';
import { GalleryView } from './components/GalleryView';
import { CollageView } from './components/CollageView';
import { ExportButton } from './components/ExportButton';
import ShareHandler from './components/ShareHandler';
import { Album } from './types';
import './App.css';

function MainApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [viewMode, setViewMode] = useState<'gallery' | 'collage'>('gallery');
  const [uploading, setUploading] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // Lock state for collage
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle navigation from ShareHandler with selected album
  useEffect(() => {
    if (location.state && (location.state as any).selectedAlbumId) {
      const albumId = (location.state as any).selectedAlbumId;
      // You would fetch the album details here or pass it through state
      // For now, we'll just clear the state
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (location.pathname === '/share') {
    return null; // ShareHandler is handled by router
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <div className="h-screen bg-gray-50" style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
                  {/* Sidebar */}
                  <AlbumSidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    selectedAlbum={selectedAlbum}
                    onSelectAlbum={setSelectedAlbum}
                  />

                  {/* Overlay Header - Floating over content */}
                  <header
                    className="px-4 py-3 flex-shrink-0"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '64px',
                      background: 'rgba(255, 255, 255, 0.85)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000
                    }}>
                      <div className="flex items-center justify-between h-full">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </button>

                          {selectedAlbum && (
                            <>
                              <h2 className="text-xl font-semibold text-gray-800">{selectedAlbum.name}</h2>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setViewMode('gallery')}
                                  className={`p-2 rounded ${viewMode === 'gallery' ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                  <img
                                    src={`${process.env.PUBLIC_URL}/gallery.png`}
                                    alt="Gallery"
                                    className={`h-6 w-6 ${viewMode === 'gallery' ? 'filter brightness-0 invert' : ''}`}
                                  />
                                </button>
                                <button
                                  onClick={() => setViewMode('collage')}
                                  className={`p-2 rounded ${viewMode === 'collage' ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                  <img
                                    src={`${process.env.PUBLIC_URL}/collage.png`}
                                    alt="Collage"
                                    className={`h-6 w-6 ${viewMode === 'collage' ? 'filter brightness-0 invert' : ''}`}
                                  />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedAlbum && viewMode === 'gallery' && selectedAlbum.id !== 'all-albums' && (
                            <button
                              onClick={triggerFileUpload}
                              disabled={uploading}
                              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              <img
                                src={`${process.env.PUBLIC_URL}/upload.png`}
                                alt="Upload"
                                className="h-6 w-6 filter brightness-0 invert"
                              />
                              <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload Photos'}</span>
                            </button>
                          )}
                          {selectedAlbum && viewMode === 'collage' && (
                            <>
                              <button
                                onClick={() => setIsLocked(!isLocked)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
                                title={isLocked ? "Unlock to edit photos" : "Lock to navigate only"}
                              >
                                <img
                                  src={`${process.env.PUBLIC_URL}/${isLocked ? 'locked' : 'unlocked'}.png`}
                                  alt={isLocked ? "Locked" : "Unlocked"}
                                  className="h-6 w-6"
                                />
                                <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Unlocked'}</span>
                              </button>
                              <ExportButton album={selectedAlbum} />
                            </>
                          )}
                        </div>
                      </div>
                    </header>

                  {/* Main Content - Full height */}
                  <main
                    className="w-full h-full"
                    style={{
                      height: '100vh',
                      overflow: viewMode === 'collage' ? 'hidden' : 'auto'
                    }}
                  >
                      {selectedAlbum ? (
                        viewMode === 'gallery' ? (
                          <GalleryView
                            album={selectedAlbum}
                            fileInputRef={fileInputRef}
                            uploading={uploading}
                            setUploading={setUploading}
                          />
                        ) : (
                          <div style={{ height: '100%', width: '100%' }}>
                            <CollageView album={selectedAlbum} isLocked={isLocked} />
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <p>Select an album to get started</p>
                        </div>
                      )}
                  </main>
                </div>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/share" element={<ShareHandler />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
