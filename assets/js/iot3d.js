import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('fs-canvas');
const viewport = document.getElementById('scene-viewport');
const fallback = document.querySelector('.scene-fallback');
const title = document.getElementById('part-title');
const description = document.getElementById('part-desc');
const specs = document.getElementById('part-specs');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9f1ec');

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
camera.position.set(4.2, 3.4, 5.2);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.add(new THREE.HemisphereLight(0xffffff, 0x66533f, 2.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(4, 8, 5);
sun.castShadow = true;
scene.add(sun);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.9, 0);
controls.minDistance = 3.2;
controls.maxDistance = 10;

const material = (color, roughness = 0.72, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mat = {
  soil: material('#806246'), soilCut: material('#9c7b54'), white: material('#f6f8f3'), green: material('#235c3a'),
  pcb: material('#286b50'), metal: material('#b5c2bd', .34, .65), dark: material('#23302a', .36), blue: material('#41738a'), gold: material('#d9a441')
};
const parts = [];
function addPart(id, label, info, group) {
  group.userData.partId = id;
  group.userData.label = label;
  group.userData.info = info;
  scene.add(group);
  parts.push(group);
  return group;
}
function box(parent, size, position, materialValue, radius = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materialValue);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, radiusTop, radiusBottom, height, position, materialValue, radialSegments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), materialValue);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// Layered soil bed and measurement zone.
const ground = new THREE.Mesh(new THREE.BoxGeometry(7, .42, 4.2), mat.soil);
ground.position.set(0, .13, 0);
ground.receiveShadow = true;
scene.add(ground);
const soilBand = new THREE.Mesh(new THREE.BoxGeometry(7.02, .04, 4.22), mat.soilCut);
soilBand.position.set(0, .36, 0);
scene.add(soilBand);

// Weather-resistant logger with a visible single-board computer inside.
const logger = new THREE.Group();
box(logger, [1.2, .68, .82], [0, 1.45, 0], mat.white);
box(logger, [.74, .04, .46], [0, 1.1, .03], mat.pcb);
box(logger, [.2, .07, .16], [-.16, 1.16, .04], mat.dark);
box(logger, [.16, .05, .12], [.19, 1.16, .03], mat.metal);
box(logger, [.1, .06, .07], [.37, 1.16, .03], mat.dark);
box(logger, [.22, .11, .2], [-.53, 1.45, .12], mat.blue);
addPart('logger', 'Pi Zero 2 W + sealed enclosure', 'Stores sensor samples and surface images locally, then transfers them over Wi-Fi. Prototype uses read-only GPIO and no actuator outputs.', logger);

// Soil probe enters root-zone soil; a separate cable returns to the logger.
const probe = new THREE.Group();
cylinder(probe, .055, .055, .78, [0, .69, .1], mat.metal, 12);
box(probe, [.16, .2, .08], [0, .95, .1], mat.blue);
cylinder(probe, .045, .025, .16, [0, .22, .1], mat.dark, 12);
addPart('probe', 'Root-zone moisture probe', 'Measures volumetric water content below the surface. Calibrate against soil samples from the pilot plot before using numeric accuracy claims.', probe);

// Surface-facing camera on a short adjustable bracket.
const cameraPart = new THREE.Group();
box(cameraPart, [.38, .25, .12], [-1.0, 1.75, -.48], mat.dark);
cylinder(cameraPart, .09, .09, .12, [-1, 1.75, -.4], mat.blue, 24).rotation.x = Math.PI / 2;
cylinder(cameraPart, .045, .045, .03, [-1, 1.75, -.32], mat.metal, 24).rotation.x = Math.PI / 2;
box(cameraPart, [.07, .52, .07], [-.86, 1.48, -.4], mat.metal);
addPart('camera', 'Surface camera', 'Captures a fixed soil patch for visual records such as surface color, cracks, cover, or ponding. It does not measure subsurface moisture or soil chemistry.', cameraPart);

