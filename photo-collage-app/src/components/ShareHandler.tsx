import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase/config';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import heic2any from 'heic2any';

// Type declaration for WakeLockSentinel
declare global {
  interface WakeLockSentinel {
    released: boolean;
    type: 'screen';
    release(): Promise<void>;
    addEventListener(type: 'release', listener: () => void): void;
    removeEventListener(type: 'release', listener: () => void): void;
  }

  interface Navigator {
    wakeLock: {
      request(type: 'screen'): Promise<WakeLockSentinel>;
    };
  }
}

interface Album {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  lastUpdated: Date;
}

interface SharedFile {
  key: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

const ShareHandler: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Request wake lock to keep screen awake
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock acquired for share upload');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock released');
        });
      } catch (err) {
        console.error('Failed to acquire wake lock:', err);
      }
    }
  };

  // Release wake lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error('Failed to release wake lock:', err);
      }
    }
  };

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (uploading && !document.hidden) {
        requestWakeLock();
      } else if (document.hidden && wakeLockRef.current) {
        releaseWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [uploading]);

  // Fetch shared files from service worker
  useEffect(() => {
    const fetchSharedData = async () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
          if (event.data.success && event.data.data) {
            setSharedFiles(event.data.data.files || []);
          } else {
            setError('No shared files found. Please share photos from your gallery.');
          }
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_SHARED_DATA' },
          [messageChannel.port2]
        );
      } else {
        // Wait for service worker to be ready
        navigator.serviceWorker.ready.then(() => {
          if (navigator.serviceWorker.controller) {
            const messageChannel = new MessageChannel();

            messageChannel.port1.onmessage = (event) => {
              if (event.data.success && event.data.data) {
                setSharedFiles(event.data.data.files || []);
              } else {
                setError('No shared files found. Please share photos from your gallery.');
              }
            };

            navigator.serviceWorker.controller.postMessage(
              { type: 'GET_SHARED_DATA' },
              [messageChannel.port2]
            );
          }
        });
      }
    };

    fetchSharedData();
  }, []);

  // Fetch existing albums
  useEffect(() => {
    const fetchAlbums = async () => {
      if (currentUser) {
        try {
          const querySnapshot = await getDocs(collection(db, 'albums'));
          const albumsData: Album[] = [];
          querySnapshot.forEach((doc) => {
            albumsData.push({ id: doc.id, ...doc.data() } as Album);
          });
          albumsData.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
          setAlbums(albumsData);
        } catch (err) {
          console.error('Error fetching albums:', err);
        }
      }
    };

    fetchAlbums();
  }, [currentUser]);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || !currentUser) return;

    try {
      const newAlbum = {
        name: newAlbumName.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        lastUpdated: serverTimestamp(),
        description: '',
      };

      const docRef = await addDoc(collection(db, 'albums'), newAlbum);
      setSelectedAlbum(docRef.id);
      setShowNewAlbum(false);
      setNewAlbumName('');

      // Refresh albums list
      const querySnapshot = await getDocs(collection(db, 'albums'));
      const albumsData: Album[] = [];
      querySnapshot.forEach((doc) => {
        albumsData.push({ id: doc.id, ...doc.data() } as Album);
      });
      albumsData.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
      setAlbums(albumsData);
    } catch (err) {
      console.error('Error creating album:', err);
      setError('Failed to create album');
    }
  };

  const convertHeicToJpeg = async (file: File | Blob): Promise<Blob> => {
    try {
      const output = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      });
      return output as Blob;
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!selectedAlbum || sharedFiles.length === 0) {
      setError('Please select an album and ensure photos are shared');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: sharedFiles.length });
    await requestWakeLock();

    try {
      let successCount = 0;

      for (let i = 0; i < sharedFiles.length; i++) {
        const file = sharedFiles[i];
        setUploadProgress({ current: i, total: sharedFiles.length });

        try {
          let fileToUpload: Blob = file.blob;
          let fileName = file.name;
          let mimeType = file.type;

          // Convert HEIC/HEIF files to JPEG
          if (file.type === 'image/heic' || file.type === 'image/heif' ||
              file.name.toLowerCase().endsWith('.heic') ||
              file.name.toLowerCase().endsWith('.heif')) {
            try {
              fileToUpload = await convertHeicToJpeg(file.blob);
              fileName = fileName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
              mimeType = 'image/jpeg';
            } catch (conversionError) {
              console.error('Failed to convert HEIC file:', file.name, conversionError);
              continue; // Skip this file
            }
          }

          // Create unique filename
          const timestamp = Date.now();
          const uniqueFileName = `${timestamp}_${fileName}`;

          // Upload to Firebase Storage
          const storageRef = ref(storage, `photos/${selectedAlbum}/${uniqueFileName}`);
          const snapshot = await uploadBytes(storageRef, fileToUpload, {
            contentType: mimeType,
          });

          // Get download URL
          const downloadURL = await getDownloadURL(snapshot.ref);

          // Save metadata to Firestore
          await addDoc(collection(db, `albums/${selectedAlbum}/photos`), {
            url: downloadURL,
            fileName: uniqueFileName,
            originalName: fileName,
            uploadedAt: serverTimestamp(),
            uploadedBy: currentUser!.uid,
            fileSize: file.size,
            contentType: mimeType,
          });

          successCount++;
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
        }
      }

      setUploadProgress({ current: sharedFiles.length, total: sharedFiles.length });

      // Navigate to the album
      setTimeout(() => {
        navigate('/', { state: { selectedAlbumId: selectedAlbum } });
      }, 500);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload photos');
    } finally {
      setUploading(false);
      await releaseWakeLock();
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please sign in to share photos</h2>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Share Photos</h1>
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700">
            {error}
          </div>
        )}

        {sharedFiles.length > 0 && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-md text-green-700">
            {sharedFiles.length} photo{sharedFiles.length !== 1 ? 's' : ''} ready to upload
          </div>
        )}

        {/* Album Selection */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">Select Album</h2>

          {/* Existing Albums */}
          <div className="space-y-2 mb-4">
            {albums.map((album) => (
              <label
                key={album.id}
                className={`flex items-center p-3 rounded-md border cursor-pointer hover:bg-gray-50 ${
                  selectedAlbum === album.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="album"
                  value={album.id}
                  checked={selectedAlbum === album.id}
                  onChange={(e) => setSelectedAlbum(e.target.value)}
                  className="mr-3"
                />
                <span className="flex-1">{album.name}</span>
              </label>
            ))}
          </div>

          {/* Create New Album Option */}
          <div className="border-t pt-3">
            {!showNewAlbum ? (
              <button
                onClick={() => setShowNewAlbum(true)}
                className="w-full p-3 text-blue-600 hover:bg-blue-50 rounded-md border border-blue-300 border-dashed"
              >
                + Create New Album
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Album name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateAlbum}
                  disabled={!newAlbumName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewAlbum(false);
                    setNewAlbumName('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uploading...</span>
              <span className="text-sm text-gray-600">
                {uploadProgress.current} / {uploadProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <span className="mr-2">📱</span>
              Screen will stay awake during upload
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <button
            onClick={handleUpload}
            disabled={!selectedAlbum || sharedFiles.length === 0 || uploading}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {uploading
              ? `Uploading ${uploadProgress.current} / ${uploadProgress.total}...`
              : `Upload ${sharedFiles.length} Photo${sharedFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </main>
    </div>
  );
};

export default ShareHandler;