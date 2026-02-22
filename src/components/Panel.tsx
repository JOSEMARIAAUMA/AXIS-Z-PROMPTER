import React from 'react';

interface PanelProps {
  title?: string;
  width: number;
  minWidth?: number;
  children: React.ReactNode;
  className?: string;
  onResizeStart?: (e: React.MouseEvent) => void;
  showResizeHandle?: boolean;
  headerActions?: React.ReactNode; // New prop for header buttons
}

export const Panel: React.FC<PanelProps> = ({
  title,
  width,
  children,
  className = '',
  onResizeStart,
  showResizeHandle = true,
  headerActions
}) => {
  return (
    <div
      style={{ width: `${width}%` }}
      className={`relative flex flex-col h-full border-r border-arch-800 bg-arch-900 ${className}`}
    >
      {/* Header */}
      {title && (
        <div className="h-12 border-b border-arch-800 flex items-center justify-between px-4 bg-arch-950 shrink-0">
          <h2 className="text-sm font-semibold tracking-wide text-arch-200 uppercase truncate mr-2">{title}</h2>
          {headerActions && (
            <div className="flex items-center">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Content - Removed overflow-hidden to allow dropdowns to spill over */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {children}
      </div>

      {/* Resize Handle */}
      {showResizeHandle && onResizeStart && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-accent-500 cursor-col-resize z-50 transition-all flex items-center justify-center group"
          onMouseDown={onResizeStart}
        >
          <div className="w-0.5 h-8 bg-arch-700 group-hover:bg-white rounded-full transition-colors" />
        </div>
      )}
    </div>
  );
};