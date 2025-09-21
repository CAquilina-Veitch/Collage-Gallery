import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CollageItem, Photo } from '../types';

interface CollagePhotoItemProps {
  item: CollageItem & { photo: Photo };
  onUpdate: (updates: Partial<CollageItem>) => void;
  onTap: () => void;
}

export const CollagePhotoItem: React.FC<CollagePhotoItemProps> = ({ item, onUpdate, onTap }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [gesture, setGesture] = useState<{ scale: number; rotation: number }>({ scale: 1, rotation: 0 });
  const lastTouchDistance = useRef<number>(0);
  const lastTouchAngle = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchAngle = (touches: React.TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsDragging(true);
      lastTouchDistance.current = getTouchDistance(e.touches);
      lastTouchAngle.current = getTouchAngle(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isDragging) {
      e.preventDefault();
      
      // Calculate scale
      const currentDistance = getTouchDistance(e.touches);
      const scaleDelta = currentDistance / lastTouchDistance.current;
      const newScale = Math.max(0.5, Math.min(3, item.scale * scaleDelta));
      
      // Calculate rotation
      const currentAngle = getTouchAngle(e.touches);
      const rotationDelta = currentAngle - lastTouchAngle.current;
      const newRotation = item.rotation + rotationDelta;
      
      setGesture({ scale: newScale / item.scale, rotation: rotationDelta });
      
      lastTouchDistance.current = currentDistance;
      lastTouchAngle.current = currentAngle;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime.current;
    
    if (e.touches.length === 0) {
      if (isDragging && gesture.scale !== 1) {
        onUpdate({
          scale: item.scale * gesture.scale,
          rotation: item.rotation + gesture.rotation
        });
      } else if (touchDuration < 300 && !isDragging) {
        // This was a tap
        onTap();
      }
      
      setIsDragging(false);
      setGesture({ scale: 1, rotation: 0 });
    }
  };

  return (
    <motion.div
      drag={!isDragging}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={(e, info) => {
        onUpdate({
          x: item.x + info.offset.x,
          y: item.y + info.offset.y
        });
      }}
      whileDrag={{ scale: 1.05 }}
      initial={{ x: item.x || 50, y: item.y || 50 }}
      animate={{ 
        x: item.x || 50, 
        y: item.y || 50, 
        rotate: (item.rotation || 0) + gesture.rotation,
        scale: (item.scale || 1) * gesture.scale
      }}
      style={{
        position: 'absolute',
        zIndex: item.zIndex,
        cursor: 'move',
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {item.mode === 'polaroid' ? (
        <div className="bg-white p-4 shadow-2xl select-none">
          <img
            src={item.photo.url}
            alt={item.photo.filename}
            className="w-48 h-48 sm:w-64 sm:h-64 object-cover pointer-events-none"
            draggable={false}
          />
          {item.captionText && (
            <p className="mt-2 text-center text-gray-800 font-handwriting">
              {item.captionText}
            </p>
          )}
        </div>
      ) : (
        <img
          src={item.photo.url}
          alt={item.photo.filename}
          className="w-48 h-48 sm:w-64 sm:h-64 object-cover shadow-lg select-none pointer-events-none"
          draggable={false}
        />
      )}
    </motion.div>
  );
};