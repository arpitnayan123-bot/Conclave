"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Scene configuration                                                */
/* ------------------------------------------------------------------ */

const NODE_COUNT = 68;
const PARTICLE_COUNT = 700;
// champagne-gold palette (oklch(0.84 0.13 85) ≈ #e5b84b, highlight #f0dfae)
// with a deep-emerald minority for depth
const GOLD = new THREE.Color("#e5b84b");
const GOLD_LIGHT = new THREE.Color("#f0dfae");
const GOLD_DEEP = new THREE.Color("#8a6a1c");
const EMERALD = new THREE.Color("#34d399");
const EMERALD_DEEP = new THREE.Color("#0b5c46");

type ConclaveNode = {
  pos: THREE.Vector3;
  size: number;
  deep: boolean;
  bright: boolean;
  phase: number;
  speed: number;
};

/** Deterministic-enough pseudo-random so re-renders don't reflicker. */
function makeNodes(): ConclaveNode[] {
  const nodes: ConclaveNode[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    // uniform direction on sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 6 + Math.random() * 3; // radius 6–9
    const sinPhi = Math.sin(phi);
    const pos = new THREE.Vector3(
      r * sinPhi * Math.cos(theta),
      r * Math.cos(phi) * 0.52, // flattened sphere
      r * sinPhi * Math.sin(theta)
    );
    const roll = Math.random();
    const deep = roll < 0.16;
    nodes.push({
      pos,
      size: 0.03 + Math.pow(Math.random(), 1.6) * 0.06,
      // ~16% deep emerald for depth, ~14% bright champagne highlights, rest gold
      deep,
      bright: !deep && roll < 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.9,
    });
  }
  return nodes;
}

function buildLineGeometry(nodes: ConclaveNode[]): THREE.BufferGeometry {
  const seen = new Set<string>();
  const pairs: number[] = [];
  nodes.forEach((n, i) => {
    const nearest = nodes
      .map((m, j) => ({ j, d: n.pos.distanceToSquared(m.pos) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d);
    const k = 2 + (i % 2); // connect to 2–3 nearest neighbours
    for (let x = 0; x < k && x < nearest.length; x++) {
      const j = nearest[x]!.j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push(i, j);
      }
    }
  });
  const positions = new Float32Array(pairs.length * 3);
  pairs.forEach((nodeIdx, p) => {
    const v = nodes[nodeIdx]!.pos;
    positions[p * 3] = v.x;
    positions[p * 3 + 1] = v.y;
    positions[p * 3 + 2] = v.z;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

function buildParticleGeometry(): {
  geo: THREE.BufferGeometry;
  speeds: Float32Array;
} {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const speeds = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 34;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 2;
    speeds[i] = 0.12 + Math.random() * 0.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return { geo, speeds };
}

/** Small radial-gradient circle texture so points render as soft dots. */
function makeSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/*  Mouse-parallax rig                                                 */
/* ------------------------------------------------------------------ */

function ParallaxRig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const targetX = state.pointer.y * 0.15;
    const targetY = state.pointer.x * 0.15;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetX, 0.045);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetY, 0.045);
  });
  return <group ref={ref}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/*  The living member circle                                           */
/* ------------------------------------------------------------------ */

