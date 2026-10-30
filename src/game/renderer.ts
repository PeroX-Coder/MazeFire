import * as THREE from 'three';
import { GeneratedMaze, TILE_WALL, getSpikeHeightFraction } from './maze.ts';
import {
  createStoneWallTexture,
  createCobblestoneFloorTexture,
  createLavaCanvasTexture,
  createSpikeTrapTexture,
  createTorchFlameTexture,
} from './textures.ts';
import { sound } from './audio.ts';

export interface SceneRenderContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  isSoftwareGl: boolean;
  dispose: () => void;
  loadLevel: (maze: GeneratedMaze, levelNumber: number) => void;
  render: (currentTime: number, dt: number, cameraShake: number) => void;
  triggerDeathBurst: (x: number, y: number, z: number, color: number) => void;
  triggerLightning: () => void;
}

export function createGameScene(canvas: HTMLCanvasElement): SceneRenderContext {
  // 1. Detect software WebGL as instructed by threejs skill
  const isSoftwareGl = (() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    stencil: false,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sceneBackground = new THREE.Color('#100c09');
  scene.background = sceneBackground;
  // Atmospheric linear fog allowing clear distant visibility up to 68 meters
  const dungeonFog = new THREE.Fog('#100c09', 18, 68);
  scene.fog = dungeonFog;

  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 90);

  // Balanced dungeon lighting setup with clear distant readability
  const ambientLight = new THREE.AmbientLight('#8a7665', 1.15);
  scene.add(ambientLight);

  // Warm/cool hemisphere fill
  const hemiLight = new THREE.HemisphereLight('#a8927e', '#3f2d22', 0.85);
  scene.add(hemiLight);

  // Player's handheld dungeon lantern / torchlight (reaches far down corridors)
  const playerTorch = new THREE.PointLight('#ffaa55', 4.6, 45, 1.15);
  playerTorch.castShadow = !isSoftwareGl;
  if (playerTorch.castShadow) {
    playerTorch.shadow.mapSize.width = 1024;
    playerTorch.shadow.mapSize.height = 1024;
    playerTorch.shadow.bias = -0.0005;
  }
  scene.add(playerTorch);

  // Directional moonlight through ceiling fissures
  const dirLight = new THREE.DirectionalLight('#997755', 0.7);
  dirLight.position.set(12, 32, 12);
  dirLight.castShadow = !isSoftwareGl;
  if (dirLight.castShadow) {
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
  }
  scene.add(dirLight);

  // Dynamic Overhead Lightning System
  const lightningLight = new THREE.DirectionalLight('#d6e8ff', 0);
  lightningLight.position.set(0, 40, 0);
  lightningLight.castShadow = !isSoftwareGl;
  if (lightningLight.castShadow) {
    lightningLight.shadow.mapSize.width = 1024;
    lightningLight.shadow.mapSize.height = 1024;
  }
  scene.add(lightningLight);

  const lightningAmbient = new THREE.AmbientLight('#a0c4ff', 0);
  scene.add(lightningAmbient);

  // Textures
  const maxAnisotropy = isSoftwareGl ? 1 : renderer.capabilities.getMaxAnisotropy();
  const wallTexture = createStoneWallTexture(maxAnisotropy);
  const floorTexture = createCobblestoneFloorTexture(maxAnisotropy);
  const lavaAnim = createLavaCanvasTexture();
  const spikeTexture = createSpikeTrapTexture();
  const flameTexture = createTorchFlameTexture();

  // Materials
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTexture,
    roughness: 0.88,
    metalness: 0.1,
    bumpMap: wallTexture,
    bumpScale: 0.04,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.82,
    metalness: 0.08,
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    map: wallTexture,
    roughness: 0.95,
    metalness: 0.05,
    color: '#333333',
  });

  const lavaMaterial = new THREE.MeshStandardMaterial({
    map: lavaAnim.texture,
    emissiveMap: lavaAnim.texture,
    emissive: new THREE.Color('#ff5500'),
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });

  const spikePlateMaterial = new THREE.MeshStandardMaterial({
    map: spikeTexture,
    roughness: 0.7,
    metalness: 0.4,
  });

  const spikeNeedleMaterial = new THREE.MeshStandardMaterial({
    color: '#6e6560',
    roughness: 0.35,
    metalness: 0.85,
  });

  // Level-specific container
  const levelGroup = new THREE.Group();
  scene.add(levelGroup);

  // Dynamic objects tracking
  interface SpikeMeshRef {
    needlesGroup: THREE.Group;
    spikeData: import('./maze.ts').SpikeTrapData;
  }
  let currentSpikeRefs: SpikeMeshRef[] = [];
  let currentMaze: GeneratedMaze | null = null;
  let exitPortalVortex: THREE.Mesh | null = null;
  let exitRuneRing: THREE.Mesh | null = null;

  // Torch lights pool
  const torchLights: THREE.PointLight[] = [];

  // Floating dungeon dust motes / spark particle system
  const PARTICLE_COUNT = 150;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleVelocities: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 40;
    particlePositions[i * 3 + 1] = Math.random() * 3.5;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    particleVelocities.push({
      x: (Math.random() - 0.5) * 0.15,
      y: 0.1 + Math.random() * 0.25,
      z: (Math.random() - 0.5) * 0.15,
    });
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: '#ffaa44',
    size: 0.09,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
  });
  const particlePoints = new THREE.Points(particleGeo, particleMat);
  scene.add(particlePoints);

  // Particle death burst system
  const BURST_COUNT = 50;
  const burstGeo = new THREE.BufferGeometry();
  const burstPositions = new Float32Array(BURST_COUNT * 3);
  const burstVelocities: { x: number; y: number; z: number; life: number }[] = [];
  for (let i = 0; i < BURST_COUNT; i++) {
    burstPositions[i * 3] = 0;
    burstPositions[i * 3 + 1] = -100;
    burstPositions[i * 3 + 2] = 0;
    burstVelocities.push({ x: 0, y: 0, z: 0, life: 0 });
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
  const burstMat = new THREE.PointsMaterial({
    color: '#ff3300',
    size: 0.18,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const burstPoints = new THREE.Points(burstGeo, burstMat);
  scene.add(burstPoints);

  function triggerDeathBurst(x: number, y: number, z: number, colorHex: number) {
    burstMat.color.setHex(colorHex);
    for (let i = 0; i < BURST_COUNT; i++) {
      burstPositions[i * 3] = x;
      burstPositions[i * 3 + 1] = y;
      burstPositions[i * 3 + 2] = z;
      const speed = 2.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      burstVelocities[i] = {
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.cos(phi) * speed + 1.5,
        z: Math.sin(phi) * Math.sin(theta) * speed,
        life: 0.7 + Math.random() * 0.4,
      };
    }
    burstGeo.attributes.position.needsUpdate = true;
  }

  function loadLevel(maze: GeneratedMaze, levelNumber: number) {
    currentMaze = maze;
    currentSpikeRefs = [];

    // Clear previous level meshes
    while (levelGroup.children.length > 0) {
      const child = levelGroup.children[0];
      levelGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
      }
    }

    // Clear old torch lights
    torchLights.length = 0;

    const totalWidth = maze.width * maze.tileSize;
    const totalHeight = maze.height * maze.tileSize;
    const halfW = totalWidth / 2;
    const halfH = totalHeight / 2;

    // 1. Build Floor
    floorTexture.repeat.set(maze.width * 2, maze.height * 2);
    floorTexture.needsUpdate = true;
    const floorGeo = new THREE.PlaneGeometry(totalWidth, totalHeight);
    const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = !isSoftwareGl;
    levelGroup.add(floorMesh);

    // 2. Build Ceiling
    wallTexture.repeat.set(maze.width, maze.height);
    const ceilingGeo = new THREE.PlaneGeometry(totalWidth, totalHeight);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMaterial);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(0, maze.wallHeight, 0);
    levelGroup.add(ceilingMesh);

    // 3. Count wall blocks & instantiate InstancedMesh
    let wallCount = 0;
    for (let z = 0; z < maze.height; z++) {
      for (let x = 0; x < maze.width; x++) {
        if (maze.grid[z][x] === TILE_WALL) {
          wallCount++;
        }
      }
    }

    const wallBoxGeo = new THREE.BoxGeometry(maze.tileSize, maze.wallHeight, maze.tileSize);
    const wallInstancedMesh = new THREE.InstancedMesh(wallBoxGeo, wallMaterial, wallCount);
    wallInstancedMesh.castShadow = !isSoftwareGl;
    wallInstancedMesh.receiveShadow = !isSoftwareGl;

    const dummy = new THREE.Object3D();
    let instanceIdx = 0;

    for (let z = 0; z < maze.height; z++) {
      for (let x = 0; x < maze.width; x++) {
        if (maze.grid[z][x] === TILE_WALL) {
          const wx = (x - maze.width / 2 + 0.5) * maze.tileSize;
          const wz = (z - maze.height / 2 + 0.5) * maze.tileSize;
          dummy.position.set(wx, maze.wallHeight / 2, wz);
          dummy.updateMatrix();
          wallInstancedMesh.setMatrixAt(instanceIdx++, dummy.matrix);
        }
      }
    }
    wallInstancedMesh.instanceMatrix.needsUpdate = true;
    wallInstancedMesh.computeBoundingSphere();
    levelGroup.add(wallInstancedMesh);

    // 4. Build Lava Pits
    for (const lava of maze.lava) {
      const lavaMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(maze.tileSize * 0.94, maze.tileSize * 0.94),
        lavaMaterial,
      );
      lavaMesh.rotation.x = -Math.PI / 2;
      lavaMesh.position.set(lava.worldX, 0.02, lava.worldZ); // slightly above floor to avoid z-fighting
      levelGroup.add(lavaMesh);

      // Low glowing point light near lava (limit active lights for performance)
      if (levelGroup.children.length < 25) {
        const lavaLight = new THREE.PointLight('#ff4400', 1.0, 5, 2.0);
        lavaLight.position.set(lava.worldX, 0.4, lava.worldZ);
        levelGroup.add(lavaLight);
      }
    }

    // 5. Build Spike Traps (3D procedural trap plates with animated steel spikes)
    const needleGeo = new THREE.ConeGeometry(0.09, 0.85, 4);
    needleGeo.translate(0, 0.42, 0);

    for (const spike of maze.spikes) {
      const trapGroup = new THREE.Group();
      trapGroup.position.set(spike.worldX, 0, spike.worldZ);

      // Low-poly stone base plate
      const plateMesh = new THREE.Mesh(
        new THREE.BoxGeometry(maze.tileSize * 0.92, 0.06, maze.tileSize * 0.92),
        spikePlateMaterial,
      );
      plateMesh.position.set(0, 0.03, 0);
      plateMesh.receiveShadow = !isSoftwareGl;
      trapGroup.add(plateMesh);

      // 4x4 array of steel spikes in a single group for fast 1-step Y update
      const needlesGroup = new THREE.Group();
      needlesGroup.position.y = -0.6; // retracted by default
      const step = (maze.tileSize * 0.7) / 3;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const nx = (c - 1.5) * step;
          const nz = (r - 1.5) * step;
          const needle = new THREE.Mesh(needleGeo, spikeNeedleMaterial);
          needle.position.set(nx, 0, nz);
          needle.castShadow = !isSoftwareGl;
          needlesGroup.add(needle);
        }
      }
      trapGroup.add(needlesGroup);

      levelGroup.add(trapGroup);
      currentSpikeRefs.push({
        needlesGroup,
        spikeData: spike,
      });
    }

    // 6. Build Wall Torches (Low-poly iron sconces + glowing emissive flame)
    const flameMat = new THREE.SpriteMaterial({
      map: flameTexture,
      blending: THREE.AdditiveBlending,
      color: '#ffa044',
    });

    const sconceGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.4, 4); // low-poly 4-sided
    const sconceMat = new THREE.MeshStandardMaterial({ color: '#2a221d', metalness: 0.8, roughness: 0.4 });

    // Limit active point lights to at most 3 to ensure locked 60fps lag-free rendering
    const maxActiveTorchLights = 3;
    for (let i = 0; i < maze.torches.length; i++) {
      const torch = maze.torches[i];
      const torchGroup = new THREE.Group();
      torchGroup.position.set(torch.worldX, torch.worldY, torch.worldZ);

      const sconceMesh = new THREE.Mesh(sconceGeo, sconceMat);
      sconceMesh.rotation.z = torch.normalX * 0.35;
      sconceMesh.rotation.x = -torch.normalZ * 0.35;
      torchGroup.add(sconceMesh);

      const flameSprite = new THREE.Sprite(flameMat);
      flameSprite.scale.set(0.42, 0.7, 1);
      flameSprite.position.set(0, 0.28, 0);
      torchGroup.add(flameSprite);

      levelGroup.add(torchGroup);

      if (i < maxActiveTorchLights) {
        const torchLight = new THREE.PointLight('#ff9944', 2.0, 16, 2.0);
        torchLight.position.set(torch.worldX, torch.worldY + 0.3, torch.worldZ);
        levelGroup.add(torchLight);
        torchLights.push(torchLight);
      }
    }

    // 7. Build Exit Portal of Salvation
    const exitGroup = new THREE.Group();
    exitGroup.position.set(maze.exitPos.x, 0, maze.exitPos.z);

    // Stone Archway pillars
    const pillarGeo = new THREE.BoxGeometry(0.5, 3.2, 0.5);
    const archMat = new THREE.MeshStandardMaterial({
      color: '#3d342d',
      roughness: 0.75,
      metalness: 0.2,
    });

    const leftPillar = new THREE.Mesh(pillarGeo, archMat);
    leftPillar.position.set(-1.1, 1.6, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, archMat);
    rightPillar.position.set(1.1, 1.6, 0);
    const archLintel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 0.7), archMat);
    archLintel.position.set(0, 3.2, 0);

    exitGroup.add(leftPillar, rightPillar, archLintel);

    // Swirling mystic portal vortex
    const vortexGeo = new THREE.PlaneGeometry(1.9, 2.7);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: '#00ffee',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    exitPortalVortex = new THREE.Mesh(vortexGeo, vortexMat);
    exitPortalVortex.position.set(0, 1.45, 0);
    exitGroup.add(exitPortalVortex);

    // Mystic runic ring on floor
    const ringGeo = new THREE.RingGeometry(0.8, 1.3, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#22ffcc',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    exitRuneRing = new THREE.Mesh(ringGeo, ringMat);
    exitRuneRing.rotation.x = -Math.PI / 2;
    exitRuneRing.position.set(0, 0.04, 0);
    exitGroup.add(exitRuneRing);

    // Portal celestial light
    const portalLight = new THREE.PointLight('#00ffff', 2.5, 12, 1.8);
    portalLight.position.set(0, 1.6, 0);
    exitGroup.add(portalLight);

    levelGroup.add(exitGroup);
  }

  function handleResize() {
    const width = canvas.parentElement?.clientWidth || window.innerWidth;
    const height = canvas.parentElement?.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  function render(currentTime: number, dt: number, cameraShake: number) {
    // 1. GPU animated lava texture scrolling (Zero CPU canvas draw overhead!)
    lavaAnim.texture.offset.x = (currentTime * 0.035) % 1;
    lavaAnim.texture.offset.y = (currentTime * 0.018) % 1;

    // 2. Animate spike traps (Single fast group position update per trap)
    for (let i = 0; i < currentSpikeRefs.length; i++) {
      const spikeRef = currentSpikeRefs[i];
      const hFraction = getSpikeHeightFraction(spikeRef.spikeData, currentTime);
      spikeRef.needlesGroup.position.y = -0.6 + hFraction * 0.68;
    }

    // 3. Lightning flash simulation
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      // Periodic atmospheric lightning strike every 8 - 14 seconds
      lightningTimer = 8.0 + Math.random() * 6.0;
      triggerLightning();
    }

    if (lightningFlashTime > 0) {
      lightningFlashTime -= dt;
      const elapsed = lightningTotalDuration - lightningFlashTime;
      const progress = Math.min(1.0, elapsed / lightningTotalDuration);

      // Realistic multi-stroke lightning strobe with lingering illumination:
      // Initial snap (0-15%) -> brief lull (15-22%) -> thunderous main strike (22-45%) -> lingering rolling glow (45-100%)
      let flash = 0;
      if (progress < 0.15) {
        flash = (progress / 0.15) * 8.0;
      } else if (progress < 0.22) {
        flash = 3.5 + Math.random() * 2.0;
      } else if (progress < 0.45) {
        flash = 12.0;
      } else {
        const decay = (progress - 0.45) / 0.55;
        flash = 12.0 * Math.exp(-decay * 3.8);
      }

      lightningLight.position.set(camera.position.x + 3, 36, camera.position.z + 3);
      lightningLight.target.position.copy(camera.position);
      lightningLight.intensity = flash;
      lightningAmbient.intensity = flash * 0.95;

      // Stark gothic illumination: distant walls, pillars, and arches silhouette against sky-blue fog
      dungeonFog.near = 30;
      dungeonFog.far = 135; // push fog far away during lightning so entire maze is revealed
      dungeonFog.color.set('#2a3e52');
      sceneBackground.set('#1e2c3b');
    } else {
      lightningLight.intensity = 0;
      lightningAmbient.intensity = 0;
      dungeonFog.near = 18;
      dungeonFog.far = 70;
      dungeonFog.color.set('#100c09');
      sceneBackground.set('#100c09');
    }

    // 4. Flicker player torchlight & wall torches
    const flicker = Math.sin(currentTime * 18.0) * 0.25 + Math.cos(currentTime * 29.0) * 0.15;
    playerTorch.intensity = 4.6 + flicker;
    playerTorch.position.copy(camera.position);

    for (let i = 0; i < torchLights.length; i++) {
      torchLights[i].intensity = 2.4 + Math.sin(currentTime * 12 + i * 2) * 0.35;
    }

    // 5. Animate exit portal vortex
    if (exitPortalVortex) {
      const pScale = 1.0 + Math.sin(currentTime * 4.0) * 0.04;
      exitPortalVortex.scale.set(pScale, pScale, 1);
    }
    if (exitRuneRing) {
      exitRuneRing.rotation.z = currentTime * 0.8;
    }

    // 6. Update floating ambient dust particles
    const positions = particleGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      positions[idx] += particleVelocities[i].x * dt;
      positions[idx + 1] += particleVelocities[i].y * dt;
      positions[idx + 2] += particleVelocities[i].z * dt;

      // Wrap around near player
      if (positions[idx + 1] > 3.6) {
        positions[idx + 1] = 0.1;
        positions[idx] = camera.position.x + (Math.random() - 0.5) * 20;
        positions[idx + 2] = camera.position.z + (Math.random() - 0.5) * 20;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // 7. Update death burst particles
    const bPos = burstGeo.attributes.position.array as Float32Array;
    let anyActive = false;
    for (let i = 0; i < BURST_COUNT; i++) {
      if (burstVelocities[i].life > 0) {
        anyActive = true;
        burstVelocities[i].life -= dt;
        bPos[i * 3] += burstVelocities[i].x * dt;
        bPos[i * 3 + 1] += burstVelocities[i].y * dt;
        bPos[i * 3 + 2] += burstVelocities[i].z * dt;
        burstVelocities[i].y -= 9.8 * dt; // gravity on burst
      } else {
        bPos[i * 3 + 1] = -100;
      }
    }
    if (anyActive) {
      burstGeo.attributes.position.needsUpdate = true;
    }

    // 8. Render frame
    renderer.render(scene, camera);
  }

  // Lightning state tracking
  let lightningTimer = 4.5; // Initial strike after 4.5 seconds
  let lightningFlashTime = 0;
  const lightningTotalDuration = 1.35;

  function triggerLightning() {
    lightningFlashTime = lightningTotalDuration;
    sound.playThunder();
  }

  function dispose() {
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
  }

  return {
    renderer,
    scene,
    camera,
    isSoftwareGl,
    dispose,
    loadLevel,
    render,
    triggerDeathBurst,
    triggerLightning,
  };
}
