/*
 * FieldShift — IoT 3D Device Explorer
 * ---------------------------------------------------------------------------
 * Procedural Three.js scene of "FieldShift Node v1". No external .glb/.gltf/
 * texture assets — every mesh is built from primitives so the page never has
 * a chance to 404 a model during a demo, and keeps working once the Three.js
 * CDN module has been cached by the browser (offline-safe after first load).
 *
 * This file owns: the 3D scene, camera presets, explode/cutaway/layer/
 * hotspot/selection interactions, the WebGL feature-detect + static fallback,
 * and reading window.FS_DATA.bom (from data/bom.js) to populate the
 * selection side panel. It does not fetch anything — data/bom.js must be
 * loaded via a plain <script> tag before this module runs.
 */

// Signals to the host page that this ES module actually executed. Browsers
// block module loading over file:// (CORS), in which case this never runs and
// the page's boot watchdog reveals the static fallback instead.
window.__FS_IOT3D_LOADED__ = true;

/* ---------------------------------------------------------------------- *
 * 0. WebGL feature detection (must happen before we rely on a 3D context)
 * ---------------------------------------------------------------------- */
function hasWebGL() {
  if (window.__FS_FORCE_NO_WEBGL__) return false; // manual test hook
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

function showFallback(reason) {
  const viewport = document.getElementById('scene-viewport');
  const canvas = document.getElementById('fs-canvas');
  const fallback = document.getElementById('webgl-fallback');
  const toolbar = document.getElementById('scene-toolbar');
  const controlsRow = document.getElementById('scene-controls');
  const hotspotLayer = document.getElementById('hotspot-layer');
  if (canvas) canvas.style.display = 'none';
  if (hotspotLayer) hotspotLayer.style.display = 'none';
  if (toolbar) toolbar.style.display = 'none';
  if (controlsRow) controlsRow.style.display = 'none';
  if (fallback) fallback.hidden = false;
  if (viewport) viewport.classList.add('is-fallback');
  console.warn('[FieldShift IoT 3D] WebGL unavailable, showing static fallback diagram.', reason || '');
}

/* ---------------------------------------------------------------------- *
 * 1. Part catalogue: geometry builders, layers, explode vectors, hotspot
 *    anchors. Kept declarative so the interaction code below can stay
 *    generic across all 12 parts.
 * ---------------------------------------------------------------------- */

// Shared palette pulled from the site's CSS custom properties so the scene
// reads as part of the same design system rather than a separate widget.
const COLORS = {
  bg: 0xf6f8f3,
  surface: 0xf3f6ef,
  surfaceDark: 0xe3ead9,
  primary: 0x235c3a,
  primary2: 0x397a50,
  accent: 0xd9a441,
  panelGreen: 0x2c6b45,
  chipDark: 0x22271f,
  darkMetal: 0x2b2f33,
  lightMetal: 0xd7dad2,
  copper: 0xc98a4b,
  solar: 0x16283f,
  cableJacket: 0x24261f,
  probeBody: 0xcdd4c6,
  stakeMetal: 0x8f978c,
  soil: 0x6b4a34,
  ground: 0xdfe7da
};

// Part definitions: id -> { layer, label, explodeDir (Vector3-ish), build(THREE) }
// explodeDir is a direction+magnitude in local scene units; basePosition is
// baked into the group returned by build().
function buildPartCatalogue(THREE) {
  const parts = {};

  // Helper: rounded box via extruded shape (bevelled), used for enclosure.
  function roundedBoxGeometry(w, h, d, r) {
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    shape.moveTo(x, y + r);
    shape.lineTo(x, y + h - r);
    shape.quadraticCurveTo(x, y + h, x + r, y + h);
    shape.lineTo(x + w - r, y + h);
    shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    shape.lineTo(x + w, y + r);
    shape.quadraticCurveTo(x + w, y, x + w - r, y);
    shape.lineTo(x + r, y);
    shape.quadraticCurveTo(x, y, x, y + r);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: true,
      bevelThickness: r * 0.6,
      bevelSize: r * 0.5,
      bevelSegments: 3,
      curveSegments: 8
    });
    geo.translate(0, 0, -d / 2);
    geo.rotateX(Math.PI / 2); // shape drawn in XY, we want it flat-ish (XZ extrude -> Y depth)
    return geo;
  }

  // --- solar_panel ---------------------------------------------------
  parts.solar_panel = {
    layer: 'power',
    label: 'Solar Panel',
    explodeDir: new THREE.Vector3(0.05, 1.0, 0.15),
    basePosition: new THREE.Vector3(0, 0.62, -0.02),
    build() {
      const g = new THREE.Group();
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.02, 0.22),
        new THREE.MeshStandardMaterial({ color: COLORS.solar, roughness: 0.35, metalness: 0.4, emissive: 0x081522, emissiveIntensity: 0.4 })
      );
      panel.castShadow = true; panel.receiveShadow = true;
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.14, 0.03),
        new THREE.MeshStandardMaterial({ color: COLORS.darkMetal, roughness: 0.6, metalness: 0.5 })
      );
      bracket.position.set(0, -0.07, 0.08);
      bracket.rotation.x = -0.35;
      bracket.castShadow = true;
      panel.rotation.x = -0.35;
      g.add(panel, bracket);
      return g;
    }
  };

  // --- enclosure_lid ---------------------------------------------------
  parts.enclosure_lid = {
    layer: 'enclosure',
    label: 'Enclosure Lid',
    explodeDir: new THREE.Vector3(0, 0.85, 0.05),
    basePosition: new THREE.Vector3(0, 0.44, 0),
    build() {
      const geo = roundedBoxGeometry(0.26, 0.34, 0.05, 0.025);
      const mat = new THREE.MeshPhysicalMaterial({
        color: COLORS.surface, roughness: 0.35, metalness: 0.05,
        transparent: false, opacity: 1, clearcoat: 0.3
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.isEnclosureShell = true;
      return mesh;
    }
  };

  // --- enclosure_base ---------------------------------------------------
  parts.enclosure_base = {
    layer: 'enclosure',
    label: 'Enclosure Base',
    explodeDir: new THREE.Vector3(0, -0.3, -0.05),
    basePosition: new THREE.Vector3(0, 0.30, 0),
    build() {
      const geo = roundedBoxGeometry(0.27, 0.30, 0.16, 0.025);
      const mat = new THREE.MeshPhysicalMaterial({ color: COLORS.surface, roughness: 0.45, metalness: 0.05 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.isEnclosureShell = true;
      // gasket lip
      const gasket = new THREE.Mesh(
        new THREE.BoxGeometry(0.27, 0.015, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x1c1f1c, roughness: 0.9 })
      );
      gasket.position.y = 0.155;
      mesh.add(gasket);
      return mesh;
    }
  };

  // --- pcb ---------------------------------------------------------------
  parts.pcb = {
    layer: 'comms',
    label: 'Main PCB (ESP32-S3 + SX1262)',
    explodeDir: new THREE.Vector3(0.65, 0.05, 0),
    basePosition: new THREE.Vector3(0.03, 0.34, -0.02),
    build() {
      const g = new THREE.Group();
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.012, 0.11),
        new THREE.MeshStandardMaterial({ color: COLORS.panelGreen, roughness: 0.55, metalness: 0.2 })
      );
      board.castShadow = true; board.receiveShadow = true;
      g.add(board);
      // chips: MCU, radio, air sensor, charge controller (matches BOM extras)
      const chipSpecs = [
        { w: 0.045, h: 0.012, d: 0.045, x: -0.05, z: 0.01 },
        { w: 0.03, h: 0.01, d: 0.03, x: 0.02, z: -0.02 },
        { w: 0.018, h: 0.008, d: 0.018, x: 0.06, z: 0.02 },
        { w: 0.022, h: 0.009, d: 0.022, x: -0.01, z: -0.03 }
      ];
      chipSpecs.forEach((c) => {
        const chip = new THREE.Mesh(
          new THREE.BoxGeometry(c.w, c.h, c.d),
          new THREE.MeshStandardMaterial({ color: COLORS.chipDark, roughness: 0.4, metalness: 0.3 })
        );
        chip.position.set(c.x, 0.006 + c.h / 2, c.z);
        chip.castShadow = true;
        g.add(chip);
      });
      // header pins
      for (let i = 0; i < 6; i++) {
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0015, 0.0015, 0.012, 6),
          new THREE.MeshStandardMaterial({ color: COLORS.lightMetal, metalness: 0.8, roughness: 0.3 })
        );
        pin.position.set(-0.08 + i * 0.008, 0.012, 0.045);
        g.add(pin);
      }
      return g;
    }
  };

  // --- battery -------------------------------------------------------
  parts.battery = {
    layer: 'power',
    label: '18650 Battery Pack (x2)',
    explodeDir: new THREE.Vector3(-0.65, -0.05, 0),
    basePosition: new THREE.Vector3(-0.07, 0.315, 0.03),
    build() {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: COLORS.darkMetal, roughness: 0.4, metalness: 0.6 });
      const capMat = new THREE.MeshStandardMaterial({ color: COLORS.copper, roughness: 0.35, metalness: 0.8 });
      [-0.017, 0.017].forEach((zOff) => {
        const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.065, 16), mat);
        cell.rotation.z = Math.PI / 2;
        cell.position.set(0, 0, zOff);
        cell.castShadow = true; cell.receiveShadow = true;
        const capA = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0092, 0.003, 16), capMat);
        capA.rotation.z = Math.PI / 2;
        capA.position.set(0.0325, 0, zOff);
        const capB = capA.clone();
        capB.position.x = -0.0325;
        g.add(cell, capA, capB);
      });
      return g;
    }
  };

  // --- antenna -------------------------------------------------------
  parts.antenna = {
    layer: 'comms',
    label: 'LoRa Antenna (AS923)',
    explodeDir: new THREE.Vector3(0.1, 1.05, 0.3),
    basePosition: new THREE.Vector3(0.1, 0.62, 0.12),
    build() {
      const g = new THREE.Group();
      const matMetal = new THREE.MeshStandardMaterial({ color: COLORS.lightMetal, roughness: 0.3, metalness: 0.7 });
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 8), matMetal);
      rod.position.y = 0.06;
      rod.castShadow = true;
      g.add(rod);
      // helical coil via TubeGeometry along a helical curve
      const helixPoints = [];
      const turns = 6, coilHeight = 0.035, coilRadius = 0.01;
      for (let i = 0; i <= turns * 16; i++) {
        const t = i / (turns * 16);
        const angle = t * turns * Math.PI * 2;
        helixPoints.push(new THREE.Vector3(
          Math.cos(angle) * coilRadius,
          -0.02 + t * coilHeight,
          Math.sin(angle) * coilRadius
        ));
      }
      const helixCurve = new THREE.CatmullRomCurve3(helixPoints);
      const helixGeo = new THREE.TubeGeometry(helixCurve, 128, 0.0018, 6, false);
      const helixMesh = new THREE.Mesh(helixGeo, matMetal);
      helixMesh.castShadow = true;
      g.add(helixMesh);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.015, 8),
        new THREE.MeshStandardMaterial({ color: COLORS.chipDark, roughness: 0.6 }));
      base.position.y = -0.03;
      g.add(base);
      return g;
    }
  };

  // --- cable_gland -----------------------------------------------------
  parts.cable_gland = {
    layer: 'enclosure',
    label: 'M12 Cable Gland',
    explodeDir: new THREE.Vector3(0, 0, 0.45),
    basePosition: new THREE.Vector3(0, 0.155, 0.08),
    build() {
      const g = new THREE.Group();
      const gland = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.016, 0.03, 12),
        new THREE.MeshStandardMaterial({ color: 0x111311, roughness: 0.5, metalness: 0.2 })
      );
      gland.rotation.x = Math.PI / 2;
      gland.castShadow = true;
      g.add(gland);
      return g;
    }
  };

  // --- sensor_cable -----------------------------------------------------
  parts.sensor_cable = {
    layer: 'sensing',
    label: 'Sensor Cable',
    explodeDir: new THREE.Vector3(0.15, -0.1, 0.35),
    basePosition: new THREE.Vector3(0, 0, 0),
    build() {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: COLORS.cableJacket, roughness: 0.7, metalness: 0.1 });
      // trunk from gland down to a junction just under the surface
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.16, 0.08),
        new THREE.Vector3(0.01, 0.05, 0.09),
        new THREE.Vector3(0.02, -0.05, 0.07),
        new THREE.Vector3(0.02, -0.08, 0.05)
      ]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 24, 0.006, 6, false), mat);
      trunk.castShadow = true;
      g.add(trunk);
      // branch to shallow probe
      const branchA = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.02, -0.08, 0.05),
        new THREE.Vector3(0.08, -0.11, 0.02),
        new THREE.Vector3(0.14, -0.145, -0.01)
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(branchA, 16, 0.0045, 6, false), mat));
      // branch to deep probe
      const branchB = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.02, -0.08, 0.05),
        new THREE.Vector3(0.1, -0.22, -0.05),
        new THREE.Vector3(0.19, -0.39, -0.12)
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(branchB, 20, 0.0045, 6, false), mat));
      return g;
    }
  };

  function buildProbe(depth) {
    return function () {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.probeBody, roughness: 0.4, metalness: 0.4 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.11, 4, 8), bodyMat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.09, 0.002),
        new THREE.MeshStandardMaterial({ color: COLORS.probeBody, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide })
      );
      fin.position.z = -0.008;
      fin.castShadow = true;
      g.add(body, fin);
      g.userData.depth = depth;
      return g;
    };
  }

  // --- probe_15cm ------------------------------------------------------
  parts.probe_15cm = {
    layer: 'sensing',
    label: 'Soil Probe — 15 cm',
    explodeDir: new THREE.Vector3(0.28, -0.2, 0.28),
    basePosition: new THREE.Vector3(0.14, -0.145, -0.01),
    build: buildProbe(0.15)
  };

  // --- probe_40cm ------------------------------------------------------
  parts.probe_40cm = {
    layer: 'sensing',
    label: 'Soil Probe — 40 cm',
    explodeDir: new THREE.Vector3(0.42, -0.35, 0.42),
    basePosition: new THREE.Vector3(0.19, -0.39, -0.12),
    build: buildProbe(0.40)
  };

  // --- mounting_stake ----------------------------------------------------
  parts.mounting_stake = {
    layer: 'enclosure',
    label: 'Mounting Stake',
    explodeDir: new THREE.Vector3(0, 0, -0.55),
    basePosition: new THREE.Vector3(-0.09, -0.05, -0.06),
    build() {
      // "tapered box" via a 4-sided cylinder (square-ish prism) with unequal radii
      const geo = new THREE.CylinderGeometry(0.006, 0.016, 0.5, 4, 1);
      geo.rotateY(Math.PI / 4);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COLORS.stakeMetal, roughness: 0.6, metalness: 0.7 }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    }
  };

  // --- soil_block ----------------------------------------------------
  parts.soil_block = {
    layer: 'context',
    label: 'Soil Cross-Section',
    explodeDir: new THREE.Vector3(0, 0, 0),
    basePosition: new THREE.Vector3(0, -0.33, 0),
    noExplode: true,
    noHotspot: false,
    build() {
      const g = new THREE.Group();
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.66, 0.9),
        new THREE.MeshPhysicalMaterial({ color: COLORS.soil, roughness: 0.95, transparent: true, opacity: 0.55 })
      );
      block.receiveShadow = true;
      g.add(block);
      // depth scale marks at 15cm and 40cm (relative to ground at soil_block top = y +0.33)
      const markMat = new THREE.MeshBasicMaterial({ color: 0xf6f8f3 });
      [0.15, 0.40].forEach((depth) => {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.003, 0.003), markMat);
        mark.position.set(0, 0.33 - depth, 0.451);
        g.add(mark);
      });
      return g;
    }
  };

  return parts;
}

