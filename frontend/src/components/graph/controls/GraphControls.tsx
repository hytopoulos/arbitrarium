import React from 'react';
import { FiZoomIn, FiZoomOut, FiRefreshCw, FiPause, FiPlay } from 'react-icons/fi';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onPause: () => void;
  isPaused: boolean;
  className?: string;
}

/**
 * Component that provides controls for the graph (zoom, reset, pause/play)
 */
const GraphControls: React.FC<GraphControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPause,
  isPaused,
  className = '',
}) => {
  return (
    <div className={`graph-controls ${className}`}>
      <div className="flex flex-col space-y-2 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <FiZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <FiZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        
        <div className="border-t border-gray-200 my-1"></div>
        
        <button
          onClick={onResetZoom}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Reset zoom"
          title="Reset zoom"
        >
          <FiRefreshCw className="w-5 h-5 text-gray-700" />
        </button>
        
        <div className="border-t border-gray-200 my-1"></div>
        
        <button
          onClick={onPause}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
          title={isPaused ? 'Resume simulation' : 'Pause simulation'}
        >
          {isPaused ? (
            <FiPlay className="w-5 h-5 text-gray-700" />
          ) : (
            <FiPause className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>
    </div>
  );
};

export { GraphControls };

// Add some basic styles for the controls
const styles = `
  .graph-controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 10;
  }
  
  .graph-controls button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }
`;

// Add styles to the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
