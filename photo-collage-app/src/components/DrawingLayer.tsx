import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, getDocs, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DrawingStroke, DrawingSettings, Album } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface DrawingLayerProps {
  album: Album;
  canvasTransform: { x: number; y: number; scale: number };
  containerWidth: number;
  containerHeight: number;
  settings: DrawingSettings;
  isDrawingMode: boolean;
  onStrokeComplete?: () => void;
}

export interface DrawingLayerRef {
  getDrawingDataURL: () => string | null;
  clearAllDrawings: () => Promise<void>;
  undoLastStroke: () => Promise<void>;
}

export const DrawingLayer = forwardRef<DrawingLayerRef, DrawingLayerProps>(({
  album,
  canvasTransform,
  containerWidth,
  containerHeight,
  settings,
  isDrawingMode,
  onStrokeComplete
}, ref) => {
  const { currentUser } = useAuth();
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<number[]>([]);
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);

  // Listen to Firestore for real-time drawing updates
  useEffect(() => {
    if (!album) return;

    const drawingsCollection = album.id === 'all-albums'
      ? collection(db, 'all-albums-collage-drawings')
      : collection(db, 'albums', album.id, 'drawings');

    const unsubscribe = onSnapshot(query(drawingsCollection), (snapshot) => {
      const loadedStrokes: DrawingStroke[] = [];
      snapshot.forEach((doc) => {
        loadedStrokes.push({ id: doc.id, ...doc.data() } as DrawingStroke);
      });
      setStrokes(loadedStrokes);
    });

    return () => unsubscribe();
  }, [album]);

  // Save stroke to Firestore
  const saveStroke = async (points: number[], tool: 'brush' | 'eraser', color: string, size: number) => {
    if (!currentUser || points.length < 4) return; // Need at least 2 points (x,y pairs)

    try {
      const drawingsCollection = album.id === 'all-albums'
        ? collection(db, 'all-albums-collage-drawings')
        : collection(db, 'albums', album.id, 'drawings');

      await addDoc(drawingsCollection, {
        tool,
        points,
        color,
        size,
        timestamp: new Date(),
        userId: currentUser.uid
      });

      if (onStrokeComplete) {
        onStrokeComplete();
      }
    } catch (error) {
      console.error('Error saving drawing stroke:', error);
    }
  };

  // Clear all drawings
  const clearAllDrawings = async () => {
    try {
      const drawingsCollection = album.id === 'all-albums'
        ? collection(db, 'all-albums-collage-drawings')
        : collection(db, 'albums', album.id, 'drawings');

      const snapshot = await getDocs(query(drawingsCollection));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing drawings:', error);
    }
  };

  // Undo last stroke by current user
  const undoLastStroke = async () => {
    if (!currentUser) return;

    try {
      const drawingsCollection = album.id === 'all-albums'
        ? collection(db, 'all-albums-collage-drawings')
        : collection(db, 'albums', album.id, 'drawings');

      // Query for the most recent stroke by this user
      const q = query(
        drawingsCollection,
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
      }
    } catch (error) {
      console.error('Error undoing stroke:', error);
    }
  };

  // Handle drawing start
  const handleMouseDown = (e: any) => {
    if (!isDrawingMode) return;

    isDrawing.current = true;
    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Get position relative to the transformed stage
    // Since the stage is already transformed with canvas transform,
    // we need to get the position in stage coordinates
    const layer = stage.children[0];
    if (!layer) return;

    const transform = layer.getAbsoluteTransform().copy();
    transform.invert();
    const stagePos = transform.point(pos);

    setCurrentStroke([stagePos.x, stagePos.y]);
  };

  // Handle drawing move
  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !isDrawingMode) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Get position relative to the transformed stage
    const layer = stage.children[0];
    if (!layer) return;

    const transform = layer.getAbsoluteTransform().copy();
    transform.invert();
    const stagePos = transform.point(pos);

    setCurrentStroke(prev => [...prev, stagePos.x, stagePos.y]);
  };

  // Handle drawing end
  const handleMouseUp = () => {
    if (!isDrawing.current || !isDrawingMode) return;

    isDrawing.current = false;

    // Save the stroke to Firestore
    if (currentStroke.length >= 4) {
      saveStroke(currentStroke, settings.tool, settings.color, settings.size);
    }

    setCurrentStroke([]);
  };

  // Get the stage as a data URL for export
  const getDrawingDataURL = () => {
    if (stageRef.current) {
      return stageRef.current.toDataURL();
    }
    return null;
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getDrawingDataURL,
    clearAllDrawings,
    undoLastStroke
  }));

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        touchAction: isDrawingMode ? 'none' : 'auto',
        zIndex: isDrawingMode ? 100 : 10
      }}
    >
      {/* @ts-ignore - react-konva types issue */}
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer
          x={canvasTransform.x}
          y={canvasTransform.y}
          scaleX={canvasTransform.scale}
          scaleY={canvasTransform.scale}
        >
          {/* Render all saved strokes */}
          {strokes.map((stroke) => (
            <Line
              key={stroke.id}
              points={stroke.points}
              stroke={stroke.tool === 'eraser' ? '#f3f4f6' : stroke.color}
              strokeWidth={stroke.size / canvasTransform.scale}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          ))}

          {/* Render current stroke being drawn */}
          {currentStroke.length >= 4 && (
            <Line
              points={currentStroke}
              stroke={settings.tool === 'eraser' ? '#f3f4f6' : settings.color}
              strokeWidth={settings.size / canvasTransform.scale}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                settings.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
});

DrawingLayer.displayName = 'DrawingLayer';
