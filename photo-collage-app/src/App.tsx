import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './components/Login';
import { AlbumSidebar } from './components/AlbumSidebar';
import { GalleryView } from './components/GalleryView';
import { CollageView } from './components/CollageView';
import { ExportButton } from './components/ExportButton';
import { Album } from './types';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [viewMode, setViewMode] = useState<'gallery' | 'collage'>('gallery');

  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <div className="flex h-screen bg-gray-50">
                  {/* Sidebar */}
                  <AlbumSidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    selectedAlbum={selectedAlbum}
                    onSelectAlbum={setSelectedAlbum}
                  />

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <header className="bg-white shadow-sm border-b px-4 py-3">
                      <div className="flex items-center justify-between">
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
                            <div className="flex gap-2">
                              <button
                                onClick={() => setViewMode('gallery')}
                                className={`px-4 py-2 rounded ${viewMode === 'gallery' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                              >
                                Gallery
                              </button>
                              <button
                                onClick={() => setViewMode('collage')}
                                className={`px-4 py-2 rounded ${viewMode === 'collage' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                              >
                                Collage
                              </button>
                            </div>
                          )}
                        </div>

                        {selectedAlbum && viewMode === 'collage' && (
                          <ExportButton album={selectedAlbum} />
                        )}
                      </div>
                    </header>

                    {/* Content Area */}
                    <main className="flex-1 overflow-auto">
                      {selectedAlbum ? (
                        viewMode === 'gallery' ? (
                          <GalleryView album={selectedAlbum} />
                        ) : (
                          <CollageView album={selectedAlbum} />
                        )
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <p>Select an album to get started</p>
                        </div>
                      )}
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
