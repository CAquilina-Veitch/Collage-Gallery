import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, writeBatch, collectionGroup } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Album, Photo } from '../types';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import ReactDOM from 'react-dom';
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

interface GalleryViewProps {
  album: Album;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ album, fileInputRef, uploading, setUploading }) => {
  const { currentUser } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!album) return;

    let unsubscribe: () => void;

    if (album.id === 'all-albums') {
      // Query all photos from all albums using collectionGroup
      const q = query(collectionGroup(db, 'photos'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const photoData: Photo[] = [];
        snapshot.forEach((doc) => {
          photoData.push({ id: doc.id, ...doc.data() } as Photo);
        });
        setPhotos(photoData.sort((a, b) => b.uploadedAt?.seconds - a.uploadedAt?.seconds));
      });
    } else {
      // Query photos from specific album
      const q = query(collection(db, 'albums', album.id, 'photos'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const photoData: Photo[] = [];
        snapshot.forEach((doc) => {
          photoData.push({ id: doc.id, ...doc.data() } as Photo);
        });
        setPhotos(photoData.sort((a, b) => b.uploadedAt?.seconds - a.uploadedAt?.seconds));
      });
    }

    return () => unsubscribe();
  }, [album]);

  const convertHeicToJpeg = async (file: File): Promise<Blob> => {
    try {
      const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      });
      return result as Blob;
    } catch (error) {
      console.error('Error converting HEIC:', error);
      throw error;
    }
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock acquired for upload');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock released');
        });
      } catch (err) {
        console.error('Failed to acquire wake lock:', err);
      }
    }
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUser?.email) return;

    setUploading(true);
    await requestWakeLock();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        let processedFile: Blob = file;
        let filename = file.name;

        // Convert HEIC to JPEG if necessary
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
          processedFile = await convertHeicToJpeg(file);
          filename = filename.replace(/\.heic$/i, '.jpg');
        }

        // Check for unsupported RAW formats
        const rawExtensions = ['.raw', '.dng', '.cr2', '.nef', '.arw', '.orf', '.rw2'];
        if (rawExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
          alert(`Unsupported file format: ${filename}. Please convert to JPEG/PNG.`);
          continue;
        }

        // Upload to storage
        const photoId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const storageRef = ref(storage, `albums/${album.id}/${photoId}/${filename}`);
        const snapshot = await uploadBytes(storageRef, processedFile);
        const url = await getDownloadURL(snapshot.ref);

        // Add to Firestore
        await addDoc(collection(db, 'albums', album.id, 'photos'), {
          url,
          thumbnailUrl: url, // In production, you'd generate a smaller thumbnail
          filename,
          uploadedBy: currentUser.email,
          uploadedAt: serverTimestamp(),
          inCollage: false
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    await releaseWakeLock();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleCollage = async (photo: Photo) => {
    try {
      await updateDoc(doc(db, 'albums', album.id, 'photos', photo.id), {
        inCollage: !photo.inCollage
      });

      // If adding to collage, create collage item
      if (!photo.inCollage || album.id === 'all-albums') {
        if (album.id === 'all-albums') {
          await addDoc(collection(db, 'all-albums-collage'), {
            photoId: photo.id,
            x: 50 + Math.random() * 200,
            y: 50 + Math.random() * 200,
            rotation: 0,
            scale: 1,
            zIndex: Date.now(),
            mode: 'polaroid',
            captionText: ''
          });
        } else {
          await addDoc(collection(db, 'albums', album.id, 'collage'), {
            photoId: photo.id,
            x: 50 + Math.random() * 200,
            y: 50 + Math.random() * 200,
            rotation: 0,
            scale: 1,
            zIndex: Date.now(),
            mode: 'polaroid',
            captionText: ''
          });
        }
      } else {
        // If removing from collage, delete collage item
        // This would require querying for the collage item first
      }
    } catch (error) {
      console.error('Error toggling collage:', error);
    }
  };

  const downloadPhoto = (photo: Photo) => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = photo.filename;
    a.click();
  };

  const downloadMultiplePhotos = useCallback(async (photoIds: string[]) => {
    const photosToDownload = photos.filter(p => photoIds.includes(p.id));

    for (const photo of photosToDownload) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between downloads
      downloadPhoto(photo);
    }
  }, [photos]);

  const deletePhotos = useCallback(async (photoIds: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${photoIds.length} photo(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      const photosToDelete = photos.filter(p => photoIds.includes(p.id));

      for (const photo of photosToDelete) {
        // Delete from Firestore
        batch.delete(doc(db, 'albums', album.id, 'photos', photo.id));

        // Delete from Storage
        try {
          const storageRef = ref(storage, photo.url);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn('Error deleting file from storage:', storageError);
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error deleting photos:', error);
      alert('Failed to delete some photos. Please try again.');
    }
  }, [photos, album.id]);

  const sendPhotosToCollage = useCallback(async (photoIds: string[]) => {
    try {
      const batch = writeBatch(db);
      const photosToAdd = photos.filter(p => photoIds.includes(p.id));

      if (album.id === 'all-albums') {
        // For "All Albums", only add to the all-albums-collage collection
        for (const photo of photosToAdd) {
          const collageItemRef = doc(collection(db, 'all-albums-collage'));
          batch.set(collageItemRef, {
            photoId: photo.id,
            x: 50 + Math.random() * 300,
            y: 50 + Math.random() * 300,
            rotation: 0,
            scale: 1,
            zIndex: Date.now() + Math.random(),
            mode: 'polaroid',
            captionText: ''
          });
        }
      } else {
        // For regular albums, use existing logic
        const photosNotInCollage = photosToAdd.filter(p => !p.inCollage);

        for (const photo of photosNotInCollage) {
          // Update photo inCollage status
          batch.update(doc(db, 'albums', album.id, 'photos', photo.id), {
            inCollage: true
          });

          // Create collage item
          const collageItemRef = doc(collection(db, 'albums', album.id, 'collage'));
          batch.set(collageItemRef, {
            photoId: photo.id,
            x: 50 + Math.random() * 300,
            y: 50 + Math.random() * 300,
            rotation: 0,
            scale: 1,
            zIndex: Date.now() + Math.random(),
            mode: 'polaroid',
            captionText: ''
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error sending photos to collage:', error);
      alert('Failed to add some photos to collage. Please try again.');
    }
  }, [photos, album.id]);

  const handlePhotoTouchStart = useCallback((e: React.TouchEvent, photo: Photo) => {
    if (selectionMode) {
      return; // In selection mode, let click handler manage selection
    }

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    const timer = setTimeout(() => {
      // Enter selection mode on long press
      setSelectionMode(true);
      setSelectedPhotos(new Set([photo.id]));

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);

    setLongPressTimer(timer);
  }, [selectionMode]);

  const handlePhotoTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !longPressTimer) return;

    const touch = e.touches[0];
    const distance = Math.sqrt(
      Math.pow(touch.clientX - touchStartRef.current.x, 2) +
      Math.pow(touch.clientY - touchStartRef.current.y, 2)
    );

    // Cancel long press if finger moves too much
    if (distance > 10) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const handlePhotoTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    touchStartRef.current = null;
  }, [longPressTimer]);

  const handlePhotoClick = useCallback((photo: Photo) => {
    if (selectionMode) {
      // Toggle selection
      const newSelected = new Set(selectedPhotos);
      if (newSelected.has(photo.id)) {
        newSelected.delete(photo.id);
      } else {
        newSelected.add(photo.id);
      }
      setSelectedPhotos(newSelected);
    } else {
      // Show preview modal
      setPreviewPhoto(photo);
    }
  }, [selectionMode, selectedPhotos]);

  const selectAllPhotos = useCallback(() => {
    setSelectedPhotos(new Set(photos.map(p => p.id)));
  }, [photos]);

  const deselectAllPhotos = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedPhotos(new Set());
  }, []);

  const handleSelectionAction = useCallback(async (action: 'collage' | 'download' | 'delete') => {
    const selectedIds = Array.from(selectedPhotos);
    if (selectedIds.length === 0) return;

    try {
      switch (action) {
        case 'collage':
          await sendPhotosToCollage(selectedIds);
          break;
        case 'download':
          await downloadMultiplePhotos(selectedIds);
          break;
        case 'delete':
          await deletePhotos(selectedIds);
          break;
      }
    } finally {
      exitSelectionMode();
    }
  }, [selectedPhotos, sendPhotosToCollage, downloadMultiplePhotos, deletePhotos, exitSelectionMode]);

  return (
    <div className="pt-20 px-4 pb-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        disabled={uploading}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`relative cursor-pointer select-none ${
              selectionMode && selectedPhotos.has(photo.id) ? 'ring-4 ring-blue-500 rounded-lg' : ''
            }`}
            style={{ touchAction: 'manipulation' }}
            onTouchStart={(e) => handlePhotoTouchStart(e, photo)}
            onTouchMove={handlePhotoTouchMove}
            onTouchEnd={handlePhotoTouchEnd}
            onClick={() => handlePhotoClick(photo)}
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.filename}
              className="w-full h-48 object-cover rounded-lg shadow-md select-none"
              draggable={false}
            />

            {/* Selection checkbox */}
            {selectionMode && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white bg-black bg-opacity-30 flex items-center justify-center">
                {selectedPhotos.has(photo.id) && (
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* Collage indicator */}
            {!selectionMode && photo.inCollage && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                In Collage
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        photo={previewPhoto!}
        isOpen={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
      />

      {/* Selection Mode Toolbar */}
      {selectionMode && ReactDOM.createPortal(
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-lg">{selectedPhotos.size} Selected</h3>
                <button
                  onClick={exitSelectionMode}
                  className="text-gray-500 hover:text-gray-700 text-sm underline"
                >
                  Exit Selection
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllPhotos}
                  className="text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllPhotos}
                  className="text-gray-600 hover:text-gray-700 text-sm underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => handleSelectionAction('collage')}
                disabled={selectedPhotos.size === 0}
                className="px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send to Collage
              </button>
              <button
                onClick={() => handleSelectionAction('download')}
                disabled={selectedPhotos.size === 0}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Download Selected
              </button>
            </div>

            <button
              onClick={() => handleSelectionAction('delete')}
              disabled={selectedPhotos.size === 0}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Delete Selected
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};