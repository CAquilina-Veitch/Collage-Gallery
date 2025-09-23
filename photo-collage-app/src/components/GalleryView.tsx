import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Album, Photo } from '../types';
import heic2any from 'heic2any';

interface GalleryViewProps {
  album: Album;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ album, fileInputRef, uploading, setUploading }) => {
  const { currentUser } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    if (!album) return;

    const q = query(collection(db, 'albums', album.id, 'photos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photoData: Photo[] = [];
      snapshot.forEach((doc) => {
        photoData.push({ id: doc.id, ...doc.data() } as Photo);
      });
      setPhotos(photoData.sort((a, b) => b.uploadedAt?.seconds - a.uploadedAt?.seconds));
    });

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUser?.email) return;

    setUploading(true);
    
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
      if (!photo.inCollage) {
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

  return (
    <div className="p-4">
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
            className={`relative group cursor-pointer select-none ${
              selectedPhoto?.id === photo.id ? 'ring-4 ring-blue-500 rounded-lg' : ''
            }`}
            style={{ touchAction: 'manipulation' }}
            onClick={() => {
              if (selectedPhoto?.id === photo.id) {
                setSelectedPhoto(null);
              } else {
                setSelectedPhoto(photo);
              }
            }}
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.filename}
              className="w-full h-48 object-cover rounded-lg shadow-md select-none"
              draggable={false}
            />

            {/* Desktop overlay controls - hidden on mobile */}
            <div className="hidden md:flex absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex-col items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollage(photo);
                }}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  photo.inCollage
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {photo.inCollage ? 'Remove from Collage' : 'Send to Collage'}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadPhoto(photo);
                }}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700"
              >
                Download
              </button>
            </div>

            {/* Collage indicator */}
            {photo.inCollage && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                In Collage
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom toolbar for selected photo */}
      {selectedPhoto && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Photo Actions</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-500 hover:text-gray-700 p-2 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  toggleCollage(selectedPhoto);
                  setSelectedPhoto(null);
                }}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  selectedPhoto.inCollage
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {selectedPhoto.inCollage ? 'Remove from Collage' : 'Send to Collage'}
              </button>
              <button
                onClick={() => {
                  downloadPhoto(selectedPhoto);
                  setSelectedPhoto(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};