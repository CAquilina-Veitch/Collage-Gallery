import React from 'react';
import ReactDOM from 'react-dom';
import { DrawingSettings } from '../types';

interface DrawingToolbarProps {
  settings: DrawingSettings;
  onSettingsChange: (settings: DrawingSettings) => void;
  onClearAll: () => void;
  onUndo: () => void;
  isVisible: boolean;
}

const PRESET_COLORS = [
  '#000000', // Black
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#FBBF24', // Yellow
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
];

const BRUSH_SIZES = [
  { label: 'XS', value: 2 },
  { label: 'S', value: 5 },
  { label: 'M', value: 10 },
  { label: 'L', value: 15 },
  { label: 'XL', value: 25 },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  settings,
  onSettingsChange,
  onClearAll,
  onUndo,
  isVisible
}) => {
  const handleColorChange = (color: string) => {
    onSettingsChange({ ...settings, color });
  };

  const handleSizeChange = (size: number) => {
    onSettingsChange({ ...settings, size });
  };

  const handleToolChange = (tool: 'brush' | 'eraser') => {
    onSettingsChange({ ...settings, tool });
  };

  const handleClearAllClick = () => {
    if (window.confirm('Are you sure you want to clear all drawings? This cannot be undone.')) {
      onClearAll();
    }
  };

  return ReactDOM.createPortal(
    <div
      className="bg-white border-t-2 border-gray-300 shadow-2xl overflow-y-auto"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxHeight: '30vh',
        zIndex: 99999,
        backgroundColor: 'white',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        visibility: isVisible ? 'visible' : 'hidden',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        WebkitTransform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out, visibility 0.3s',
        WebkitTransition: 'transform 0.3s ease-out, opacity 0.3s ease-out, visibility 0.3s',
        pointerEvents: isVisible ? 'auto' : 'none',
        touchAction: 'manipulation',
        willChange: 'transform, opacity'
      }}
    >
      <div className="p-4 space-y-4">
        {/* Tool Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Tool</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleToolChange('brush')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-base min-h-[44px] ${
                settings.tool === 'brush'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✏️ Brush
            </button>
            <button
              onClick={() => handleToolChange('eraser')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-base min-h-[44px] ${
                settings.tool === 'eraser'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🧹 Eraser
            </button>
          </div>
        </div>

        {/* Color Picker (only show for brush) */}
        {settings.tool === 'brush' && (
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className="transition-transform hover:scale-110"
                  style={{
                    width: '44px',
                    height: '44px',
                    backgroundColor: color,
                    border: settings.color === color ? '3px solid #3B82F6' : '2px solid #D1D5DB',
                    borderRadius: '8px',
                    boxShadow: settings.color === color ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                    cursor: 'pointer'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Brush Size */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Size: {settings.size}px
          </label>
          <div className="flex gap-2">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => handleSizeChange(size.value)}
                className={`flex-1 px-3 py-3 rounded-lg font-medium transition-colors text-base min-h-[44px] ${
                  settings.size === size.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-base min-h-[44px]"
          >
            ↶ Undo
          </button>
          <button
            onClick={handleClearAllClick}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors text-base min-h-[44px]"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
