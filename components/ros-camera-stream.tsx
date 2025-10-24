'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { eventBus } from '@/lib/eventBus';

type Props = {
  baseUrl?: string;
  topic?: string;
  type?: 'mjpeg' | 'h264' | 'vp8' | 'vp9' | 'png';
  width?: number;
  height?: number;
  quality?: number; // 1..100 (MJPEG/PNG)
  qos?: 'default' | 'sensor_data' | 'system_default' | 'services_default';
  className?: string;
};

export default function RosCameraStream({
  baseUrl = process.env.NEXT_PUBLIC_ROS_STREAM_BASE_URL || 'http://localhost:8080',
  topic = '/stereo/right',
  className = 'w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow'
}: Props) {
  const [reloadKey, setReloadKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const src = useMemo(() => {
    const url = `${baseUrl}/stream?topic=${topic}&qos_profile=sensor_data&quality=25`;
    return url;
  }, [baseUrl, topic]);

  const captureScreenshot = () => {
    if (!imgRef.current) {
      console.error('Image ref not available');
      return;
    }

    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const img = imgRef.current;

      // Set canvas size to match the image's natural size
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      // Draw the image onto the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); 
        const cameraName = topic.split('/').pop() || 'camera';
        link.download = `drone-${cameraName}-${timestamp}.png`;
        link.href = url;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log(`Screenshot saved: ${link.download}`);
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    }
  };

  // Listen for screenshot events
  useEffect(() => {
    const handler = () => {
      console.log('Received captureScreenshot event');
      captureScreenshot();
    };
    
    eventBus.on('captureScreenshot', handler);
    
    return () => {
      eventBus.off('captureScreenshot', handler);
    };
  }, [topic]);

  return (
    <img
      ref={imgRef}
      key={reloadKey}
      src={src}
      alt={`ROS stream ${topic}`}
      className={className}
      crossOrigin="anonymous"
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        console.error("Failed to load:", img.src);
        setReloadKey((k) => k + 1);
      }}
    />
  );
}
