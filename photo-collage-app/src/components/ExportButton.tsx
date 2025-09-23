import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Album } from '../types';

interface ExportButtonProps {
  album: Album;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ album }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSelectionTool, setShowSelectionTool] = useState(false);
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const exportFullCollage = async (format: 'image' | 'pdf') => {
    setIsExporting(true);

    try {
      // Target the actual collage canvas with images
      const collageElement = document.getElementById('collage-export-canvas') ||
                            document.querySelector('#collage-export-canvas') ||
                            document.querySelector('main');
      if (!collageElement) {
        throw new Error('Collage element not found');
      }

      const canvas = await html2canvas(collageElement as HTMLElement, {
        backgroundColor: '#f3f4f6',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000
      });

      if (format === 'image') {
        // Download as image
        const link = document.createElement('a');
        link.download = `${album.name}_collage_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else {
        // Download as PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${album.name}_collage_${new Date().getTime()}.pdf`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export collage');
    } finally {
      setIsExporting(false);
    }
  };

  const exportSelectedArea = async (format: 'image' | 'pdf') => {
    setIsExporting(true);
    
    try {
      const collageElement = document.querySelector('.collage-canvas') || document.querySelector('main');
      if (!collageElement) {
        throw new Error('Collage element not found');
      }

      const canvas = await html2canvas(collageElement as HTMLElement, {
        backgroundColor: '#f3f4f6',
        scale: 2,
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000
      });

      if (format === 'image') {
        // Download as image
        const link = document.createElement('a');
        link.download = `${album.name}_collage_selection_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else {
        // Download as PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${album.name}_collage_selection_${new Date().getTime()}.pdf`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export selection');
    } finally {
      setIsExporting(false);
      setShowSelectionTool(false);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!showSelectionTool) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    startPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setIsSelecting(true);
    setSelectionRect({ x: startPos.current.x, y: startPos.current.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !showSelectionTool) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    setSelectionRect({
      x: Math.min(startPos.current.x, currentX),
      y: Math.min(startPos.current.y, currentY),
      width: Math.abs(currentX - startPos.current.x),
      height: Math.abs(currentY - startPos.current.y)
    });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isExporting}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </button>

        {/* Export Options Dropdown */}
        {showDropdown && !showSelectionTool && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
            <button
              onClick={() => {
                exportFullCollage('image');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Export as Image
            </button>
            <button
              onClick={() => {
                exportFullCollage('pdf');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Export as PDF
            </button>
            <hr className="my-1" />
            <button
              onClick={() => {
                setShowSelectionTool(true);
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Select Area to Export
            </button>
          </div>
        )}
      </div>

      {/* Selection Tool Overlay */}
      {showSelectionTool && (
        <div
          className="fixed inset-0 z-50 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute inset-0 bg-black bg-opacity-30" />
          
          {/* Selection Rectangle */}
          {selectionRect.width > 0 && selectionRect.height > 0 && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10"
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}

          {/* Selection Controls */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-lg">
            <p className="mb-2">Drag to select area to export</p>
            <div className="flex gap-2">
              <button
                onClick={() => exportSelectedArea('image')}
                disabled={selectionRect.width === 0}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Export Selection as Image
              </button>
              <button
                onClick={() => exportSelectedArea('pdf')}
                disabled={selectionRect.width === 0}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Export Selection as PDF
              </button>
              <button
                onClick={() => {
                  setShowSelectionTool(false);
                  setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
                }}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};