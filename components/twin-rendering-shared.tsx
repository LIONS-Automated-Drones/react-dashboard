import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

export interface DigitalTwinData {
    // made nullable so we can snapshot even if only some are present
    pointCloudData: PointCloudData | null
    pathData: PathData | null
    poseData: PoseData | null
    worldMemoryData?: WorldMemoryData | null
}

export interface PointCloudData {
    vertices: Float32Array | number[] // Accept plain arrays from deserialized snapshots
    // ✅ accept either; live stream could be bytes (0..255) or floats (0..1 or 0..255)
    colors?: Float32Array | Uint8Array | number[]
    timestamp: number
  }
export interface PoseData {
    position: { x: number; y: number; z: number }
    orientation: { x: number; y: number; z: number; w: number }
    covariance: number[]
    timestamp: number
    frame_id: string
  }
  
export interface PathData {
    poses: Array<{
      position: { x: number; y: number; z: number }
      orientation: { x: number; y: number; z: number; w: number }
    }>
    timestamp: number
    frame_id: string
    num_poses: number
}

export interface WorldMemoryData {
    [object_id: string]: {
      class_name: string
      map_coords: {
        x: number
        y: number
        z: number
      }
    }
}

// Coerce positions from deserialized JSON back to Float32Array
function coercePositions(src: any): Float32Array | null {
  if (!src) return null;
  if (src instanceof Float32Array) return src;
  if (Array.isArray(src)) return new Float32Array(src);
  // Handle objects coming from JSON that look like {0:..., length:...}
  if (typeof src === "object" && "length" in src) return new Float32Array(Array.from(src as ArrayLike<number>));
  return null;
}

// Coerce colors from deserialized JSON back to typed arrays
function coerceColors(src: any): { array: Float32Array | Uint8Array; itemSize: number; normalized?: boolean } | null {
  if (!src) return null;

  // Already a typed array?
  if (src instanceof Uint8Array) {
    // 0..255 — tell three.js to normalize to 0..1
    return { array: src, itemSize: 3, normalized: true };
  }
  if (src instanceof Float32Array) {
    // Could be 0..1 or accidentally 0..255; detect and fix
    let needsDivide = false;
    for (let i = 0; i < Math.min(src.length, 90); i++) {
      if (src[i] > 1.0) { needsDivide = true; break; }
    }
    if (needsDivide) {
      const out = new Float32Array(src.length);
      for (let i = 0; i < src.length; i++) out[i] = src[i] / 255;
      return { array: out, itemSize: 3 };
    }
    return { array: src, itemSize: 3 };
  }

  // Plain array from JSON
  if (Array.isArray(src)) {
    // Assume 0..1 floats (most common after JSON). If you stored 0..255, convert here:
    let needsDivide = false;
    for (let i = 0; i < Math.min(src.length, 90); i++) {
      if (src[i] > 1.0) { needsDivide = true; break; }
    }
    const f32 = new Float32Array(src.length); 
    if (needsDivide) {
      for (let i = 0; i < src.length; i++) f32[i] = (src[i] as number) / 255;
    } else {
      for (let i = 0; i < src.length; i++) f32[i] = src[i] as number;
    }
    return { array: f32, itemSize: 3 };
  }

  // Array-like from JSON'd typed arrays
  if (typeof src === "object" && "length" in src) {
    const arr = Array.from(src as ArrayLike<number>);
    return coerceColors(arr);
  }

  return null;
}
  

