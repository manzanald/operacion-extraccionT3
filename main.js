import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
//1 Escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141a);
scene.fog = new THREE.Fog(0x10141a, 10, 80);
//2 Camara = ojos del jugador
const PLAYER_HEIGHT = 1.7;
const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 500
);
camera.position.set(0, PLAYER_HEIGHT, 5);
scene.add(camera);
//3 Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
//4 Luces
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
scene.add(new THREE.HemisphereLight(0x8899aa, 0x222222, 2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(10, 20, 10);
scene.add(sun);
//5 Piso
const textureLoader = new THREE.TextureLoader();
const floorTexture = await textureLoader.loadAsync('./textures/piso.png');
floorTexture.colorSpace = THREE.SRGBColorSpace;
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(40, 40);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ map: floorTexture })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
//6 Nivel: paredes
const walls = [];
const wallMeshes = [];
const wallTexture = await textureLoader.loadAsync('./textures/pared.png');
wallTexture.colorSpace = THREE.SRGBColorSpace;
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
function addWall(x, z, width, depth) {
  const texture = wallTexture.clone();
  texture.needsUpdate = true;
  texture.repeat.set(Math.max(width, depth) / 4, 1);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 4, depth),
    new THREE.MeshStandardMaterial({ map: texture })
  );
  mesh.position.set(x, 2, z);
  scene.add(mesh);
  wallMeshes.push(mesh);
  walls.push({
    minX: x - width / 2, maxX: x + width / 2,
    minZ: z - depth / 2, maxZ: z + depth / 2
  });
}
addWall(-15, -40, 1, 100);
addWall(15, -40, 1, 100);
addWall(0, 10, 31, 1);
addWall(0, -90, 31, 1);
addWall(-7, -20, 16, 1);
addWall(7, -40, 16, 1);
addWall(-7, -60, 16, 1);
addWall(0, -30, 3, 3);
addWall(-8, -50, 3, 3);
addWall(8, -70, 3, 3);
//7 Zona de inicio (azul) y zona de extraccion (verde)
const startZone = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 8),
  new THREE.MeshBasicMaterial({ color: 0x2255aa })
);
startZone.rotation.x = -Math.PI / 2;
startZone.position.set(0, 0.02, 4);
scene.add(startZone);
const extractionZone = new THREE.Mesh(
  new THREE.PlaneGeometry(28, 10),
  new THREE.MeshBasicMaterial({ color: 0x22aa55 })
);
extractionZone.rotation.x = -Math.PI / 2;
extractionZone.position.set(0, 0.02, -84);
scene.add(extractionZone);
//8 Mouse: PointerLock y estado del juego
const controls = new PointerLockControls(camera, document.body);
const inicio = document.querySelector('#inicio');
const mensaje = document.querySelector('#mensaje');
let gameState = 'playing';
inicio.addEventListener('click', () => controls.lock());
controls.addEventListener('lock',   () => inicio.style.display = 'none');
controls.addEventListener('unlock', () => {
  if (gameState === 'playing') inicio.style.display = 'flex';
});
function endGame(result) {
  if (gameState !== 'playing') return;
  gameState = result;
  controls.unlock();
  if (result === 'win') {
    mensaje.style.color = '#55ff77';
    mensaje.innerHTML = '¡MISIÓN COMPLETADA!<br><small style="font-size:28px">Has llegado a la zona de extracción</small><br><small style="font-size:22px">Presiona R para jugar de nuevo</small>';
  } else {
    mensaje.style.color = '#ff5555';
    mensaje.innerHTML = 'GAME OVER<br><small style="font-size:28px">Un zombi te atrapó</small><br><small style="font-size:22px">Presiona R para reiniciar</small>';
  }
  mensaje.style.display = 'flex';
}
addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r' && gameState !== 'playing') location.reload();
});
//9 Teclado
const keys = {};
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);
//10 Movimiento con colision contra las paredes
const PLAYER_RADIUS = 0.5;
function collides(x, z) {
  for (const w of walls) {
    if (x > w.minX - PLAYER_RADIUS && x < w.maxX + PLAYER_RADIUS &&
        z > w.minZ - PLAYER_RADIUS && z < w.maxZ + PLAYER_RADIUS) {
      return true;
    }
  }
  return false;
}
function updatePlayer(delta) {
  if (!controls.isLocked) return;
  const oldX = camera.position.x;
  const oldZ = camera.position.z;
  const step = 8 * delta;
  if (keys['w']) controls.moveForward(step);
  if (keys['s']) controls.moveForward(-step);
  if (keys['a']) controls.moveRight(-step);
  if (keys['d']) controls.moveRight(step);
  const newX = camera.position.x;
  const newZ = camera.position.z;
  camera.position.x = collides(newX, oldZ) ? oldX : newX;
  camera.position.z = collides(camera.position.x, newZ) ? oldZ : newZ;
  camera.position.y = PLAYER_HEIGHT;
}
//11 Armas
const loader = new GLTFLoader();
const weapons = [];
async function loadWeapon(file, rotationY) {
  const gltf = await loader.loadAsync(file);
  const model = gltf.scene;
  model.rotation.y = rotationY;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(0.6 / Math.max(size.x, size.y, size.z));
  const box2 = new THREE.Box3().setFromObject(model);
  model.position.sub(box2.getCenter(new THREE.Vector3()));
  const holder = new THREE.Group();
  holder.add(model);
  holder.position.set(0.35, -0.3, -0.7);
  holder.visible = false;
  camera.add(holder);
  return holder;
}
weapons.push(await loadWeapon('./models/arma1.glb', Math.PI / 2));
weapons.push(await loadWeapon('./models/arma2.glb', Math.PI / 2));
//12 Municion: cada arma tiene su propio contador
const ammo = [6, 12];
let currentWeapon = 0;
const hud = document.querySelector('#hud');
let aviso = '';
function updateHud() {
  let texto = `Arma ${currentWeapon + 1} · Balas: ${ammo[currentWeapon]}`;
  if (ammo[currentWeapon] === 0) texto += ' · ¡SIN BALAS!';
  if (aviso) texto += ' · ' + aviso;
  hud.textContent = texto;
}
function selectWeapon(n) {
  currentWeapon = n;
  weapons.forEach((w, i) => w.visible = (i === n));
  updateHud();
}
selectWeapon(0);
addEventListener('keydown', e => {
  if (e.key === '1') selectWeapon(0);
  if (e.key === '2') selectWeapon(1);
});
//13 Disparo: un clic = un disparo
let recoil = 0;
const raycaster = new THREE.Raycaster();
function shoot() {
  if (!controls.isLocked) return;
  if (ammo[currentWeapon] <= 0) return;
  ammo[currentWeapon]--;
  updateHud();
  recoil = 0.08;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targets = [
    ...wallMeshes,
    ...zombies.filter(z => z.hp > 0).map(z => z.hitbox)
  ];
  const hits = raycaster.intersectObjects(targets);
  if (hits.length > 0 && hits[0].object.userData.zombie) {
    hitZombie(hits[0].object.userData.zombie);
  }
}
addEventListener('mousedown', e => {
  if (e.button === 0) shoot();
});
function updateWeapon(delta) {
  recoil = Math.max(0, recoil - delta * 0.6);
  weapons.forEach(w => w.position.z = -0.7 + recoil);
}
//14 Cajas de municion
const AMMO_PER_BOX = 5;
const pickups = [];
const boxGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.6);
const boxMaterial = new THREE.MeshStandardMaterial({
  color: 0xffcc00,
  emissive: 0x664400,
  emissiveIntensity: 1.5
});
const pickupPositions = [
  [-10, -10], [10, -26], [-10, -36],
  [10, -50], [-10, -64], [8, -78]
];
pickupPositions.forEach(p => {
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(p[0], 0.5, p[1]);
  scene.add(box);
  pickups.push(box);
});
function updatePickups(delta) {
  if (gameState !== 'playing' || !controls.isLocked) return;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const box = pickups[i];
    box.rotation.y += 2 * delta;
    box.position.y = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.1;
    const d = Math.hypot(
      camera.position.x - box.position.x,
      camera.position.z - box.position.z
    );
    if (d < 1.2) {
      scene.remove(box);
      pickups.splice(i, 1);
      ammo[currentWeapon] += AMMO_PER_BOX;
      aviso = `+${AMMO_PER_BOX} balas`;
      updateHud();
      setTimeout(() => { aviso = ''; updateHud(); }, 1500);
    }
  }
}
//15 Zombis
const DETECTION_RANGE = 15;
const ZOMBIE_SPEED = 2.5;
const ZOMBIE_HEIGHT = 0.2;
const zombies = [];
const zombieGltf = await loader.loadAsync('./models/zombi.glb');
function createZombie(x, z) {
  const model = SkeletonUtils.clone(zombieGltf.scene);
  model.rotation.y = 0;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.setScalar(ZOMBIE_HEIGHT / size.y);
  const box2 = new THREE.Box3().setFromObject(model);
  const center = box2.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box2.min.y, -center.z);
  const holder = new THREE.Group();
  holder.add(model);
  holder.position.set(x, 0, z);
  scene.add(holder);
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.8, 0.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = 0.9;
  holder.add(hitbox);
  const zombie = { mesh: holder, hitbox: hitbox, state: 'idle', hp: 2,
                   speed: THREE.MathUtils.randFloat(2, 3.5) };
  hitbox.userData.zombie = zombie;
  zombies.push(zombie);
}
const zombiePositions = [
  [8, -14], [-6, -28], [6, -36], [-9, -46],
  [8, -56], [-6, -66], [3, -74], [-8, -78]
];
zombiePositions.forEach(p => createZombie(p[0], p[1]));
function updateZombies(delta) {
  if (gameState !== 'playing' || !controls.isLocked) return;
  for (const z of zombies) {
    if (z.hp <= 0) continue;
    const dx = camera.position.x - z.mesh.position.x;
    const dz = camera.position.z - z.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (z.state === 'idle' && dist < DETECTION_RANGE) z.state = 'active';
    if (z.state !== 'active') continue;
    if (dist < 1.0) {
      endGame('gameover');
      return;
    }
    z.mesh.lookAt(camera.position.x, 0, camera.position.z);
    if (dist > 0.8) {
      const step = z.speed * delta;
      const newX = z.mesh.position.x + (dx / dist) * step;
      const newZ = z.mesh.position.z + (dz / dist) * step;
      if (!collides(newX, z.mesh.position.z)) z.mesh.position.x = newX;
      if (!collides(z.mesh.position.x, newZ)) z.mesh.position.z = newZ;
    }
  }
}
function checkExtraction() {
  const p = camera.position;
  if (Math.abs(p.x) < 14 && p.z < -79 && p.z > -89) endGame('win');
}
const mira = document.querySelector('#mira');
function hitZombie(z) {
  z.hp--;
  mira.style.color = 'red';
  setTimeout(() => mira.style.color = 'white', 100);
  if (z.hp <= 0) {
    z.mesh.children[0].rotation.x = -Math.PI / 2;
  }
}
//16 Bucle del juego
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(delta);
  updateWeapon(delta);
  updateZombies(delta);
  checkExtraction();
  updatePickups(delta);
  renderer.render(scene, camera);
}
animate();
//17 Ajustar al cambiar el tamaño de la ventana
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});