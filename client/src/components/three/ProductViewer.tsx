import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, MeshDistortMaterial, Html } from '@react-three/drei';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';
import type { Product } from '@shared/types';

interface ModelProps {
  url: string;
  format: string;
}

function Model({ url, format }: ModelProps) {
  const gltf = useGLTF(url, format === 'glb' || format === 'gltf' || format === 'gltf+json');
  return <primitive object={gltf.scene} scale={1.1} position={[0, -1, 0]} />;
}

function FallbackSilhouette() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const elapsed = state.clock.getElapsedTime();
    group.current.rotation.y = elapsed * 0.25;
  });

  return (
    <group ref={group}>
      <mesh position={[0, -0.2, 0]}>
        <torusKnotGeometry args={[0.9, 0.28, 160, 24]} />
        <MeshDistortMaterial color="#101010" roughness={0.3} metalness={0.6} distort={0.35} speed={1.4} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.15} emissive="#c9a227" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function ViewerContent({ product }: { product: Product }) {
  const model = product.models?.[0];
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.8} color="#fff4d6" />
      <directionalLight position={[-5, -2, -3]} intensity={0.6} color="#c9a227" />
      <pointLight position={[0, 2, 3]} intensity={0.8} color="#f5d061" />
      <Suspense
        fallback={
          <Html center>
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </Html>
        }
      >
        {model?.url ? (
          <Model url={model.url} format={model.format} />
        ) : (
          <FallbackSilhouette />
        )}
      </Suspense>
      <ContactShadows position={[0, -1.7, 0]} opacity={0.5} scale={7} blur={2.4} far={2.8} color="#000000" />
      <Environment preset="city" />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={7} autoRotate autoRotateSpeed={0.8} />
    </>
  );
}

export function ProductViewer({ product, className }: { product: Product; className?: string }) {
  return (
    <div className={className ?? ''}>
      <Canvas camera={{ position: [0, 0.4, 5.5], fov: 40 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
        <ViewerContent product={product} />
      </Canvas>
    </div>
  );
}
