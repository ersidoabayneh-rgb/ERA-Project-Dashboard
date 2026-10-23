import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ColumnResizerProps {
  columnId: 'colEngineerWidth' | 'colContractorWidth' | 'colFirmWidth';
  currentWidth: number; // percentage
  onWidthChange: (newWidth: number) => void;
  className?: string;
}

export const ColumnResizer: React.FC<ColumnResizerProps> = ({
  columnId,
  currentWidth,
  onWidthChange,
  className = ""
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = currentWidth;
  }, [currentWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX.current;
      
      // Find the closest table to get its width
      const resizerElement = document.getElementById(`resizer-${columnId}`);
      const table = resizerElement?.closest('table');
      
      if (table) {
        const tableWidth = table.offsetWidth;
        if (tableWidth > 0) {
          const deltaPercent = (deltaX / tableWidth) * 100;
          let newWidth = startWidth.current + deltaPercent;
          
          // Clamp between 5% and 80%
          if (newWidth < 5) newWidth = 5;
          if (newWidth > 80) newWidth = 80;
          
          onWidthChange(newWidth);
        }
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, onWidthChange, columnId]);

  return (
    <div
      id={`resizer-${columnId}`}
      onMouseDown={onMouseDown}
      className={`col-resizer ${isResizing ? 'resizing' : ''} ${className}`}
      title="Drag to resize column"
    />
  );
};