// Air sensor in a simple radiation shield above the enclosure.
const air = new THREE.Group();
cylinder(air, .06, .06, .34, [.5, 1.95, .08], mat.gold, 12);
for (let i = 0; i < 4; i += 1) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.19 - i * .015, .19 - i * .015, .035, 24), mat.white);
  disc.position.set(.5, 1.78 + i * .09, .08);
  disc.castShadow = true;
  air.add(disc);
}
addPart('air', 'Air temperature / humidity', 'Measures local microclimate near the plot. Use a ventilated shield and keep it out of direct sun and splash.', air);

// Inline flow meter with a separate read-only pulse wire to the logger.
const flow = new THREE.Group();
cylinder(flow, .17, .17, 1.45, [2.12, .58, .35], mat.blue, 24).rotation.z = Math.PI / 2;
cylinder(flow, .12, .12, .25, [2.12, .58, .35], mat.white, 24).rotation.z = Math.PI / 2;
box(flow, [.34, .18, .28], [2.12, .81, .35], mat.white);
box(flow, [.09, .09, .09], [2.12, .92, .35], mat.green);
addPart('flow', 'Inline water-flow meter', 'Counts flow pulses to estimate volume and flow rate. Use a compatible low-voltage sensor and level interface.', flow);

// Isolated status contact shown as a read-only signal, not a switching relay.
const status = new THREE.Group();
box(status, [.44, .22, .24], [1.28, 1.28, .48], mat.gold);
box(status, [.24, .1, .2], [1.28, 1.45, .48], mat.white);
addPart('pump', 'Isolated pump-status input', 'Reads an existing compatible low-voltage controller contact. Unknown remains unknown; this kit cannot start or stop the pump.', status);

// Cable runs are decorative geometry; no power path or actuator is represented.
function cable(points, color) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .018, 6, false), material(color));
  scene.add(mesh);
}
cable([[-.53, 1.34, -.2], [-.72, 1.02, -.25], [-.95, .65, -.25], [-.95, .48, -.25]], '#315b78');
cable([[.48, 1.33, .2], [.82, 1.12, .26], [1.28, 1.05, .48]], '#d9a441');
cable([[.02, 1.13, .18], [.12, .98, .2], [.12, .87, .2]], '#397a50');

const hitTargets = [];
parts.forEach((group) => group.traverse((node) => { if (node.isMesh) { node.userData.partGroup = group; hitTargets.push(node); } }));
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function selectPart(group) {
  title.textContent = group.userData.label;
  description.textContent = group.userData.info;
  const rows = {
    logger: [['Power', '5 V USB'], ['Network', 'Wi-Fi'], ['Role', 'Read and store']],
    camera: [['Direction', 'Surface-facing'], ['Realtime', 'Image each 5 min'], ['Batch', '2 images / day']],
    probe: [['Measure', 'Root-zone VWC'], ['Mode', 'Soil-calibrated'], ['Output', 'Timestamped sample']],
    air: [['Measure', 'Temperature + RH'], ['Mount', 'Ventilated shield'], ['Output', 'Timestamped sample']],
    flow: [['Measure', 'Flow pulses'], ['Mount', 'Inline water pipe'], ['Output', 'Rate + volume estimate']],
    pump: [['Input', 'Isolated status contact'], ['Direction', 'Read-only'], ['Missing signal', 'Unknown']]
  }[group.userData.partId];
  specs.innerHTML = rows.map(([key, value]) => '<div class="spec-row"><span>' + key + '</span><strong>' + value + '</strong></div>').join('');
}
selectPart(logger);

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitTargets, false)[0];
  if (hit && hit.object.userData.partGroup) selectPart(hit.object.userData.partGroup);
});

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  const views = {
    overview: [4.2, 3.4, 5.2], camera: [-3.1, 2.5, 3.2], soil: [2.7, 1.65, 3.1], water: [4.2, 1.7, 2.4]
  };
  camera.position.set(...views[button.getAttribute('data-view')]);
  controls.target.set(0, .9, 0);
  controls.update();
}));

function resize() {
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(300, viewport.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();
document.documentElement.dataset.iot3dReady = 'true';
function animate() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(animate); }
animate();
