"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ---------- shared pointer in world coords (canvas is pointer-events:none,
   so we track the window pointer and unproject onto the z=0 plane) ---------- */

function usePointerWorld() {
  const ptr = useRef(new THREE.Vector3(9999, 9999, 0));
  const { viewport, size } = useThree();
  const vp = useRef({ viewport, size });
  vp.current = { viewport, size };

  useMemo(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: PointerEvent) => {
      const { viewport, size } = vp.current;
      const ndcX = (e.clientX / size.width) * 2 - 1;
      const ndcY = -(e.clientY / size.height) * 2 + 1;
      ptr.current.set((ndcX * viewport.width) / 2, (ndcY * viewport.height) / 2, 0);
    };
    const onLeave = (e: PointerEvent) => {
      if (!e.relatedTarget) ptr.current.set(9999, 9999, 0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
  }, []);
  return ptr;
}

/* ---------- canvas-texture HUD chips (IBM Plex Mono via the next/font CSS var) ---------- */

function makeChipTexture(text: string, accent = false) {
  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-plex")
      .split(",")[0]
      .trim()
      .replace(/['"]/g, "") || "monospace";
  const scale = 4;
  const pad = 14;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `500 ${13 * scale}px "${family}", monospace`;
  const w = Math.ceil(ctx.measureText(text.toUpperCase()).width) + pad * 2 * scale;
  const h = (13 + 18) * scale;
  c.width = w;
  c.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = accent ? "rgba(255,77,36,0.9)" : "rgba(236,233,226,0.45)";
  ctx.lineWidth = scale;
  ctx.strokeRect(scale / 2, scale / 2, w - scale, h - scale);
  ctx.fillStyle = accent ? "#ff4d24" : "#ece9e2";
  ctx.font = `500 ${13 * scale}px "${family}", monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text.toUpperCase(), w / 2, h / 2 + scale);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / h };
}

/* ---------- zero-G floater: wander + pointer repulsion + spring home ---------- */

function Floater({
  home,
  ptr,
  amp = 0.3,
  children,
}: {
  home: [number, number, number];
  ptr: React.RefObject<THREE.Vector3>;
  amp?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const vel = useRef(new THREE.Vector2());
  const phase = useMemo(() => Math.random() * 100, []);
  const tmp = useMemo(() => new THREE.Vector2(), []);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime + phase;
    let tx = home[0] + Math.sin(t * 0.45) * amp;
    let ty = home[1] + Math.cos(t * 0.32) * amp * 1.3;

    const dx = g.position.x - ptr.current.x;
    const dy = g.position.y - ptr.current.y;
    const d = Math.hypot(dx, dy);
    const R = 2.4;
    if (d < R && d > 1e-4) {
      const f = ((R - d) / R) * 1.7;
      tx += (dx / d) * f;
      ty += (dy / d) * f;
    }

    tmp.set(tx - g.position.x, ty - g.position.y).multiplyScalar(0.035);
    vel.current.add(tmp).multiplyScalar(0.9);
    g.position.x += vel.current.x;
    g.position.y += vel.current.y;
    g.rotation.z = Math.sin(t * 0.4) * 0.07;
  });

  return (
    <group ref={ref} position={home}>
      {children}
    </group>
  );
}

function Chip({ text, accent = false }: { text: string; accent?: boolean }) {
  const { tex, aspect } = useMemo(() => makeChipTexture(text, accent), [text, accent]);
  const h = 0.34;
  return (
    <mesh>
      <planeGeometry args={[h * aspect, h]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/** One L-shaped focus-bracket corner built from two thin bars. */
function BracketCorner({ flip = [1, 1] }: { flip?: [number, number] }) {
  const len = 0.5;
  const thick = 0.035;
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ece9e2", transparent: true, opacity: 0.55 }),
    []
  );
  return (
    <group scale={[flip[0], flip[1], 1]}>
      <mesh material={mat} position={[len / 2, 0, 0]}>
        <boxGeometry args={[len, thick, thick]} />
      </mesh>
      <mesh material={mat} position={[0, -len / 2, 0]}>
        <boxGeometry args={[thick, len, thick]} />
      </mesh>
    </group>
  );
}

/* ---------- particle drift ---------- */

function Particles({ ptr, count = 70 }: { ptr: React.RefObject<THREE.Vector3>; count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    const pos = new Float32Array(count * 2);
    const vel = new Float32Array(count * 2);
    const scl = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 2] = (Math.random() - 0.5) * viewport.width;
      pos[i * 2 + 1] = (Math.random() - 0.5) * viewport.height;
      vel[i * 2] = (Math.random() - 0.5) * 0.004;
      vel[i * 2 + 1] = Math.random() * 0.004 + 0.001; // antigravity: drift upward
      scl[i] = Math.random() * 0.7 + 0.3;
    }
    return { pos, vel, scl };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const hw = viewport.width / 2 + 0.5;
    const hh = viewport.height / 2 + 0.5;
    const { pos, vel, scl } = data;
    for (let i = 0; i < count; i++) {
      let x = pos[i * 2];
      let y = pos[i * 2 + 1];
      const dx = x - ptr.current.x;
      const dy = y - ptr.current.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.6 && d > 1e-4) {
        const f = ((1.6 - d) / 1.6) * 0.05;
        vel[i * 2] += (dx / d) * f;
        vel[i * 2 + 1] += (dy / d) * f;
      }
      vel[i * 2] *= 0.985;
      vel[i * 2 + 1] = vel[i * 2 + 1] * 0.985 + 0.00006;
      x += vel[i * 2];
      y += vel[i * 2 + 1];
      if (y > hh) y = -hh;
      if (x > hw) x = -hw;
      if (x < -hw) x = hw;
      pos[i * 2] = x;
      pos[i * 2 + 1] = y;
      dummy.position.set(x, y, -0.5);
      dummy.scale.setScalar(scl[i]);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <circleGeometry args={[0.012, 6]} />
      <meshBasicMaterial color="#93908a" transparent opacity={0.7} depthWrite={false} />
    </instancedMesh>
  );
}

/* ---------- scene ---------- */

function Scene({ full }: { full: boolean }) {
  const ptr = usePointerWorld();
  const root = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const w = viewport.width / 2;
  const h = viewport.height / 2;

  useFrame(() => {
    // slight scroll drift so the layer lags the page (parallax in depth)
    if (root.current) root.current.position.y = window.scrollY * 0.0012;
  });

  return (
    <group ref={root}>
      <Particles ptr={ptr} count={full ? 70 : 90} />
      {full && (
        <>
          {/* HUD chips — kept toward the top/right, clear of the DOM headline bottom-left */}
          <Floater home={[w * 0.55, h * 0.45, 0]} ptr={ptr}>
            <Chip text="ISO 400" />
          </Floater>
          <Floater home={[w * 0.7, h * 0.05, 0]} ptr={ptr} amp={0.4}>
            <Chip text="ƒ/2.8" />
          </Floater>
          <Floater home={[w * 0.25, h * 0.7, 0]} ptr={ptr} amp={0.35}>
            <Chip text="1/500" />
          </Floater>
          <Floater home={[-w * 0.45, h * 0.55, 0]} ptr={ptr} amp={0.45}>
            <Chip text="REC ●" accent />
          </Floater>
          <Floater home={[-w * 0.7, -h * 0.05, 0]} ptr={ptr} amp={0.3}>
            <Chip text="AF-ON" />
          </Floater>
          {/* stray focus brackets adrift */}
          <Floater home={[w * 0.35, -h * 0.25, 0]} ptr={ptr} amp={0.5}>
            <BracketCorner flip={[1, 1]} />
          </Floater>
          <Floater home={[-w * 0.3, h * 0.25, 0]} ptr={ptr} amp={0.5}>
            <BracketCorner flip={[-1, -1]} />
          </Floater>
        </>
      )}
    </group>
  );
}

export default function HeroScene({ full = false }: { full?: boolean }) {
  return (
    <Canvas
      className="!absolute !inset-0"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 8], fov: 38 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <Scene full={full} />
    </Canvas>
  );
}
