import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, MeshDistortMaterial, Html } from '@react-three/drei';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';
import type { Product } from '@shared/types';
import { getCssVar } from '@/lib/theme-engine';
import { useServerTheme } from '@/context/ServerThemeContext';

interface ModelProps {
  url: string;
  format: string;
}

function readThemeVars() {
  return {
    inkMuted: getCssVar('--ink-muted', '#0d0d0d'),
    gold: getCssVar('--gold', '#c9a227'),
    goldLight: getCssVar('--gold-light', '#f5d061'),
    ink: getCssVar('--ink', '#0a0a0a'),
  };
}

function Model({ url, format }: ModelProps) {
  const gltf = useGLTF(url, format === 'glb' || format === 'gltf' || format === 'gltf+json');
  return <primitive object={gltf.scene} scale={1.1} position={[0, -1, 0]} />;
}

function FallbackSilhouette({ vars }: { vars: ReturnType<typeof readThemeVars> }) {
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
        <MeshDistortMaterial color={vars.inkMuted} roughness={0.3} metalness={0.6} distort={0.35} speed={1.4} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial color={vars.gold} metalness={1} roughness={0.15} emissive={vars.gold} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function ViewerContent({ product, vars }: { product: Product; vars: ReturnType<typeof readThemeVars> }) {
  const model = product.models?.[0];
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.8} color={vars.goldLight} />
      <directionalLight position={[-5, -2, -3]} intensity={0.6} color={vars.gold} />
      <pointLight position={[0, 2, 3]} intensity={0.8} color={vars.goldLight} />
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
          <FallbackSilhouette vars={vars} />
        )}
      </Suspense>
      <ContactShadows position={[0, -1.7, 0]} opacity={0.5} scale={7} blur={2.4} far={2.8} color={vars.ink} />
      <Environment preset="city" />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={7} autoRotate autoRotateSpeed={0.8} />
    </>
  );
}

export function ProductViewer({ product, className }: { product: Product; className?: string }) {
  const { version } = useServerTheme();
  const vars = useMemo(readThemeVars, [version]);

  return (
    <div className={className ?? ''}>
      <Canvas camera={{ position: [0, 0.4, 5.5], fov: 40 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
        <ViewerContent product={product} vars={vars} />
      </Canvas>
    </div>
  );
}
