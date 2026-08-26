import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

export type GuideStage = 'idle' | 'email' | 'password' | 'submitting' | 'success' | 'error';

const SKIN = '#e8b58c';
const HAIR = '#f0c65c';
const SHIRT = '#f5f0e0';
const PANTS = '#0e2a1a';
const SHOE = '#f5f0e0';
const BAG = '#7a4a24';

/** Low-poly character assembled from primitives — walks in, then reacts to the form. */
const Character = ({ stage }: { stage: GuideStage }) => {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const bag = useRef<THREE.Group>(null);

  const entry = useRef(0); // 0 -> 1 walk-in progress
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(delta, 0.05);
    entry.current = Math.min(1, entry.current + d * 0.5);
    const e = entry.current;
    const walking = e < 1;

    if (root.current) {
      root.current.position.x = lerp(-3.4, 0, THREE.MathUtils.smoothstep(e, 0, 1));
      root.current.rotation.y = lerp(
        root.current.rotation.y,
        walking ? Math.PI / 2 : stage === 'password' ? 0.15 : stage === 'email' ? -0.1 : 0,
        d * 4,
      );
      root.current.position.y = walking ? Math.abs(Math.sin(t * 8)) * 0.05 : Math.sin(t * 1.6) * 0.02;
    }

    const swing = walking ? Math.sin(t * 8) * 0.7 : Math.sin(t * 1.6) * 0.06;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;

    // Arms
    const coverEyes = stage === 'password';
    const cheer = stage === 'success';
    const targetArm = walking ? -swing : coverEyes ? -2.42 : cheer ? -2.9 : stage === 'submitting' ? -0.9 : -0.15;
    const armZ = coverEyes ? -0.3 : cheer ? 0.5 : 0.12;
    if (armL.current) {
      armL.current.rotation.x = lerp(armL.current.rotation.x, walking ? -swing : targetArm, d * 6);
      armL.current.rotation.z = lerp(armL.current.rotation.z, armZ, d * 6);
    }
    if (armR.current) {
      armR.current.rotation.x = lerp(armR.current.rotation.x, walking ? swing : targetArm, d * 6);
      armR.current.rotation.z = lerp(armR.current.rotation.z, -armZ, d * 6);
    }


    if (head.current) {
      const lookY = stage === 'email' ? 0.35 : stage === 'password' ? 0.15 : 0;
      const lookX = stage === 'email' ? 0.12 : stage === 'password' ? 0.22 : stage === 'success' ? -0.2 : 0;
      head.current.rotation.y = lerp(head.current.rotation.y, walking ? 0 : lookY, d * 5);
      head.current.rotation.x = lerp(head.current.rotation.x, walking ? 0 : lookX, d * 5);
      head.current.rotation.z =
        stage === 'error' ? Math.sin(t * 12) * 0.12 : lerp(head.current.rotation.z, 0, d * 6);
    }

    if (torso.current) {
      torso.current.position.y = cheer ? Math.abs(Math.sin(t * 5)) * 0.12 : 0;
      torso.current.rotation.y = stage === 'submitting' ? Math.sin(t * 3) * 0.08 : lerp(torso.current.rotation.y, 0, d * 4);
    }

    if (bag.current) {
      bag.current.visible = e < 0.98;
      bag.current.rotation.x = swing * 0.4;
    }
  });

  const mat = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.6 }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.5 }),
      shirt: new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.75 }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.8 }),
      shoe: new THREE.MeshStandardMaterial({ color: SHOE, roughness: 0.6 }),
      bag: new THREE.MeshStandardMaterial({ color: BAG, roughness: 0.7 }),
      eye: new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.3 }),
    }),
    [],
  );

  return (
    <group ref={root} position={[0, 0, 0]}>
      <group ref={torso}>
        {/* Head */}
        <group ref={head} position={[0, 1.62, 0]}>
          <mesh material={mat.skin} castShadow>
            <sphereGeometry args={[0.24, 32, 32]} />
          </mesh>
          <mesh material={mat.hair} position={[0, 0.07, -0.01]} castShadow>
            <sphereGeometry args={[0.25, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
          </mesh>
          <mesh material={mat.eye} position={[0.08, 0.02, 0.225]}>
            <sphereGeometry args={[0.026, 16, 16]} />
          </mesh>
          <mesh material={mat.eye} position={[-0.08, 0.02, 0.225]}>
            <sphereGeometry args={[0.026, 16, 16]} />
          </mesh>
        </group>

        {/* Neck + torso */}
        <mesh material={mat.skin} position={[0, 1.42, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.1, 16]} />
        </mesh>
        <mesh material={mat.shirt} position={[0, 1.12, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.42, 8, 24]} />
        </mesh>

        {/* Arms — pivot at shoulder */}
        <group ref={armL} position={[0.23, 1.3, 0]}>
          <mesh material={mat.shirt} position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.3, 6, 16]} />
          </mesh>
          <mesh material={mat.skin} position={[0, -0.45, 0]}>
            <sphereGeometry args={[0.072, 16, 16]} />
          </mesh>
        </group>
        <group ref={armR} position={[-0.23, 1.3, 0]}>
          <mesh material={mat.shirt} position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.3, 6, 16]} />
          </mesh>
          <mesh material={mat.skin} position={[0, -0.45, 0]}>
            <sphereGeometry args={[0.072, 16, 16]} />
          </mesh>
        </group>

        {/* Legs */}
        <group ref={legL} position={[0.1, 0.82, 0]}>
          <mesh material={mat.pants} position={[0, -0.34, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.5, 6, 16]} />
          </mesh>
          <mesh material={mat.shoe} position={[0, -0.68, 0.05]} castShadow>
            <boxGeometry args={[0.16, 0.1, 0.28]} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.1, 0.82, 0]}>
          <mesh material={mat.pants} position={[0, -0.34, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.5, 6, 16]} />
          </mesh>
          <mesh material={mat.shoe} position={[0, -0.68, 0.05]} castShadow>
            <boxGeometry args={[0.16, 0.1, 0.28]} />
          </mesh>
        </group>
      </group>

      {/* Briefcase carried during the walk-in */}
      <group ref={bag} position={[-0.34, 0.82, 0]}>
        <mesh material={mat.bag} castShadow>
          <boxGeometry args={[0.3, 0.24, 0.1]} />
        </mesh>
        <mesh material={mat.bag} position={[0, 0.16, 0]}>
          <torusGeometry args={[0.07, 0.015, 8, 20, Math.PI]} />
        </mesh>
      </group>
    </group>
  );
};

interface Props {
  stage: GuideStage;
  className?: string;
}

/** 3D guide that reacts to the sign-in form. */
export const AuthGuideCharacter = ({ stage, className }: Props) => {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) return null;

  return (
    <div className={className} aria-hidden>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.5, 5.2], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2.5, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#c9a84c" />
          <hemisphereLight args={['#f5e7c4', '#3a2c18', 0.55]} />
          <pointLight position={[0, 2.5, 2]} intensity={0.6} color="#fff6e0" />
          <group scale={0.72} position={[0, 0.05, 0]}><Character stage={stage} /></group>
          <ContactShadows position={[0, 0.02, 0]} opacity={0.4} scale={6} blur={2.4} far={2} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default AuthGuideCharacter;
