import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Album, Photo } from '../types';
import heic2any from 'heic2any';

interface GalleryViewProps {
  album: Album;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ album }) => {
  const { currentUser } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          x: Math.random() * 300,
          y: Math.random() * 300,
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{album.name} - Gallery</h2>
        <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? 'Uploading...' : 'Upload Photos'}
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.thumbnailUrl}
              alt={photo.filename}
              className="w-full h-48 object-cover rounded-lg shadow-md"
            />
            
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
              <button
                onClick={() => toggleCollage(photo)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  photo.inCollage
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {photo.inCollage ? 'Remove from Collage' : 'Send to Collage'}
              </button>
              
              <button
                onClick={() => downloadPhoto(photo)}
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
    </div>
  );
};