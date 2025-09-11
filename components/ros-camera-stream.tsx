'use client';

import { useMemo, useState } from 'react';

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
  topic = process.env.NEXT_PUBLIC_ROS_IMAGE_TOPIC || '/stereo/right',
  className = 'w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow'
}: Props) {
  const [reloadKey, setReloadKey] = useState(0);

  const src = useMemo(() => {
    const url = `${baseUrl}/stream?topic=${topic}&qos_profile=sensor_data&quality=25`;
    return url;
  }, [baseUrl, topic]);

  return (
    <img
      key={reloadKey}
      src={src}
      alt={`ROS stream ${topic}`}
      className={className}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        console.error("Failed to load:", img.src);
        setReloadKey((k) => k + 1);
      }}
    />
  );
}
