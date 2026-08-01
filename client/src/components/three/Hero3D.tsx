import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { getCssVar } from '@/lib/theme-engine';
import { useServerTheme } from '@/context/ServerThemeContext';

function readThemeVars() {
  return {
    inkMuted: getCssVar('--ink-muted', '#0d0d0d'),
    gold: getCssVar('--gold', '#c9a227'),
    goldDark: getCssVar('--gold-dark', '#8a6d1d'),
    goldLight: getCssVar('--gold-light', '#f5d061'),
    ink: getCssVar('--ink', '#0a0a0a'),
  };
}

function SilkSculpture({
  pointer,
  vars,
}: {
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  vars: ReturnType<typeof readThemeVars>;
}) {
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
        color={vars.inkMuted}
        roughness={0.35}
        metalness={0.55}
        distort={0.45}
        speed={1.6}
        emissive={vars.goldDark}
        emissiveIntensity={0.06}
      />
    ),
    [vars],
  );

  return (
    <group ref={group}>
      <mesh>
        <torusKnotGeometry args={[1.15, 0.34, 220, 36]} />
        {clothMaterial}
      </mesh>
      <mesh position={[1.7, 0.9, -0.4]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color={vars.gold} metalness={1} roughness={0.15} emissive={vars.gold} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-1.8, -0.7, -0.3]}>
        <sphereGeometry args={[0.14, 32, 32]} />
        <meshStandardMaterial color={vars.gold} metalness={1} roughness={0.2} emissive={vars.gold} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.4, -1.6, 0.5]} rotation={[0.4, 0, 0.6]}>
        <torusGeometry args={[0.55, 0.05, 24, 80]} />
        <meshStandardMaterial color={vars.gold} metalness={1} roughness={0.25} emissive={vars.gold} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function Scene({
  pointer,
  vars,
}: {
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  vars: ReturnType<typeof readThemeVars>;
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 4]} intensity={1.6} color={vars.goldLight} />
      <directionalLight position={[-5, -2, -3]} intensity={0.5} color={vars.gold} />
      <pointLight position={[0, 0, 3]} intensity={0.6} color={vars.goldLight} />
      <Float speed={2} rotationIntensity={0.25} floatIntensity={0.6}>
        <Suspense fallback={null}>
          <SilkSculpture pointer={pointer} vars={vars} />
        </Suspense>
      </Float>
      <ContactShadows position={[0, -1.9, 0]} opacity={0.55} scale={8} blur={2.6} far={3} color={vars.ink} />
      <Environment preset="city" />
    </>
  );
}

export function Hero3D() {
  const pointer = useRef({ x: 0, y: 0 });
  const { version } = useServerTheme();
  const vars = useMemo(readThemeVars, [version]);

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
        <Scene pointer={pointer} vars={vars} />
      </Canvas>
    </div>
  );
}
