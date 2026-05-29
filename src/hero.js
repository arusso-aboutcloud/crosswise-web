/**
 * Crosswise 3D hero — "The Combination"
 *
 * A 4x4x4 grid of cubes representing individual permissions.
 * Individually calm (teal). Periodically the grid opens, 2-3 cubes
 * connect and flare red — a toxic combination forms — then the grid
 * closes. Slow, hypnotic, deliberate.
 *
 * Guardrails (non-negotiable):
 *   - prefers-reduced-motion: static scene, one very slow rotation only
 *   - visibilitychange: pause RAF loop when tab hidden
 *   - WebGL unavailable: catch error, apply CSS fallback
 *   - pointer-events: none on canvas (set in CSS; hero never blocks CTA)
 *   - cleanup: dispose all Three.js objects on destroy()
 */

import * as THREE from 'three';

const GRID      = 4;        // 4x4x4 = 64 cubes
const CUBE_SIZE = 0.18;
const SPACING   = 0.30;
const TEAL      = 0x00d4b8;
const TEAL_EM   = 0x003830;
const TOXIC     = 0xf43f5e;
const TOXIC_EM  = 0x4a0015;

// ---- easing helpers --------------------------------------------------------
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t)  { return t * t * t; }
function easeInOut(t)    { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
function clamp01(v)      { return Math.max(0, Math.min(1, v)); }

// ---- state machine ---------------------------------------------------------
const S = { IDLE: 0, OPENING: 1, OPEN: 2, CLOSING: 3 };

export function initHero(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- WebGL setup (wrapped — fallback on any error) ----------------------
  let renderer, scene, camera, clock;
  let cubeGroup, toxicLineObj;
  let animId = null;
  let paused = false;

  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    container.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.5, 7);
    camera.lookAt(0, 0, 0);
    clock  = new THREE.Clock();

    // ---- lights ------------------------------------------------------------
    scene.add(new THREE.AmbientLight(0x0d1a2a, 1.0));
    const keyLight  = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x00d4b8, 0.6);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    // toxic point light — intensity driven by animation state
    const toxicLight = new THREE.PointLight(0xf43f5e, 0, 8);
    toxicLight.position.set(0, 0, 2);
    scene.add(toxicLight);

    // ---- cube grid ---------------------------------------------------------
    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const geo  = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const cubes = [];

    const half = (GRID - 1) / 2;
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        for (let z = 0; z < GRID; z++) {
          const mat = new THREE.MeshStandardMaterial({
            color: TEAL,
            emissive: TEAL_EM,
            metalness: 0.4,
            roughness: 0.35,
          });
          const mesh = new THREE.Mesh(geo, mat);
          const bx = (x - half) * SPACING;
          const by = (y - half) * SPACING;
          const bz = (z - half) * SPACING;
          mesh.position.set(bx, by, bz);
          mesh.userData.base = new THREE.Vector3(bx, by, bz);
          mesh.userData.isToxic = false;
          cubeGroup.add(mesh);
          cubes.push(mesh);
        }
      }
    }

    // ---- toxic connection line ---------------------------------------------
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: TOXIC, transparent: true, opacity: 0 });
    toxicLineObj  = new THREE.Line(lineGeo, lineMat);
    scene.add(toxicLineObj);

    // ---- animation state ---------------------------------------------------
    let state     = S.IDLE;
    let stateAge  = 0;
    const IDLE_DUR   = reducedMotion ? 1e9 : 10.0;
    const OPEN_DUR   = 2.2;
    const HOLD_DUR   = 2.0;
    const CLOSE_DUR  = 2.0;
    const EXPAND     = 1.75;

    // toxic flare timing within the OPEN hold
    const FLARE_START = 0.4;  // seconds into OPEN hold
    const FLARE_DUR   = 1.2;
    let toxicIndices  = [];

    function pickToxicCubes() {
      // pick 3 cubes that are NOT at corners, spread apart visually
      const pool = cubes.filter((_, i) => {
        const x = Math.floor(i / (GRID * GRID));
        const y = Math.floor((i % (GRID * GRID)) / GRID);
        const z = i % GRID;
        return x >= 1 && x <= 2 && y >= 1 && y <= 2 && z >= 1 && z <= 2;
      });
      // shuffle and take 3
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, 3);
    }

    function applyToxic(selected, intensity) {
      for (const cube of cubes) {
        const isToxic = selected.includes(cube);
        cube.material.color.setHex(isToxic ? TOXIC : TEAL);
        cube.material.emissive.setHex(isToxic ? TOXIC_EM : TEAL_EM);
        if (isToxic) {
          const s = 1 + 0.25 * intensity;
          cube.scale.setScalar(s);
        } else {
          cube.scale.setScalar(1);
        }
      }
      // update connecting line positions
      if (selected.length >= 3) {
        const pos = toxicLineObj.geometry.attributes.position;
        pos.setXYZ(0, selected[0].position.x, selected[0].position.y, selected[0].position.z);
        pos.setXYZ(1, selected[1].position.x, selected[1].position.y, selected[1].position.z);
        pos.setXYZ(2, selected[2].position.x, selected[2].position.y, selected[2].position.z);
        pos.needsUpdate = true;
        toxicLineObj.material.opacity = intensity;
      }
      toxicLight.intensity = intensity * 3.5;
    }

    function resetToTeal() {
      for (const cube of cubes) {
        cube.material.color.setHex(TEAL);
        cube.material.emissive.setHex(TEAL_EM);
        cube.scale.setScalar(1);
      }
      toxicLineObj.material.opacity = 0;
      toxicLight.intensity = 0;
    }

    // ---- resize ------------------------------------------------------------
    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();

    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(container);

    // ---- visibility pause --------------------------------------------------
    const onVisibility = () => { paused = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    // ---- render loop -------------------------------------------------------
    function tick() {
      animId = requestAnimationFrame(tick);
      if (paused) return;

      const dt   = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      stateAge  += dt;

      // base slow rotation — always on (reduced-motion: very slow)
      const rotSpeed = reducedMotion ? 0.015 : 0.06;
      cubeGroup.rotation.y += rotSpeed * dt;
      cubeGroup.rotation.x  = Math.sin(time * 0.07) * 0.12;

      if (!reducedMotion) {
        // ---- state machine ---
        if (state === S.IDLE && stateAge >= IDLE_DUR) {
          state    = S.OPENING;
          stateAge = 0;
          toxicIndices = pickToxicCubes();
        }

        if (state === S.OPENING) {
          const t = clamp01(stateAge / OPEN_DUR);
          const ef = 1 + (EXPAND - 1) * easeOutCubic(t);
          for (const cube of cubes) {
            cube.position.lerpVectors(cube.userData.base,
              new THREE.Vector3().copy(cube.userData.base).multiplyScalar(EXPAND),
              easeOutCubic(t));
          }
          if (t >= 1) { state = S.OPEN; stateAge = 0; }
        }

        if (state === S.OPEN) {
          // keep cubes at expanded positions
          for (const cube of cubes) {
            cube.position.copy(cube.userData.base).multiplyScalar(EXPAND);
          }
          // toxic flare window
          const flareAge = stateAge - FLARE_START;
          if (flareAge >= 0 && flareAge <= FLARE_DUR) {
            // bell curve intensity: peaks at middle of flare window
            const ft = flareAge / FLARE_DUR;
            const intensity = Math.sin(ft * Math.PI);
            applyToxic(toxicIndices, intensity);
          } else if (stateAge > FLARE_START + FLARE_DUR) {
            resetToTeal();
          }
          if (stateAge >= HOLD_DUR) { state = S.CLOSING; stateAge = 0; }
        }

        if (state === S.CLOSING) {
          const t  = clamp01(stateAge / CLOSE_DUR);
          for (const cube of cubes) {
            cube.position.lerpVectors(
              new THREE.Vector3().copy(cube.userData.base).multiplyScalar(EXPAND),
              cube.userData.base,
              easeInOut(t));
          }
          resetToTeal();
          if (t >= 1) { state = S.IDLE; stateAge = 0; }
        }

        // gentle breathing pulse on all cubes (subtle)
        if (state === S.IDLE) {
          const pulse = 1 + Math.sin(time * 1.2) * 0.018;
          cubeGroup.scale.setScalar(pulse);
        } else {
          cubeGroup.scale.setScalar(1);
        }
      }

      renderer.render(scene, camera);
    }

    tick();

    // ---- cleanup -----------------------------------------------------------
    return {
      destroy() {
        cancelAnimationFrame(animId);
        resizeObs.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        geo.dispose();
        lineMat.dispose();
        lineGeo.dispose();
        scene.traverse(obj => {
          if (obj.geometry && obj.geometry !== geo && obj.geometry !== lineGeo) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach(m => m.dispose());
          }
        });
        renderer.dispose();
        canvas.remove();
      },
    };

  } catch (err) {
    console.warn('Crosswise hero: WebGL unavailable, using fallback.', err);
    container.classList.add('hero-fallback-active');
    return null;
  }
}
