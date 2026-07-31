import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function SilkSculpture({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const elapsed = state.clock.getElapsedTime();
    group.current.rotation.y = elapsed * 0.08 + pointer.current.x * 0.35;
    group.current.rotation.x = Math.sin(elapsed * 0.15) * 0.12 + pointer.current.y * 0.25;
    const scale = 1 + Math.sin(elapsed * 0.4) * 0.03;
    group.current.scale.setScalar(scale);
  });

  const clothMaterial = useMemo(
    () => (
      <MeshDistortMaterial
        color="#0d0d0d"
        roughness={0.35}
        metalness={0.55}
        distort={0.45}
        speed={1.6}
        emissive="#8a6d1d"
        emissiveIntensity={0.06}
      />
    ),
    [],
  );

  return (
    <group ref={group}>
      <mesh>
        <torusKnotGeometry args={[1.15, 0.34, 220, 36]} />
        {clothMaterial}
      </mesh>
      <mesh position={[1.7, 0.9, -0.4]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.15} emissive="#c9a227" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-1.8, -0.7, -0.3]}>
        <sphereGeometry args={[0.14, 32, 32]} />
        <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.2} emissive="#c9a227" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.4, -1.6, 0.5]} rotation={[0.4, 0, 0.6]}>
        <torusGeometry args={[0.55, 0.05, 24, 80]} />
        <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.25} emissive="#c9a227" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function Scene({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 4]} intensity={1.6} color="#fff4d6" />
      <directionalLight position={[-5, -2, -3]} intensity={0.5} color="#c9a227" />
      <pointLight position={[0, 0, 3]} intensity={0.6} color="#f5d061" />
      <Float speed={2} rotationIntensity={0.25} floatIntensity={0.6}>
        <Suspense fallback={null}>
          <SilkSculpture pointer={pointer} />
        </Suspense>
      </Float>
      <ContactShadows position={[0, -1.9, 0]} opacity={0.55} scale={8} blur={2.6} far={3} color="#000000" />
      <Environment preset="city" />
    </>
  );
}

export function Hero3D() {
  const pointer = useRef({ x: 0, y: 0 });

  return (
    <div
      className="absolute inset-0"
      aria-hidden="true"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.current.y = -((event.clientY - rect.top) / rect.height - 0.5) * 2;
      }}
    >
      <Canvas
        camera={{ position: [0, 0.2, 6], fov: 42 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene pointer={pointer} />
      </Canvas>
    </div>
  );
}
