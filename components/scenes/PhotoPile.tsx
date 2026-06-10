"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useThree, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { PrintPhoto } from "../motion/LazyScene";

const MIN_PRINTS = 10;
const MAX_PRINTS = 14;
const GRAVITY = -16;

/** Serve pile textures through the Next image optimizer at strip resolution. */
const optimized = (src: string) => `/_next/image?url=${encodeURIComponent(src)}&w=828&q=75`;

/** Deterministic pseudo-random per print index, so spawns are stable. */
const rand = (i: number, salt = 0) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function expand(prints: PrintPhoto[]): PrintPhoto[] {
  const out: PrintPhoto[] = [];
  while (out.length < Math.max(MIN_PRINTS, Math.min(prints.length, MAX_PRINTS))) {
    out.push(prints[out.length % prints.length]);
    if (out.length >= MAX_PRINTS) break;
  }
  return out;
}

/* ---------------- a single physical print ---------------- */

function Print({
  data,
  index,
  register,
  onOpen,
  draggingRef,
}: {
  data: PrintPhoto;
  index: number;
  register: (i: number, b: RapierRigidBody | null) => void;
  onOpen: (album: string) => void;
  draggingRef: React.RefObject<boolean>;
}) {
  const body = useRef<RapierRigidBody>(null);
  const { viewport } = useThree();
  const tex = useTexture(optimized(data.src));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  useEffect(() => {
    register(index, body.current);
    return () => register(index, null);
  }, [index, register]);

  const { pw, ph, bw, bh, depth, spawn, rot } = useMemo(() => {
    const longEdge = THREE.MathUtils.clamp(viewport.width * 0.21, 1.1, 2.1) * (0.85 + rand(index, 3) * 0.3);
    const aspect = data.width / data.height;
    const pw = aspect >= 1 ? longEdge : longEdge * aspect;
    const ph = aspect >= 1 ? longEdge / aspect : longEdge;
    const border = 0.07;
    return {
      pw,
      ph,
      bw: pw + border * 2,
      bh: ph + border * 2 + 0.14, // extra bottom lip, polaroid-style
      depth: 0.06,
      spawn: [
        (rand(index, 1) - 0.5) * viewport.width * 0.8,
        viewport.height * (0.1 + rand(index, 2) * 0.4),
        0,
      ] as [number, number, number],
      rot: (rand(index, 4) - 0.5) * 1.2,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, data.width, data.height]);

  const grab = useRef<{
    ox: number; oy: number;
    lx: number; ly: number; lt: number;
    vx: number; vy: number;
    sx: number; sy: number; moved: number;
  } | null>(null);

  const toWorld = (e: ThreeEvent<PointerEvent>) => {
    const t = -e.ray.origin.z / e.ray.direction.z;
    return e.ray.origin.clone().addScaledVector(e.ray.direction, t);
  };

  const down = (e: ThreeEvent<PointerEvent>) => {
    const b = body.current;
    if (!b || grab.current) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toWorld(e);
    const tr = b.translation();
    grab.current = {
      ox: tr.x - p.x, oy: tr.y - p.y,
      lx: p.x, ly: p.y, lt: performance.now(),
      vx: 0, vy: 0,
      sx: e.clientX, sy: e.clientY, moved: 0,
    };
    b.setBodyType(2, true); // kinematicPosition
    draggingRef.current = true;
  };

  const move = (e: ThreeEvent<PointerEvent>) => {
    const b = body.current;
    const g = grab.current;
    if (!b || !g) return;
    e.stopPropagation();
    const p = toWorld(e);
    const now = performance.now();
    const dt = Math.max((now - g.lt) / 1000, 1e-3);
    g.vx = (p.x - g.lx) / dt;
    g.vy = (p.y - g.ly) / dt;
    g.lx = p.x;
    g.ly = p.y;
    g.lt = now;
    g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.sx, e.clientY - g.sy));
    // keep inside walls while dragging
    const hw = viewport.width / 2 - bw / 2;
    const hh = viewport.height / 2 - bh / 2;
    b.setNextKinematicTranslation({
      x: THREE.MathUtils.clamp(p.x + g.ox, -hw, hw),
      y: THREE.MathUtils.clamp(p.y + g.oy, -hh, hh),
      z: 0,
    });
  };

  const release = (e: ThreeEvent<PointerEvent>, cancelled: boolean) => {
    const b = body.current;
    const g = grab.current;
    if (!b || !g) return;
    e.stopPropagation();
    grab.current = null;
    draggingRef.current = false;
    b.setBodyType(0, true); // dynamic
    const cap = 16;
    b.setLinvel(
      {
        x: THREE.MathUtils.clamp(g.vx, -cap, cap),
        y: THREE.MathUtils.clamp(g.vy, -cap, cap),
        z: 0,
      },
      true
    );
    if (!cancelled && g.moved < 8) onOpen(data.album);
  };

  return (
    <RigidBody
      ref={body}
      colliders="cuboid"
      position={spawn}
      rotation={[0, 0, rot]}
      enabledTranslations={[true, true, false]}
      enabledRotations={[false, false, true]}
      linearDamping={0.5}
      angularDamping={0.9}
      friction={0.7}
      restitution={0.25}
      canSleep={false}
      ccd
    >
      <group
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => release(e, false)}
        onPointerCancel={(e) => release(e, true)}
      >
        <mesh>
          <boxGeometry args={[bw, bh, depth]} />
          <meshBasicMaterial color="#e8e4da" />
        </mesh>
        <mesh position={[0, 0.07, depth / 2 + 0.002]}>
          <planeGeometry args={[pw, ph]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
    </RigidBody>
  );
}

