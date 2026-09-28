import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('stress-canvas');
const viewport = document.getElementById('stress-scene-viewport');
const status = document.getElementById('stress-scene-status');

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf4ed');

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 5.4, 9.2);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f6046, 2.0));
  const sun = new THREE.DirectionalLight(0xfff8e7, 2.4);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  scene.add(sun);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.addEventListener('change', draw);

  const material = (color, roughness = 0.84, opacity = 1) => new THREE.MeshStandardMaterial({
    color,
    roughness,
    transparent: opacity < 1,
    opacity
  });
  const soilMaterial = material('#846849');
  const soilTopMaterial = material('#9b7d59');
  const groundMaterial = material('#e0e9dc');
  const rootMaterial = material('#d6bd8a');
  const stemMaterial = material('#5e7743');
  const leafGeometry = new THREE.SphereGeometry(1, 10, 7);
  const stemGeometry = new THREE.CylinderGeometry(0.025, 0.04, 1, 8);
  const rootGeometry = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.03, -0.13, 0),
    new THREE.Vector3(0.12, -0.25, 0)
  ]);
  const rootTubeGeometry = new THREE.TubeGeometry(rootGeometry, 8, 0.012, 5, false);
  const beds = [];
  const sceneItems = new THREE.Group();
  scene.add(sceneItems);

  const ground = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.22, 4.4), groundMaterial);
  ground.position.set(0, -0.17, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  function box(parent, size, position, colorMaterial) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), colorMaterial);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addLeaf(parent, materialValue, position, scale, rotation) {
    const leaf = new THREE.Mesh(leafGeometry, materialValue);
    leaf.position.set(position[0], position[1], position[2]);
    leaf.scale.set(scale[0], scale[1], scale[2]);
    leaf.rotation.set(rotation[0], rotation[1], rotation[2]);
    leaf.castShadow = true;
    parent.add(leaf);
    return leaf;
  }

  function makePlant(cropKey, x, z, index) {
    const plant = new THREE.Group();
    plant.position.set(x, 0.37, z);
    plant.userData.cropKey = cropKey;
    plant.userData.leaves = [];
    plant.userData.produce = new THREE.Group();
    plant.add(plant.userData.produce);

    const cropMat = material('#4b874c');
    plant.userData.leafMaterial = cropMat;
    const stemHeight = cropKey === 'maize' ? 1.6 : cropKey === 'rice' ? 1.28 : 1.02;
    const stemCount = cropKey === 'rice' ? 3 : 1;
    for (let stemIndex = 0; stemIndex < stemCount; stemIndex += 1) {
      const offset = (stemIndex - (stemCount - 1) / 2) * 0.07;
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.set(offset, stemHeight * 0.48, 0);
      stem.scale.y = stemHeight;
      stem.castShadow = true;
      plant.add(stem);

      const leafCount = cropKey === 'maize' ? 5 : 4;
      for (let leafIndex = 0; leafIndex < leafCount; leafIndex += 1) {
        const angle = (leafIndex / leafCount) * Math.PI * 2 + index * 0.4 + stemIndex * 0.65;
        const height = stemHeight * (0.27 + leafIndex * 0.12);
        const length = cropKey === 'maize' ? 0.58 : cropKey === 'rice' ? 0.43 : 0.39;
        const leaf = addLeaf(
          plant,
          cropMat,
          [Math.cos(angle) * 0.08 + offset, height, Math.sin(angle) * 0.08],
          [0.11, 0.045, length],
          [0.08, angle, (leafIndex % 2 ? -1 : 1) * 0.16]
        );
        plant.userData.leaves.push(leaf);
      }
    }

    if (cropKey === 'maize') {
      const cobMaterial = material('#d9a441');
      for (let cobIndex = 0; cobIndex < 2; cobIndex += 1) {
        const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 3, 7), cobMaterial);
        cob.position.set(cobIndex ? 0.12 : -0.12, stemHeight * 0.58, 0.02);
        cob.rotation.z = Math.PI / 2;
        plant.userData.produce.add(cob);
      }
    } else if (cropKey === 'rice') {
      const grainMaterial = material('#d9bd67');
      for (let grainIndex = 0; grainIndex < 7; grainIndex += 1) {
        const grain = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 6), grainMaterial);
        grain.position.set((grainIndex % 2 ? 0.07 : -0.07), stemHeight * 0.98 - Math.floor(grainIndex / 2) * 0.07, 0.02);
        plant.userData.produce.add(grain);
      }
    } else {
      const podMaterial = material('#86a45a');
      for (let podIndex = 0; podIndex < 4; podIndex += 1) {
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), podMaterial);
        pod.scale.set(0.55, 1.35, 0.7);
        pod.position.set((podIndex % 2 ? 0.14 : -0.14), stemHeight * (0.52 + Math.floor(podIndex / 2) * 0.17), 0.04);
        plant.userData.produce.add(pod);
      }
    }

    plant.userData.stemHeight = stemHeight;
    return plant;
  }

  function disposeGroup(group) {
    group.traverse(function (object) {
      if (object.geometry && object.geometry !== leafGeometry && object.geometry !== stemGeometry && object.geometry !== rootTubeGeometry) {
        object.geometry.dispose();
      }
      if (object.material && object.material !== soilMaterial && object.material !== soilTopMaterial && object.material !== groundMaterial && object.material !== rootMaterial && object.material !== stemMaterial) {
        if (Array.isArray(object.material)) object.material.forEach(function (item) { item.dispose(); });
        else object.material.dispose();
      }
    });
  }

  function makeBed(x, cropKey) {
    const group = new THREE.Group();
    const base = box(group, [3.55, 0.42, 2.45], [0, 0.12, 0], soilMaterial);
    const top = box(group, [3.58, 0.08, 2.48], [0, 0.37, 0], soilTopMaterial.clone());
    const rootsFace = box(group, [3.58, 0.02, 0.035], [0, -0.015, 1.245], material('#594936'));
    [-1.05, -0.55, 0, 0.55, 1.05].forEach(function (rootX, index) {
      const root = new THREE.Mesh(rootTubeGeometry, rootMaterial);
      root.position.set(rootX, 0.24, 1.28);
      root.rotation.z = index % 2 ? -0.35 : 0.35;
      group.add(root);
    });
    const plantPositions = [
      [-1.1, -0.57], [-0.35, -0.57], [0.42, -0.57], [1.1, -0.57],
      [-0.72, 0.36], [0.22, 0.36], [0.93, 0.36]
    ];
    const plants = plantPositions.map(function (position, index) {
      const plant = makePlant(cropKey, position[0], position[1], index);
      group.add(plant);
      return plant;
    });
    const irrigationLine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 2.55, 10),
      material('#4387a0')
    );
    irrigationLine.rotation.x = Math.PI / 2;
    irrigationLine.position.set(0, 0.46, 0);
    group.add(irrigationLine);
    const waterDots = [];
    [-0.82, 0, 0.82].forEach(function (dotX) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), material('#4b9bb1', 0.4, 0.84));
      dot.position.set(dotX, 0.45, 0);
      group.add(dot);
      waterDots.push(dot);
    });

    group.position.x = x;
    sceneItems.add(group);
    return { group: group, base: base, top: top, rootsFace: rootsFace, plants: plants, irrigationLine: irrigationLine, waterDots: waterDots, cropKey: cropKey, x: x };
  }

  function replaceBed(bed, cropKey) {
    if (bed) {
      sceneItems.remove(bed.group);
      disposeGroup(bed.group);
    }
    return makeBed(bed ? bed.x : 0, cropKey);
  }

  function paintBed(bed, result, week, overlay, harvestChangePct) {
    const risk = result.risk_index / 100;
    const dryColor = new THREE.Color('#b18b5d');
    const wetColor = new THREE.Color('#7f7655');
    bed.top.material.color.copy(wetColor).lerp(dryColor, 1 - result.water_reserve_index / 100);
    bed.rootsFace.material.color.copy(new THREE.Color('#594936')).lerp(dryColor, 1 - result.water_reserve_index / 100);
    if (overlay === 'condition') {
      bed.top.material.color.copy(new THREE.Color('#8b7658')).lerp(new THREE.Color('#d0a14f'), risk * 0.5);
    }
    bed.irrigationLine.visible = overlay === 'irrigation';
    bed.waterDots.forEach(function (dot, index) {
      dot.visible = overlay === 'irrigation' && result.irrigation_pct > 0 && index < Math.ceil(result.irrigation_pct / 40);
    });

    const maturity = 0.22 + 0.78 * (week / 12);
    const healthScale = 0.7 + 0.3 * (result.plant_condition_index / 100);
    const produceScale = Math.max(0.35, Math.min(1.3, 1 + harvestChangePct / 100));
    bed.plants.forEach(function (plant, index) {
      const variation = index % 2 ? 0.94 : 1;
      plant.scale.set(1, maturity * healthScale * variation, 1);
      const healthy = new THREE.Color(plant.userData.cropKey === 'rice' ? '#73924b' : '#4d874c');
      const stressed = new THREE.Color('#b68a47');
      plant.userData.leafMaterial.color.copy(healthy).lerp(stressed, risk * 0.82);
      plant.userData.leaves.forEach(function (leaf, leafIndex) {
        leaf.rotation.z = (leafIndex % 2 ? -1 : 1) * (0.14 + risk * 0.38);
      });
      plant.userData.produce.scale.setScalar(produceScale);
    });
  }

  function draw() {
    renderer.render(scene, camera);
  }

  function resize() {
    const width = Math.max(1, viewport.clientWidth);
    const height = Math.max(1, viewport.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }

  function update(payload) {
    if (!beds[0] || beds[0].cropKey !== payload.baselineKey) beds[0] = replaceBed(beds[0], payload.baselineKey);
    if (!beds[1] || beds[1].cropKey !== payload.adaptedKey) beds[1] = replaceBed(beds[1], payload.adaptedKey);
    beds[0].x = -2.0;
    beds[1].x = 2.0;
    beds[0].group.position.x = -2.0;
    beds[1].group.position.x = 2.0;
    paintBed(beds[0], payload.baseline, payload.baseline.week, payload.overlay, payload.harvestChangePct);
    paintBed(beds[1], payload.adapted, payload.adapted.week, payload.overlay, payload.harvestChangePct);
    status.textContent = 'Drag to rotate · scroll to zoom · root zone shown';
    draw();
  }

  beds[0] = makeBed(-2.0, 'rice');
  beds[1] = makeBed(2.0, 'mung_bean');
  window.FS = window.FS || {};
  window.FS.stressView = { update: update, resize: resize };
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(viewport);
  else window.addEventListener('resize', resize);
  resize();
  document.documentElement.dataset.stress3dReady = 'true';
} catch (error) {
  status.textContent = '3D renderer unavailable. Use a WebGL-enabled browser.';
  console.error('Stress Lab 3D renderer failed to initialize.', error);
}