/* ---------------------------------------------------------------------- *
 * 2. Text sprite helper (procedural canvas texture — not an external file)
 * ---------------------------------------------------------------------- */
function makeLabelSprite(THREE, text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(23,32,25,0.82)';
  ctx.roundRect ? ctx.roundRect(0, 0, 256, 64, 14) : ctx.rect(0, 0, 256, 64);
  ctx.fill();
  ctx.fillStyle = '#f6f8f3';
  ctx.font = '600 30px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.22, 0.055, 1);
  return sprite;
}

/* ---------------------------------------------------------------------- *
 * 3. Main scene bootstrap
 * ---------------------------------------------------------------------- */
async function initScene() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const viewport = document.getElementById('scene-viewport');
  const canvas = document.getElementById('fs-canvas');
  const hotspotLayer = document.getElementById('hotspot-layer');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(new THREE.Color(COLORS.bg), 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.bg);
  scene.fog = new THREE.Fog(COLORS.bg, 3.5, 7);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
  camera.position.set(1.3, 0.9, 1.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.6;
  controls.maxDistance = 4.5;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.target.set(0, 0.1, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.update();

  let userInteracted = false;
  function stopAutoRotate() {
    if (userInteracted) return;
    userInteracted = true;
    controls.autoRotate = false;
  }
  controls.addEventListener('start', stopAutoRotate);
  renderer.domElement.addEventListener('pointerdown', stopAutoRotate, { passive: true });
  renderer.domElement.addEventListener('wheel', stopAutoRotate, { passive: true });

  // --- lighting ---------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xf6f8f3, 0x3b3325, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(2.2, 3.2, 1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 8;
  sun.shadow.camera.left = -1.5;
  sun.shadow.camera.right = 1.5;
  sun.shadow.camera.top = 1.5;
  sun.shadow.camera.bottom = -1.5;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe0d4, 0.35);
  fill.position.set(-2, 1.2, -1.5);
  scene.add(fill);

  // --- ground shadow-catcher --------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 48),
    new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- build device parts -------------------------------------------------
  const catalogue = buildPartCatalogue(THREE);
  const partObjects = {}; // partId -> { group, mesh(es), def, materials[], label }
  const deviceRoot = new THREE.Group();
  scene.add(deviceRoot);

  Object.keys(catalogue).forEach((partId) => {
    const def = catalogue[partId];
    const built = def.build();
    const group = new THREE.Group();
    group.add(built);
    group.position.copy(def.basePosition);
    group.userData.partId = partId;
    group.userData.explodeDir = def.explodeDir;
    group.userData.basePosition = def.basePosition.clone();
    group.userData.explodeAmount = 0;
    group.userData.noExplode = !!def.noExplode;

    const materials = [];
    built.traverse((child) => {
      if (child.isMesh) {
        child.userData.partId = partId;
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => materials.push(m));
        } else {
          materials.push(child.material);
          child.userData.baseEmissive = child.material.emissive ? child.material.emissive.clone() : null;
          child.userData.baseEmissiveIntensity = child.material.emissiveIntensity || 0;
          child.userData.baseOpacity = child.material.opacity;
          child.userData.baseTransparent = child.material.transparent;
        }
      }
    });

    deviceRoot.add(group);
    partObjects[partId] = { group, mesh: built, def, materials, label: def.label, layer: def.layer };
  });

  // Cutaway clipping plane through the enclosure (local X plane)
  const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.01);
  let cutawayOn = false;
  function applyCutaway(on) {
    cutawayOn = on;
    ['enclosure_lid', 'enclosure_base'].forEach((id) => {
      const part = partObjects[id];
      if (!part) return;
      part.materials.forEach((m) => {
        m.clippingPlanes = on ? [cutPlane] : [];
        m.transparent = on;
        m.opacity = on ? (id === 'enclosure_lid' ? 0.28 : 0.55) : 1;
        m.needsUpdate = true;
      });
    });
  }

  // --- hotspots -----------------------------------------------------------
  const hotspotEls = {};
  Object.keys(partObjects).forEach((partId) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotspot';
    btn.setAttribute('aria-label', 'Inspect ' + partObjects[partId].label);
    btn.innerHTML = '<span class="hotspot-dot"></span><span class="hotspot-label">' + partObjects[partId].label + '</span>';
    btn.addEventListener('click', () => selectPart(partId));
    hotspotLayer.appendChild(btn);
    hotspotEls[partId] = btn;
  });

  // --- selection / dimming state ------------------------------------------
  let selectedPart = null;
  const activeLayers = new Set(['power', 'sensing', 'comms', 'enclosure']);

  function setMaterialHighlight(material, mode) {
    // mode: 'normal' | 'selected' | 'dim'
    if (!('_fsBaseOpacity' in material)) {
      material._fsBaseOpacity = material.opacity;
      material._fsBaseTransparent = material.transparent;
      material._fsBaseEmissive = material.emissive ? material.emissive.clone() : null;
      material._fsBaseEmissiveIntensity = material.emissiveIntensity || 0;
    }
    if (mode === 'selected') {
      material.transparent = false;
      material.opacity = 1;
      if (material.emissive) {
        material.emissive.set(COLORS.accent);
        material.emissiveIntensity = 0.55;
      }
    } else if (mode === 'dim') {
      material.transparent = true;
      material.opacity = 0.22;
      if (material.emissive && material._fsBaseEmissive) {
        material.emissive.copy(material._fsBaseEmissive);
        material.emissiveIntensity = material._fsBaseEmissiveIntensity;
      }
    } else {
      material.transparent = material._fsBaseTransparent;
      material.opacity = material._fsBaseOpacity;
      if (material.emissive && material._fsBaseEmissive) {
        material.emissive.copy(material._fsBaseEmissive);
        material.emissiveIntensity = material._fsBaseEmissiveIntensity;
      }
    }
    material.needsUpdate = true;
  }

  function refreshVisualState() {
    Object.keys(partObjects).forEach((partId) => {
      const part = partObjects[partId];
      let mode = 'normal';
      if (selectedPart) {
        mode = partId === selectedPart ? 'selected' : 'dim';
      } else if (part.layer !== 'context' && !activeLayers.has(part.layer)) {
        mode = 'dim';
      }
      part.materials.forEach((m) => setMaterialHighlight(m, mode));
      const btn = hotspotEls[partId];
      if (btn) btn.classList.toggle('is-selected', partId === selectedPart);
    });
  }

  function renderSidePanel(partId) {
    const empty = document.getElementById('panel-empty');
    const detail = document.getElementById('panel-detail');
    if (!partId) {
      if (empty) empty.hidden = false;
      if (detail) detail.hidden = true;
      return;
    }
    const bomData = (window.FS_DATA && window.FS_DATA.bom) || null;
    const bomEntry = bomData ? bomData.device_parts.find((p) => p.part_id === partId) : null;
    const part = partObjects[partId];
    if (empty) empty.hidden = true;
    if (!detail) return;
    detail.hidden = false;

    const nameEl = document.getElementById('panel-name');
    const layerEl = document.getElementById('panel-layer');
    if (nameEl) nameEl.textContent = (bomEntry && bomEntry.name) || part.label;
    if (layerEl) layerEl.textContent = (part.layer || '').toUpperCase();

    const specBody = document.getElementById('panel-spec-body');
    if (specBody) {
      specBody.innerHTML = '';
      const spec = (bomEntry && bomEntry.spec) || {};
      Object.keys(spec).forEach((k) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = k;
        const td = document.createElement('td');
        td.textContent = spec[k];
        tr.appendChild(th); tr.appendChild(td);
        specBody.appendChild(tr);
      });
    }

    const bomLine = document.getElementById('panel-bom-line');
    if (bomLine) {
      if (bomEntry) {
        const totalUsd = (bomEntry.qty * bomEntry.unit_cost_usd).toFixed(2);
        const totalIdr = (bomEntry.qty * bomEntry.unit_cost_idr).toLocaleString('en-US');
        bomLine.innerHTML = bomEntry.qty > 0
          ? 'Qty <strong>' + bomEntry.qty + '</strong> &middot; $' + bomEntry.unit_cost_usd.toFixed(2) + ' each &middot; $' + totalUsd + ' / Rp ' + totalIdr + ' total &middot; <span class="tag' + (bomEntry.supplier_class === 'specialist' ? ' warn' : '') + '">' + bomEntry.supplier_class + '</span>'
          : 'Not a purchased BOM line — visualization aid only.';
      } else {
        bomLine.textContent = 'No BOM line for this element.';
      }
    }

    const whyEl = document.getElementById('panel-why');
    if (whyEl) whyEl.textContent = (bomEntry && bomEntry.why) || '';

    const dsWrap = document.getElementById('panel-datasheet');
    if (dsWrap) {
      if (bomEntry && bomEntry.datasheet_url) {
        dsWrap.innerHTML = '<a href="' + bomEntry.datasheet_url + '" target="_blank" rel="noreferrer">Datasheet ↗</a>';
        dsWrap.hidden = false;
      } else {
        dsWrap.hidden = true;
      }
    }
  }

  function selectPart(partId) {
    selectedPart = partId;
    refreshVisualState();
    renderSidePanel(partId);
  }
  function deselect() {
    selectedPart = null;
    refreshVisualState();
    renderSidePanel(null);
  }
  window.__fsDeselect = deselect;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') deselect();
  });
  const deselectBtn = document.getElementById('panel-deselect');
  if (deselectBtn) deselectBtn.addEventListener('click', deselect);

  // --- raycast selection on canvas click ----------------------------------
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  renderer.domElement.addEventListener('click', (evt) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObject(deviceRoot, true);
    if (hits.length) {
      const hitPartId = hits[0].object.userData.partId;
      if (hitPartId) selectPart(hitPartId);
    }
  });

  // --- explode slider -------------------------------------------------
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  let explodeTarget = 0;
  let explodeCurrent = 0;
  const explodeSlider = document.getElementById('explode-slider');
  if (explodeSlider) {
    explodeSlider.addEventListener('input', () => {
      explodeTarget = parseFloat(explodeSlider.value);
    });
  }

  // --- layer toggles -------------------------------------------------
  ['power', 'sensing', 'comms', 'enclosure'].forEach((layerName) => {
    const cb = document.getElementById('layer-toggle-' + layerName);
    if (!cb) return;
    cb.addEventListener('change', () => {
      if (cb.checked) activeLayers.add(layerName); else activeLayers.delete(layerName);
      refreshVisualState();
    });
  });

  // --- cutaway toggle -------------------------------------------------
  const cutawayCb = document.getElementById('cutaway-toggle');
  if (cutawayCb) {
    cutawayCb.addEventListener('change', () => applyCutaway(cutawayCb.checked));
  }

  // --- camera presets (hand-rolled tween) -------------------------------
  const PRESETS = {
    overview: { pos: new THREE.Vector3(1.3, 0.9, 1.6), target: new THREE.Vector3(0, 0.1, 0), cutaway: false },
    electronics: { pos: new THREE.Vector3(0.55, 0.5, 0.62), target: new THREE.Vector3(0.02, 0.33, 0), cutaway: true },
    soil: { pos: new THREE.Vector3(0.85, 0.35, 0.95), target: new THREE.Vector3(0.05, -0.25, -0.02), cutaway: false },
    power: { pos: new THREE.Vector3(0.75, 0.7, 0.55), target: new THREE.Vector3(-0.02, 0.4, 0), cutaway: true }
  };

  let tween = null; // { startPos, startTarget, endPos, endTarget, startTime, duration }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function flyTo(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) return;
    stopAutoRotate();
    tween = {
      startPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPos: preset.pos.clone(),
      endTarget: preset.target.clone(),
      startTime: performance.now(),
      duration: 700
    };
    if (cutawayCb) {
      cutawayCb.checked = preset.cutaway;
      applyCutaway(preset.cutaway);
    }
  }
  document.querySelectorAll('[data-camera-preset]').forEach((btn) => {
    btn.addEventListener('click', () => flyTo(btn.getAttribute('data-camera-preset')));
  });

  // --- resize -------------------------------------------------------
  function resize() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(viewport);
  }
  resize();

  // --- animation loop -------------------------------------------------
  const projected = new THREE.Vector3();
  function updateHotspots() {
    Object.keys(partObjects).forEach((partId) => {
      const part = partObjects[partId];
      const btn = hotspotEls[partId];
      if (!btn) return;
      part.group.getWorldPosition(projected);
      const behindOrTooDim = part.layer !== 'context' && selectedPart && selectedPart !== partId;
      projected.project(camera);
      const behindCamera = projected.z > 1;
      if (behindCamera) {
        btn.style.display = 'none';
        return;
      }
      const x = (projected.x * 0.5 + 0.5) * viewport.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * viewport.clientHeight;
      btn.style.display = '';
      btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      btn.style.opacity = behindOrTooDim ? '0.35' : '1';
    });
  }

  function updateExplode() {
    explodeCurrent += (explodeTarget - explodeCurrent) * 0.15;
    Object.keys(partObjects).forEach((partId) => {
      const part = partObjects[partId];
      if (part.group.userData.noExplode) return;
      const eased = smoothstep(Math.max(0, Math.min(1, explodeCurrent)));
      const base = part.group.userData.basePosition;
      const dir = part.group.userData.explodeDir;
      part.group.position.set(
        base.x + dir.x * eased,
        base.y + dir.y * eased,
        base.z + dir.z * eased
      );
    });
  }

  function updateTween(now) {
    if (!tween) return;
    const t = Math.min(1, (now - tween.startTime) / tween.duration);
    const eased = easeInOutCubic(t);
    camera.position.lerpVectors(tween.startPos, tween.endPos, eased);
    controls.target.lerpVectors(tween.startTarget, tween.endTarget, eased);
    if (t >= 1) tween = null;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    updateTween(now || performance.now());
    updateExplode();
    controls.update();
    updateHotspots();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  refreshVisualState();
}

/* ---------------------------------------------------------------------- *
 * 4. Entry point
 * ---------------------------------------------------------------------- */
(function boot() {
  function start() {
    if (!hasWebGL()) {
      showFallback('no webgl context');
      return;
    }
    initScene().catch((err) => {
      console.error('[FieldShift IoT 3D] scene init failed', err);
      showFallback(err);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