/* ---------------- world bounds ---------------- */

function Walls() {
  const { viewport } = useThree();
  const w = viewport.width / 2;
  const h = viewport.height / 2;
  const t = 0.6;
  return (
    <>
      <CuboidCollider position={[0, -h - t, 0]} args={[w + t * 2, t, 4]} />
      <CuboidCollider position={[0, h + t, 0]} args={[w + t * 2, t, 4]} />
      <CuboidCollider position={[-w - t, 0, 0]} args={[t, h + t * 2, 4]} />
      <CuboidCollider position={[w + t, 0, 0]} args={[t, h + t * 2, 4]} />
    </>
  );
}

/* ---------------- scroll shake: scrolling jolts the pile ---------------- */

function ScrollShake({
  active,
  bodies,
}: {
  active: boolean;
  bodies: React.RefObject<(RapierRigidBody | null)[]>;
}) {
  const lastY = useRef<number | null>(null);

  useFrame(() => {
    const y = window.scrollY;
    if (lastY.current === null) {
      lastY.current = y;
      return;
    }
    const dy = y - lastY.current;
    lastY.current = y;
    if (!active || Math.abs(dy) < 2) return;
    // scroll velocity → jolt strength (capped so flings stay controlled)
    const k = THREE.MathUtils.clamp(dy * 0.0035, -0.4, 0.4);
    bodies.current.forEach((b, i) => {
      if (!b) return;
      const m = b.mass();
      const j = rand(i, lastY.current! % 97) - 0.5;
      b.applyImpulse(
        { x: j * Math.abs(k) * 1.2 * m, y: k * (1 + Math.abs(j)) * m, z: 0 },
        true
      );
      b.applyTorqueImpulse({ x: 0, y: 0, z: j * Math.abs(k) * 0.25 * m }, true);
    });
  });

  return null;
}

/* ---------------- gravity toggle side-effects ---------------- */

function GravityFX({
  gravityOn,
  bodies,
}: {
  gravityOn: boolean;
  bodies: React.RefObject<(RapierRigidBody | null)[]>;
}) {
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    for (const b of bodies.current) {
      if (!b) continue;
      b.wakeUp();
      b.setLinearDamping(gravityOn ? 0.5 : 0.08);
      b.setAngularDamping(gravityOn ? 0.9 : 0.2);
      if (!gravityOn) {
        const m = b.mass();
        b.applyImpulse(
          { x: (Math.random() - 0.5) * 2 * m, y: (Math.random() * 2 + 1) * m, z: 0 },
          true
        );
        b.applyTorqueImpulse({ x: 0, y: 0, z: (Math.random() - 0.5) * 0.4 * m }, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gravityOn]);

  // tiny wandering currents so the zero-G float never fully settles
  useFrame((state) => {
    if (gravityOn) return;
    const t = state.clock.elapsedTime;
    bodies.current.forEach((b, i) => {
      if (!b) return;
      const m = b.mass();
      b.applyImpulse(
        {
          x: Math.sin(t * 0.6 + i * 2.1) * 0.012 * m,
          y: Math.cos(t * 0.5 + i * 1.3) * 0.012 * m,
          z: 0,
        },
        true
      );
    });
  });

  return null;
}

/* ---------------- section ---------------- */

export default function PhotoPile({ prints }: { prints: PrintPhoto[] }) {
  const router = useRouter();
  const section = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [gravityOn, setGravityOn] = useState(true);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const draggingRef = useRef(false);

  const all = useMemo(() => expand(prints), [prints]);

  const register = useMemo(
    () => (i: number, b: RapierRigidBody | null) => {
      bodies.current[i] = b;
    },
    []
  );

  // pause physics when the section is off-screen
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), {
      rootMargin: "10% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // while dragging a print on touch, block page scroll (canvas is touch-action: pan-y)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  return (
    <section ref={section} className="relative border-t border-line">
      <div className="flex items-baseline justify-between px-6 pt-14 pb-4 sm:px-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-dim">
          FX <span className="text-accent">/</span> Darkroom
        </h2>
        <button
          onClick={() => setGravityOn((g) => !g)}
          data-cursor="link"
          className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.2em] text-dim transition-colors hover:text-accent"
          aria-pressed={!gravityOn}
        >
          G <span className="text-accent">▸</span> {gravityOn ? "9.81" : "0.00"} m/s²
        </button>
      </div>

      <div
        ref={wrap}
        data-cursor="drag"
        className="relative h-[78svh] overflow-hidden"
        aria-label="Interactive pile of photo prints — drag to toss, click to open the album"
      >
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 9], fov: 36 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          style={{ touchAction: "pan-y" }}
        >
          <Suspense fallback={null}>
            <Physics gravity={[0, gravityOn ? GRAVITY : 0, 0]} paused={!running}>
              <Walls />
              {all.map((p, i) => (
                <Print
                  key={`${p.src}-${i}`}
                  data={p}
                  index={i}
                  register={register}
                  onOpen={(album) => router.push(`/photos/${album}?from=home`)}
                  draggingRef={draggingRef}
                />
              ))}
              <GravityFX gravityOn={gravityOn} bodies={bodies} />
              <ScrollShake active={running} bodies={bodies} />
            </Physics>
          </Suspense>
        </Canvas>
      </div>

      <p className="px-6 pb-10 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-faint sm:px-12">
        loose prints — drag to toss · click one to open its album · flip gravity ↑
      </p>
    </section>
  );
}
