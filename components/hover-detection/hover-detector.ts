import { useEffect, useRef, useState, useCallback } from 'react';
import { HoverPosition, HoverState, HoverOptions, HoverCallback } from './hover-types';

export const useHoverDetector = ({
  delayMs = 300,
  hoverZoneSize = 40,
  containerId,
}: HoverOptions) => {
  const [hoverState, setHoverState] = useState<HoverState>({
    isHovering: false,
    duration: 0,
    position: { x: 0, y: 0 },
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const isHoveringRef = useRef(false);
  const lastPositionRef = useRef<HoverPosition>({ x: 0, y: 0 });
  const callbacksRef = useRef<HoverCallback[]>([]);
  
  // Function to determine if mouse is within hover zone
  const isInHoverZone = useCallback((mouseX: number, mouseY: number, targetX: number, targetY: number) => {
    const distance = Math.sqrt(
      Math.pow(mouseX - targetX, 2) + Math.pow(mouseY - targetY, 2)
    );
    return distance <= hoverZoneSize;
  }, [hoverZoneSize]);
  
  // Function to handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!targetRef.current) return;
    
    const { clientX, clientY } = e;
    
    // Calculate target position
    const targetRect = targetRef.current.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    
    // Check if mouse is within hover zone
    const hovering = isInHoverZone(clientX, clientY, targetX, targetY);
    
    // Update last position
    lastPositionRef.current = { x: clientX, y: clientY };
    
    // Handle hover start
    if (hovering && !isHoveringRef.current) {
      isHoveringRef.current = true;
      startTimeRef.current = Date.now();
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set timeout for hover delay
      timeoutRef.current = setTimeout(() => {
        if (isHoveringRef.current && startTimeRef.current) {
          const duration = Date.now() - startTimeRef.current;
          const newState = {
            isHovering: true,
            duration,
            position: lastPositionRef.current,
          };
          
          setHoverState(newState);
          
          // Notify callbacks
          callbacksRef.current.forEach(callback => callback(newState));
        }
      }, delayMs);
    }
    
    // Handle hover end
    if (!hovering && isHoveringRef.current) {
      isHoveringRef.current = false;
      startTimeRef.current = null;
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      const newState = {
        isHovering: false,
        duration: 0,
        position: lastPositionRef.current,
      };
      
      setHoverState(newState);
      
      // Notify callbacks
      callbacksRef.current.forEach(callback => callback(newState));
    }
  }, [delayMs, isInHoverZone]);
  
  // Set up the target element
  const setTargetElement = useCallback((element: HTMLElement | null) => {
    targetRef.current = element;
  }, []);
  
  // Add a callback function
  const addCallback = useCallback((callback: HoverCallback) => {
    callbacksRef.current.push(callback);
    
    // Return a function to remove the callback
    return () => {
      callbacksRef.current = callbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);
  
  // Set up event listeners
  useEffect(() => {
    let containerElement: HTMLElement | null = null;
    
    if (containerId) {
      containerElement = document.getElementById(containerId);
    }
    
    const element = containerElement || document;
    
    // Add mouse move listener
    element.addEventListener('mousemove', handleMouseMove);
    
    // Cleanup function
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [containerId, handleMouseMove]);
  
  return {
    hoverState,
    setTargetElement,
    addCallback,
  };
};