function NetworkGraph() {
  const spinRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const nodes = useMemo(() => makeNodes(), []);
  const lineGeo = useMemo(() => buildLineGeometry(nodes), [nodes]);

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []);
  // champagne-gold dominant members…
  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: GOLD_DEEP,
        emissive: GOLD,
        emissiveIntensity: 1.5,
        roughness: 0.32,
        metalness: 0.25,
      }),
    []
  );
  // …bright ivory-gold highlight nodes…
  const goldLightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#9a7a24"),
        emissive: GOLD_LIGHT,
        emissiveIntensity: 1.7,
        roughness: 0.28,
        metalness: 0.2,
      }),
    []
  );
  // …and a deep-emerald minority for depth.
  const emeraldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: EMERALD_DEEP,
        emissive: EMERALD,
        emissiveIntensity: 1.1,
        roughness: 0.4,
        metalness: 0.15,
      }),
    []
  );

  useEffect(() => {
    return () => {
      lineGeo.dispose();
      sphereGeo.dispose();
      goldMat.dispose();
      goldLightMat.dispose();
      emeraldMat.dispose();
    };
  }, [lineGeo, sphereGeo, goldMat, goldLightMat, emeraldMat]);

  useFrame((state, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.05;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < nodes.length; i++) {
      const mesh = nodeRefs.current[i];
      if (!mesh) continue;
      const n = nodes[i]!;
      mesh.position.y = n.pos.y + Math.sin(t * n.speed + n.phase) * 0.16;
    }
  });

  return (
    <group ref={spinRef}>
      {/* connecting lines — warm champagne, low opacity */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          color={GOLD}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      {/* glowing member nodes */}
      {nodes.map((n, i) => (
        <mesh
          key={i}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          geometry={sphereGeo}
          material={n.deep ? emeraldMat : n.bright ? goldLightMat : goldMat}
          position={[n.pos.x, n.pos.y, n.pos.z]}
          scale={n.size * (n.bright ? 1.5 : 1)}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Wireframe shell + drifting particles                               */
/* ------------------------------------------------------------------ */

function WireframeShell() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.y -= delta * 0.018;
    m.rotation.x += delta * 0.006;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[11, 1]} />
      <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.07} />
    </mesh>
  );
}

function DriftParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const { geo, speeds } = useMemo(() => buildParticleGeometry(), []);
  const sprite = useMemo(() => makeSpriteTexture(), []);

  useEffect(() => {
    return () => {
      geo.dispose();
      sprite.dispose();
    };
  }, [geo, sprite]);

  useFrame((_, delta) => {
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let y = arr[i * 3 + 1]! + speeds[i]! * delta;
      if (y > 14) y = -14;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
    if (pointsRef.current) pointsRef.current.rotation.y += delta * 0.004;
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        size={0.09}
        map={sprite}
        color={GOLD_LIGHT}
        transparent
        opacity={0.45}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Decorative floating shapes (drei Float)                            */
/* ------------------------------------------------------------------ */

function DecorShapes() {
  return (
    <>
      <Float speed={1.6} rotationIntensity={0.9} floatIntensity={1.5}>
        <mesh position={[-9.2, 2.6, -2]}>
          <torusKnotGeometry args={[0.72, 0.22, 64, 8]} />
          <meshBasicMaterial color={GOLD_LIGHT} wireframe transparent opacity={0.3} />
        </mesh>
      </Float>
      <Float speed={1.3} rotationIntensity={0.7} floatIntensity={1.2}>
        <mesh position={[9.4, -2.2, -1]}>
          <octahedronGeometry args={[0.95, 0]} />
          <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.28} />
        </mesh>
      </Float>
      <Float speed={1.9} rotationIntensity={0.5} floatIntensity={1.6}>
        <mesh position={[7.6, 3.4, 1]}>
          <torusGeometry args={[0.42, 0.12, 10, 28]} />
          <meshBasicMaterial color={EMERALD} wireframe transparent opacity={0.22} />
        </mesh>
      </Float>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS fallback (no WebGL / small mobile)                             */
/* ------------------------------------------------------------------ */

function HeroFallback() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 38%, oklch(0.84 0.13 85 / 14%), transparent 70%), radial-gradient(ellipse 40% 35% at 18% 62%, oklch(0.9 0.09 95 / 8%), transparent 70%), radial-gradient(ellipse 45% 40% at 82% 28%, oklch(0.79 0.16 163 / 7%), transparent 72%)",
        }}
      />
      <div className="absolute left-[10%] top-[28%] w-56 h-56 md:w-72 md:h-72 rounded-full bg-gold/25 blur-[110px] animate-float-slow" />
      <div
        className="absolute right-[8%] top-[42%] w-64 h-64 md:w-80 md:h-80 rounded-full bg-primary/20 blur-[120px] animate-float-slow"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="absolute left-[45%] bottom-[8%] w-52 h-52 rounded-full bg-gold/15 blur-[90px] animate-float-slow"
        style={{ animationDelay: "-1.5s" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported hero background layer                                     */
/* ------------------------------------------------------------------ */

function webglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/**
 * WebGL capability, computed lazily and cached once (avoids re-creating
 * probe canvases across renders).
 */
let capabilityCache: boolean | null = null;
function canRender3D(): boolean {
  if (capabilityCache === null) {
    capabilityCache = webglSupported() && window.innerWidth >= 640;
  }
  return capabilityCache;
}

const emptySubscribe = () => () => {};

export default function Hero3D() {
  // Server/hydration snapshot = false (CSS fallback), then flips to the
  // client capability after mount — no setState-in-effect needed.
  const can3D = useSyncExternalStore(
    emptySubscribe,
    () => canRender3D(),
    () => false
  );

  if (!can3D) return <HeroFallback />;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 13], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 8, 10]} intensity={1.3} color="#f5ead0" />
        <pointLight position={[-8, -4, 6]} intensity={30} color="#e5b84b" distance={26} />
        <ParallaxRig>
          <NetworkGraph />
          <WireframeShell />
          <DriftParticles />
          <DecorShapes />
        </ParallaxRig>
      </Canvas>
    </div>
  );
}