export function PointCloud({ data }: { data: PointCloudData | null }) {
    const meshRef = useRef<THREE.Points>(null)
  
    useEffect(() => {
      if (!meshRef.current) return
  
      // dispose previous geometry if we're about to replace it
      if (meshRef.current.geometry) {
        meshRef.current.geometry.dispose()
        meshRef.current.geometry = new THREE.BufferGeometry()
      }
  
      if (!data) {
        // show a placeholder cube when empty
        const g = new THREE.BoxGeometry(2, 2, 2)
        const m = new THREE.MeshStandardMaterial({ color: "gray", wireframe: true })
        // Render a mesh inside a <points> is invalid; fall back to no-geometry on points
        // We simply leave the <points> empty; the outer placeholder is handled in JSX below
        g.dispose()
        m.dispose()
        return
      }
  
      const { vertices: rawVertices, colors: rawColors } = data
      const geom = new THREE.BufferGeometry()
  
      // Coerce positions (handles deserialized arrays from snapshots)
      const vertices = coercePositions(rawVertices)
      if (!vertices) {
        console.warn("Failed to coerce vertices to Float32Array")
        return
      }
  
      // positions
      geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3))
  
      // colors (optional but preferred)
      const coercedColors = coerceColors(rawColors)
      if (coercedColors) {
        const attr = new THREE.BufferAttribute(
          coercedColors.array, 
          coercedColors.itemSize,
          coercedColors.normalized ?? false
        )
        geom.setAttribute("color", attr)
      }
  
      meshRef.current.geometry = geom
  
      return () => {
        geom.dispose()
      }
    }, [data])
  
    if (!data) {
      return (
        <group>
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="gray" wireframe />
          </mesh>
        </group>
      )
    }
  
    return (
      <points ref={meshRef}>
        {/* geometry + attributes are assigned imperatively */}
        <pointsMaterial size={0.05} vertexColors toneMapped={false} sizeAttenuation />
      </points>
    )
  }
  
  // Path Line Component - renders the green trajectory
  export function PathLine({ data }: { data: PathData | null }) {
    const points = useMemo(() => {
      if (!data || data.poses.length === 0) return []
      return data.poses.map(
        pose => new THREE.Vector3(pose.position.x, pose.position.z, -pose.position.y)
      )
    }, [data])
  
    if (points.length === 0) return null
  
    return (
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff00" />
      </line>
    )
  }
  
  // Pose Indicator Component - renders the purple cloud and red arrow
  export function PoseIndicator({ data }: { data: PoseData | null }) {
    const groupRef = useRef<THREE.Group>(null)
  
    useEffect(() => {
      if (groupRef.current && data) {
        const quaternion = new THREE.Quaternion(
          data.orientation.x,
          data.orientation.z,
          -data.orientation.y,
          data.orientation.w
        )
        groupRef.current.quaternion.copy(quaternion)
        groupRef.current.position.set(data.position.x, data.position.z, -data.position.y)
      }
    }, [data])
  
    if (!data) return null
  
    // Extract position uncertainty from covariance matrix
    // Covariance is a 6x6 matrix (36 elements), diagonal elements are variances
    const covX = Math.sqrt(Math.abs(data.covariance[0])) // variance in x
    const covY = Math.sqrt(Math.abs(data.covariance[7])) // variance in y
    const covZ = Math.sqrt(Math.abs(data.covariance[14])) // variance in z
  
    // Scale factors for visualization (clamped to reasonable size)
    const scaleX = Math.min(Math.max(covX * 2, 0.2), 0.5)
    const scaleY = Math.min(Math.max(covY * 2, 0.2), 0.5)
    const scaleZ = Math.min(Math.max(covZ * 2, 0.2), 0.5)
  
    return (
      <group ref={groupRef}>
        {/* Purple ellipsoid representing position uncertainty */}
        <mesh scale={[scaleX, scaleZ, scaleY]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial 
            color="#9b59b6" 
            transparent 
            opacity={0.5}
            emissive="#9b59b6"
            emissiveIntensity={0.3}
          />
        </mesh>
        
        {/* Red arrow showing orientation */}
        <group scale={0.5}>
          {/* Arrow shaft */}
          <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
          {/* Arrow head */}
          <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.12, 0.25, 8]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
        </group>
      </group>
    )
  }

  // World Memory Objects Component - renders detected objects as pink spheres
  export function WorldMemoryObjects({ data }: { data: WorldMemoryData | null }) {
    const spheres = useMemo(() => {
      if (!data) return []
      
      return Object.entries(data).map(([object_id, obj]) => ({
        id: object_id,
        class_name: obj.class_name,
        // Convert ROS coordinates (x, y, z) to Three.js coordinates (x, z, -y)
        position: new THREE.Vector3(
          obj.map_coords.x,
          obj.map_coords.z,
          -obj.map_coords.y
        )
      }))
    }, [data])
  
    if (spheres.length === 0) return null
  
    return (
      <group>
        {spheres.map(sphere => (
          <mesh key={sphere.id} position={sphere.position}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial 
              color="#ff1493" // Deep pink
              transparent 
              opacity={0.7}
              emissive="#ff1493"
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}
      </group>
    )
  }