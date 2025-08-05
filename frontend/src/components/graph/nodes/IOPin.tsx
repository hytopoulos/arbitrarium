import React from 'react';
import { Element } from '../../../api/types';

interface IOPinProps {
  x: number;
  y: number;
  element: Element;
  isActive?: boolean;
  onMouseEnter: (e: React.MouseEvent, element: Element) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

const IOPin: React.FC<IOPinProps> = React.memo(({ 
  x, 
  y, 
  element, 
  isActive = false,
  onMouseEnter, 
  onMouseLeave, 
  onClick,
  onMouseDown
}) => {
  const handleMouseEnter = (e: React.MouseEvent) => {
    onMouseEnter(e, element);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e, element);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown?.(e);
  };

  return (
    <g
      className={`io-pin ${isActive ? 'active' : ''}`}
      transform={`translate(${x},${y})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <circle 
        r={4} 
        className="io-pin-circle" 
        fill={isActive ? '#4f46e5' : '#6b7280'}
        stroke="#fff"
        strokeWidth="1.5"
      />
      <title>{element.name}</title>
    </g>
  );
});

IOPin.displayName = 'IOPin';

export default IOPin;
