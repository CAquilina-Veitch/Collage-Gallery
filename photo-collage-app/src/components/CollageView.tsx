import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Album, Photo, CollageItem } from '../types';
import { CollagePhotoItem } from './CollagePhotoItem';

interface CollageViewProps {
  album: Album;
}

interface CollagePhotoItem extends CollageItem {
  photo: Photo;
}

export const CollageView: React.FC<CollageViewProps> = ({ album }) => {
  const [collageItems, setCollageItems] = useState<CollagePhotoItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!album) return;

    // Listen to collage items
    const collageQuery = query(collection(db, 'albums', album.id, 'collage'));
    const photosQuery = query(
      collection(db, 'albums', album.id, 'photos'),
      where('inCollage', '==', true)
    );

    const unsubscribeCollage = onSnapshot(collageQuery, async (collageSnapshot) => {
      // Get all photos that are in collage
      const photosSnapshot = await getDocs(photosQuery);
      const photosMap = new Map<string, Photo>();
      
      photosSnapshot.forEach((doc) => {
        photosMap.set(doc.id, { id: doc.id, ...doc.data() } as Photo);
      });

      // Combine collage items with photo data
      const items: CollagePhotoItem[] = [];
      collageSnapshot.forEach((doc) => {
        const collageData = doc.data() as any;
        const photo = photosMap.get(collageData.photoId);
        if (photo) {
          items.push({
            id: doc.id,
            ...collageData,
            photo
          });
        }
      });

      setCollageItems(items.sort((a, b) => a.zIndex - b.zIndex));
    });

    return () => {
      unsubscribeCollage();
    };
  }, [album]);

  const updateCollageItem = async (itemId: string, updates: Partial<CollageItem>) => {
    try {
      await updateDoc(doc(db, 'albums', album.id, 'collage', itemId), updates);
    } catch (error) {
      console.error('Error updating collage item:', error);
    }
  };

  const deleteFromCollage = async (item: CollagePhotoItem) => {
    try {
      // Remove from collage collection
      await deleteDoc(doc(db, 'albums', album.id, 'collage', item.id));
      
      // Update photo to not be in collage
      await updateDoc(doc(db, 'albums', album.id, 'photos', item.photo.id), {
        inCollage: false
      });
      
      setSelectedItem(null);
      setShowSettings(false);
    } catch (error) {
      console.error('Error deleting from collage:', error);
    }
  };



  const bringForward = (item: CollagePhotoItem) => {
    const maxZ = Math.max(...collageItems.map(i => i.zIndex));
    updateCollageItem(item.id, { zIndex: maxZ + 1 });
  };

  const sendBackward = (item: CollagePhotoItem) => {
    const minZ = Math.min(...collageItems.map(i => i.zIndex));
    updateCollageItem(item.id, { zIndex: minZ - 1 });
  };

  return (
    <div className="relative h-screen bg-gray-100 overflow-auto touch-pan-x touch-pan-y" ref={containerRef}>
      <div className="fixed top-4 left-4 z-10">
        <h2 className="text-2xl font-bold bg-white px-4 py-2 rounded shadow">
          {album.name} - Collage Mode
        </h2>
      </div>

      {/* Collage Canvas */}
      <div className="relative min-w-full min-h-full collage-canvas" style={{ width: '200%', height: '200%' }}>
        {collageItems.map((item) => (
          <CollagePhotoItem
            key={item.id}
            item={item}
            onUpdate={(updates) => updateCollageItem(item.id, updates)}
            onTap={() => {
              setSelectedItem(item.id);
              setShowSettings(true);
            }}
          />
        ))}
      </div>

      {/* Settings Menu */}
      {showSettings && selectedItem && (
        <div className="absolute top-20 right-4 bg-white p-6 rounded-lg shadow-xl z-20 w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Photo Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {(() => {
            const item = collageItems.find(i => i.id === selectedItem);
            if (!item) return null;

            return (
              <>
                {/* Mode Toggle */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Display Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateCollageItem(item.id, { mode: 'polaroid' })}
                      className={`px-3 py-1 rounded ${item.mode === 'polaroid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                      Polaroid
                    </button>
                    <button
                      onClick={() => updateCollageItem(item.id, { mode: 'plain' })}
                      className={`px-3 py-1 rounded ${item.mode === 'plain' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                      Plain
                    </button>
                  </div>
                </div>

                {/* Caption (Polaroid only) */}
                {item.mode === 'polaroid' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Caption</label>
                    <input
                      type="text"
                      value={item.captionText || ''}
                      onChange={(e) => updateCollageItem(item.id, { captionText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a caption..."
                    />
                  </div>
                )}

                {/* Z-Index Controls */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Layer Order</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => bringForward(item)}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Bring Forward
                    </button>
                    <button
                      onClick={() => sendBackward(item)}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Send Backward
                    </button>
                  </div>
                </div>

                {/* Scale Control */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Size: {item.scale.toFixed(2)}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={item.scale}
                    onChange={(e) => updateCollageItem(item.id, { scale: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Rotation Control */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Rotation: {item.rotation}°</label>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="5"
                    value={item.rotation}
                    onChange={(e) => updateCollageItem(item.id, { rotation: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => deleteFromCollage(item)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Remove from Collage
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};