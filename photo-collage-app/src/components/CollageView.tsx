import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Album, Photo, CollageItem } from '../types';

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
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingCanvas = useRef(false);
  const lastTouchPos = useRef({ x: 0, y: 0 });
  const lastPinchDistance = useRef(0);
  const activeItemId = useRef<string | null>(null);

  useEffect(() => {
    if (!album) return;

    const collageQuery = query(collection(db, 'albums', album.id, 'collage'));
    const photosQuery = query(
      collection(db, 'albums', album.id, 'photos'),
      where('inCollage', '==', true)
    );

    const unsubscribeCollage = onSnapshot(collageQuery, async (collageSnapshot) => {
      const photosSnapshot = await getDocs(photosQuery);
      const photosMap = new Map<string, Photo>();
      
      photosSnapshot.forEach((doc) => {
        photosMap.set(doc.id, { id: doc.id, ...doc.data() } as Photo);
      });

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
      await deleteDoc(doc(db, 'albums', album.id, 'collage', item.id));
      await updateDoc(doc(db, 'albums', album.id, 'photos', item.photo.id), {
        inCollage: false
      });
      setSelectedItem(null);
      setShowSettings(false);
    } catch (error) {
      console.error('Error deleting from collage:', error);
    }
  };

  // Canvas pan and zoom handlers
  const handleCanvasStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      if (e.touches.length === 1 && !activeItemId.current) {
        isDraggingCanvas.current = true;
        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      }
    }
  };

  const handleCanvasMove = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      if (e.touches.length === 1 && isDraggingCanvas.current) {
        const dx = e.touches[0].clientX - lastTouchPos.current.x;
        const dy = e.touches[0].clientY - lastTouchPos.current.y;
        
        setCanvasTransform(prev => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy
        }));
        
        lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && lastPinchDistance.current > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = distance / lastPinchDistance.current;
        
        setCanvasTransform(prev => ({
          ...prev,
          scale: Math.max(0.5, Math.min(3, prev.scale * scale))
        }));
        
        lastPinchDistance.current = distance;
      }
    }
  };

  const handleCanvasEnd = () => {
    isDraggingCanvas.current = false;
    lastPinchDistance.current = 0;
  };

  // Photo item handlers
  const handleItemStart = (e: React.TouchEvent, itemId: string) => {
    e.stopPropagation();
    activeItemId.current = itemId;
  };

  const handleItemMove = (e: React.TouchEvent, item: CollagePhotoItem) => {
    e.stopPropagation();
    if (e.touches.length === 1 && activeItemId.current === item.id) {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (touch.clientX - rect.left - canvasTransform.x) / canvasTransform.scale;
        const y = (touch.clientY - rect.top - canvasTransform.y) / canvasTransform.scale;
        
        updateCollageItem(item.id, { x: x - 100, y: y - 100 });
      }
    }
  };

  const handleItemEnd = () => {
    activeItemId.current = null;
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
    <div className="relative h-screen bg-gray-100 overflow-hidden">
      <div className="fixed top-4 left-4 z-10">
        <h2 className="text-2xl font-bold bg-white px-4 py-2 rounded shadow">
          {album.name} - Collage
        </h2>
      </div>

      {/* Canvas Controls */}
      <div className="fixed bottom-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setCanvasTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }))}
          className="bg-white p-2 rounded shadow"
        >
          +
        </button>
        <button
          onClick={() => setCanvasTransform(prev => ({ ...prev, scale: Math.max(0.5, prev.scale / 1.2) }))}
          className="bg-white p-2 rounded shadow"
        >
          -
        </button>
        <button
          onClick={() => setCanvasTransform({ x: 0, y: 0, scale: 1 })}
          className="bg-white p-2 rounded shadow"
        >
          Reset
        </button>
      </div>

      {/* Collage Canvas */}
      <div 
        ref={canvasRef}
        className="relative w-full h-full touch-none"
        onTouchStart={handleCanvasStart}
        onTouchMove={handleCanvasMove}
        onTouchEnd={handleCanvasEnd}
        onMouseDown={handleCanvasStart}
        onMouseMove={handleCanvasMove}
        onMouseUp={handleCanvasEnd}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
            transformOrigin: '0 0',
            width: '2000px',
            height: '2000px',
          }}
        >
          {collageItems.map((item) => (
            <div
              key={item.id}
              className="absolute touch-none"
              style={{
                left: `${item.x || 50}px`,
                top: `${item.y || 50}px`,
                transform: `rotate(${item.rotation || 0}deg) scale(${item.scale || 1})`,
                zIndex: item.zIndex,
              }}
              onTouchStart={(e) => handleItemStart(e, item.id)}
              onTouchMove={(e) => handleItemMove(e, item)}
              onTouchEnd={handleItemEnd}
              onClick={() => {
                setSelectedItem(item.id);
                setShowSettings(true);
              }}
            >
              {item.mode === 'polaroid' ? (
                <div className="bg-white p-4 shadow-2xl">
                  <img
                    src={item.photo.url}
                    alt={item.photo.filename}
                    className="w-48 h-48 sm:w-64 sm:h-64 object-cover pointer-events-none"
                    draggable={false}
                  />
                  {item.captionText && (
                    <p className="mt-2 text-center text-gray-800">
                      {item.captionText}
                    </p>
                  )}
                </div>
              ) : (
                <img
                  src={item.photo.url}
                  alt={item.photo.filename}
                  className="w-48 h-48 sm:w-64 sm:h-64 object-cover shadow-lg pointer-events-none"
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Menu */}
      {showSettings && selectedItem && (
        <div className="fixed top-20 right-4 bg-white p-6 rounded-lg shadow-xl z-20 w-80 max-w-[90vw]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Photo Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {(() => {
            const item = collageItems.find(i => i.id === selectedItem);
            if (!item) return null;

            return (
              <>
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

                {item.mode === 'polaroid' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Caption</label>
                    <input
                      type="text"
                      value={item.captionText || ''}
                      onChange={(e) => updateCollageItem(item.id, { captionText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Add a caption..."
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Size: {(item.scale || 1).toFixed(2)}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={item.scale || 1}
                    onChange={(e) => updateCollageItem(item.id, { scale: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Rotation: {item.rotation || 0}°</label>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="5"
                    value={item.rotation || 0}
                    onChange={(e) => updateCollageItem(item.id, { rotation: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="mb-4 flex gap-2">
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