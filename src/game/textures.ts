import * as THREE from 'three';

/**
 * Procedural texture generator for low-poly retro stone dungeon aesthetics.
 * Uses 2D canvas drawing to create pixel-rich, authentic old-gen textures.
 */

export function createStoneWallTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark stone base
  ctx.fillStyle = '#2b2927';
  ctx.fillRect(0, 0, 512, 512);

  // Brick rows (old-gen dungeon blocks)
  const rows = 8;
  const rowHeight = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * rowHeight;
    const cols = 4;
    const colWidth = 512 / cols;
    const offset = (r % 2) * (colWidth / 2);

    for (let c = -1; c <= cols; c++) {
      const x = c * colWidth + offset;

      // Varied block tones: ancient granite, charcoal slate, weathered ash
      const blockTone = 40 + Math.floor(Math.sin(r * 13 + c * 7) * 15 + Math.cos(r * 5) * 8);
      ctx.fillStyle = `rgb(${blockTone + 5}, ${blockTone + 2}, ${blockTone})`;
      ctx.fillRect(x + 3, y + 3, colWidth - 6, rowHeight - 6);

      // Inner stone chiseled bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 4, y + 4, colWidth - 8, 3);
      ctx.fillRect(x + 4, y + 4, 3, rowHeight - 8);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x + 4, y + rowHeight - 7, colWidth - 8, 3);
      ctx.fillRect(x + colWidth - 7, y + 4, 3, rowHeight - 8);
    }

    // Mortar horizontal groove
    ctx.fillStyle = '#141210';
    ctx.fillRect(0, y, 512, 4);
  }

  // Add micro-noise and fissures
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 28;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Occasional ancient moss / dark scorch marks
  ctx.fillStyle = 'rgba(28, 38, 24, 0.25)';
  for (let i = 0; i < 6; i++) {
    const mx = Math.random() * 512;
    const my = Math.random() * 512;
    ctx.beginPath();
    ctx.arc(mx, my, 25 + Math.random() * 30, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createCobblestoneFloorTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep earth bed
  ctx.fillStyle = '#181615';
  ctx.fillRect(0, 0, 512, 512);

  // Irregular flagstone grid
  const gridSize = 64;
  for (let gy = 0; gy < 512; gy += gridSize) {
    for (let gx = 0; gx < 512; gx += gridSize) {
      const stoneTone = 52 + Math.floor((Math.sin(gx * 3 + gy * 7) + 1) * 12);
      ctx.fillStyle = `rgb(${stoneTone + 3}, ${stoneTone + 2}, ${stoneTone})`;

      const pad = 4;
      ctx.beginPath();
      ctx.roundRect(gx + pad, gy + pad, gridSize - pad * 2, gridSize - pad * 2, 6);
      ctx.fill();

      // Stone highlight & shadow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Weathering noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createLavaCanvasTexture(): { texture: THREE.CanvasTexture; update: (time: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  function drawLava(time: number) {
    ctx.fillStyle = '#100301';
    ctx.fillRect(0, 0, 256, 256);

    // Glowing magma flows
    const numStreams = 8;
    for (let i = 0; i < numStreams; i++) {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#ff3b00');
      grad.addColorStop(0.35, '#ff8800');
      grad.addColorStop(0.7, '#ffcc00');
      grad.addColorStop(1, '#ff2200');

      ctx.fillStyle = grad;
      ctx.beginPath();
      const wave = Math.sin(time * 1.5 + i * 1.2) * 30;
      ctx.arc(60 + i * 25 + wave, 128 + Math.cos(time + i) * 40, 45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dark cooled basalt crust plates drifting
    ctx.fillStyle = '#220804';
    for (let c = 0; c < 12; c++) {
      const cx = (c * 73 + time * 8) % 256;
      const cy = (c * 97 + Math.sin(time * 0.5 + c) * 20) % 256;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22, 14, (c * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }

    // Fiery hot core fissures
    ctx.strokeStyle = '#fffb88';
    ctx.lineWidth = 2.5;
    for (let f = 0; f < 5; f++) {
      const fx = (f * 50 + 30);
      const fy = (f * 45 + Math.sin(time * 2 + f) * 15);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + 25, fy + 15);
      ctx.lineTo(fx + 40, fy + 5);
      ctx.stroke();
    }
  }

  drawLava(0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return {
    texture,
    update: (time: number) => {
      drawLava(time);
      texture.needsUpdate = true;
    },
  };
}

export function createSpikeTrapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Iron stone plate border
  ctx.fillStyle = '#262422';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#151413';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  // Perforated spike holes (4x4 grid of apertures)
  const holeStep = 256 / 4;
  for (let hy = 0; hy < 4; hy++) {
    for (let hx = 0; hx < 4; hx++) {
      const cx = hx * holeStep + holeStep / 2;
      const cy = hy * holeStep + holeStep / 2;

      // Dark hole recess
      ctx.fillStyle = '#0a0908';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      // Rusted metal rim
      ctx.strokeStyle = '#4a3b32';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Blood / rust stain around holes
      ctx.fillStyle = 'rgba(120, 20, 10, 0.4)';
      ctx.beginPath();
      ctx.arc(cx + 4, cy + 3, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTorchFlameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 80, 4, 32, 60, 40);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, '#fff176');
  grad.addColorStop(0.5, '#ff9800');
  grad.addColorStop(0.8, '#d84315');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(32, 64, 24, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
