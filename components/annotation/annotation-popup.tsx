"use client"

import React, { useEffect, useRef, useState } from 'react'
import { AnnotationType } from '@/lib/extensions/annotation/types'
import { MessageSquare, Search, Star } from 'lucide-react'

interface AnnotationPopupProps {
  position: { top: number; left: number }
  onAnnotate: (type: AnnotationType) => void
  onOutsideClick: () => void
}

export function AnnotationPopup({ position, onAnnotate, onOutsideClick }: AnnotationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [isMouseOver, setIsMouseOver] = useState(false)

  // Update popup position on mount and on position change
  useEffect(() => {
    if (popupRef.current) {
      // Ensure the popup is visible on screen
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const rect = popupRef.current.getBoundingClientRect();
      
      // Adjust if would go off bottom
      const bottomOverflow = position.top + rect.height - viewportHeight;
      if (bottomOverflow > 0) {
        popupRef.current.style.top = `${position.top - bottomOverflow - 10}px`;
      }
      
      // Adjust if would go off sides
      const rightOverflow = position.left + (rect.width / 2) - viewportWidth;
      const leftOverflow = (rect.width / 2) - position.left;
      
      if (rightOverflow > 0) {
        popupRef.current.style.left = `${position.left - rightOverflow - 10}px`;
        popupRef.current.style.transform = 'translateX(-40%)'; // Adjust the transform
      } else if (leftOverflow > 0) {
        popupRef.current.style.left = `${position.left + leftOverflow + 10}px`;
        popupRef.current.style.transform = 'translateX(-60%)'; // Adjust the transform
      }
    }
  }, [position]);

  // We rely on the parent component to handle clicks outside now
  // This component will only focus on rendering the popup and handling
  // clicks on the menu items

  // Handle annotation selection and prevent event bubbling
  const handleAnnotateClick = (type: AnnotationType) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onAnnotate(type);
  };

  // Prevent closing when interacting with the popup
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      id="insight-menu"
      ref={popupRef}
      className="annotation-popup"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        position: 'fixed', // Use fixed for screen-relative positioning
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: '6px',
        backgroundColor: 'white',
        width: 'auto',
        minWidth: '200px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        animation: 'popup-appear 0.15s ease-out',
        margin: 0,
        padding: '8px 0'
      }}
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => setIsMouseOver(false)}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer flex items-center border-b border-gray-100" 
        onClick={handleAnnotateClick(AnnotationType.ANNOTATION)}
      >
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mr-2">
          <MessageSquare className="text-white h-3 w-3" />
        </div>
        <span>Annotate Selection</span>
      </div>
      
      <div 
        className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer flex items-center border-b border-gray-100" 
        onClick={handleAnnotateClick(AnnotationType.EXPLORE)}
      >
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mr-2">
          <Search className="text-white h-3 w-3" />
        </div>
        <span>Explore with AI</span>
      </div>
      
      <div 
        className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer flex items-center" 
        onClick={handleAnnotateClick(AnnotationType.PROMOTE)}
      >
        <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center mr-2">
          <Star className="text-white h-3 w-3" />
        </div>
        <span>Promote to Branch</span>
      </div>
      
      {/* Add a small triangle/arrow pointing to the bulb icon */}
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '12px',
          height: '6px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '12px',
            height: '12px',
            backgroundColor: 'white',
            transform: 'rotate(45deg)',
            transformOrigin: 'center',
            boxShadow: '0 0 4px rgba(0, 0, 0, 0.1)',
            marginTop: '4px'
          }}
        />
      </div>
      
      {/* Add global style for animation */}
      <style jsx global>{`
        @keyframes popup-appear {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
} 