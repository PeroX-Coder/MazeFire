import * as THREE from 'three';
import { GeneratedMaze, TILE_WALL, isSpikeLethal } from './maze.ts';
import { sound } from './audio.ts';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
}

export interface PlayerPhysics {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number; // horizontal angle in radians
  pitch: number; // vertical angle in radians
  isGrounded: boolean;
  eyeHeight: number;
  bobCycle: number;
  bobAmount: number;
  isDead: boolean;
}

const PLAYER_RADIUS = 0.58;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 6.6;
const GRAVITY = 19.0;
const JUMP_FORCE = 6.2;

export class PlayerController {
  public physics: PlayerPhysics;
  private input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
  };
  private isPointerLocked: boolean = false;
  private mouseSensitivity: number = 0.0020;
  private targetYaw: number = 0;
  private targetPitch: number = 0;
  private domElement: HTMLElement | null = null;
  private onLockChangeCallback?: (locked: boolean) => void;

  constructor(startX: number, startZ: number, startYaw: number = 0) {
    this.targetYaw = startYaw;
    this.targetPitch = 0;
    this.physics = {
      position: new THREE.Vector3(startX, 0, startZ),
      velocity: new THREE.Vector3(),
      yaw: startYaw,
      pitch: 0,
      isGrounded: true,
      eyeHeight: 1.68,
      bobCycle: 0,
      bobAmount: 0,
      isDead: false,
    };
  }

  public resetPosition(x: number, z: number, yaw: number = 0) {
    this.targetYaw = yaw;
    this.targetPitch = 0;
    this.physics.position.set(x, 0, z);
    this.physics.velocity.set(0, 0, 0);
    this.physics.yaw = yaw;
    this.physics.pitch = 0;
    this.physics.isGrounded = true;
    this.physics.bobCycle = 0;
    this.physics.bobAmount = 0;
    this.physics.isDead = false;
  }

  public attach(element: HTMLElement, onLockChange?: (locked: boolean) => void) {
    this.domElement = element;
    this.onLockChangeCallback = onLockChange;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    element.addEventListener('mousemove', this.handleMouseMove);
  }

  public detach() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    if (this.domElement) {
      this.domElement.removeEventListener('mousemove', this.handleMouseMove);
    }
  }

  public requestPointerLock() {
    if (this.domElement) {
      try {
        const promise = this.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {});
        }
      } catch {}
    }
  }

  public exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public getIsLocked(): boolean {
    return this.isPointerLocked;
  }

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    if (this.onLockChangeCallback) {
      this.onLockChangeCallback(this.isPointerLocked);
    }
    if (!this.isPointerLocked) {
      this.clearInputs();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.sprint = true;
        break;
      case 'Space':
        if (this.physics.isGrounded && !this.physics.isDead) {
          this.physics.velocity.y = JUMP_FORCE;
          this.physics.isGrounded = false;
        }
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.sprint = false;
        break;
    }
  };

  private handleBlur = () => {
    this.clearInputs();
  };

  public clearInputs() {
    this.input.forward = false;
    this.input.backward = false;
    this.input.left = false;
    this.input.right = false;
    this.input.sprint = false;
    this.input.jump = false;
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked || this.physics.isDead) return;

    const dx = e.movementX || 0;
    const dy = e.movementY || 0;

    // Accumulate into target angles for smooth butter interpolation
    this.targetYaw -= dx * this.mouseSensitivity;
    this.targetPitch -= dy * this.mouseSensitivity;

    // Clamp vertical look angle (-85 deg to +85 deg)
    const maxPitch = (Math.PI / 2) * 0.94;
    this.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, this.targetPitch));
  };

  /**
   * Updates player physics with buttery smooth damping and Quake-style wall sliding.
   */
  public update(dt: number, maze: GeneratedMaze, currentTime: number): { hazard?: 'lava' | 'spikes'; exitReached: boolean } {
    if (this.physics.isDead) {
      return { exitReached: false };
    }

    // 1. Smooth butter mouse look interpolation
    this.physics.yaw = THREE.MathUtils.damp(this.physics.yaw, this.targetYaw, 28, dt);
    this.physics.pitch = THREE.MathUtils.damp(this.physics.pitch, this.targetPitch, 28, dt);

    const speed = this.input.sprint ? SPRINT_SPEED : WALK_SPEED;

    // 2. Calculate movement intent
    let moveX = 0;
    let moveZ = 0;

    if (this.input.forward) moveZ -= 1;
    if (this.input.backward) moveZ += 1;
    if (this.input.left) moveX -= 1;
    if (this.input.right) moveX += 1;

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 0) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    // Rotate input direction into world space based on current yaw
    const sinYaw = Math.sin(this.physics.yaw);
    const cosYaw = Math.cos(this.physics.yaw);
    const worldMoveX = moveX * cosYaw + moveZ * sinYaw;
    const worldMoveZ = -moveX * sinYaw + moveZ * cosYaw;

    const targetVx = worldMoveX * speed;
    const targetVz = worldMoveZ * speed;

    // 3. Smooth butter movement acceleration and deceleration
    const moveDamping = this.physics.isGrounded ? 16 : 8;
    this.physics.velocity.x = THREE.MathUtils.damp(this.physics.velocity.x, targetVx, moveDamping, dt);
    this.physics.velocity.z = THREE.MathUtils.damp(this.physics.velocity.z, targetVz, moveDamping, dt);

    // Gravity
    if (!this.physics.isGrounded) {
      this.physics.velocity.y -= GRAVITY * dt;
    }

    // Step positions
    const newX = this.physics.position.x + this.physics.velocity.x * dt;
    const newZ = this.physics.position.z + this.physics.velocity.z * dt;
    const newY = this.physics.position.y + this.physics.velocity.y * dt;

    if (newY <= 0) {
      this.physics.position.y = 0;
      this.physics.velocity.y = 0;
      this.physics.isGrounded = true;
    } else {
      this.physics.position.y = newY;
    }

    // 4. Smooth wall collision resolution with velocity deflection (sliding)
    const resolvedPos = this.resolveWallCollision(newX, newZ, maze);
    const actualDx = resolvedPos.x - this.physics.position.x;
    const actualDz = resolvedPos.z - this.physics.position.z;
    this.physics.position.x = resolvedPos.x;
    this.physics.position.z = resolvedPos.z;

    // 5. Smooth camera head bobbing
    const planarSpeed = Math.hypot(this.physics.velocity.x, this.physics.velocity.z);
    const targetBobAmount = (this.physics.isGrounded && planarSpeed > 0.15) ? (this.input.sprint ? 0.05 : 0.035) : 0;
    this.physics.bobAmount = THREE.MathUtils.damp(this.physics.bobAmount, targetBobAmount, 10, dt);

    if (planarSpeed > 0.15 && this.physics.isGrounded) {
      this.physics.bobCycle += planarSpeed * dt * (this.input.sprint ? 2.8 : 2.2);
      sound.playFootstep(this.input.sprint);
    }

    // 6. Hazard detection
    if (this.physics.position.y < 0.45) {
      // Lava
      for (const lava of maze.lava) {
        const dx = Math.abs(this.physics.position.x - lava.worldX);
        const dz = Math.abs(this.physics.position.z - lava.worldZ);
        if (dx < maze.tileSize * 0.42 && dz < maze.tileSize * 0.42) {
          this.physics.isDead = true;
          return { hazard: 'lava', exitReached: false };
        }
      }

      // Spikes
      for (const spike of maze.spikes) {
        const dx = Math.abs(this.physics.position.x - spike.worldX);
        const dz = Math.abs(this.physics.position.z - spike.worldZ);
        if (dx < maze.tileSize * 0.40 && dz < maze.tileSize * 0.40) {
          if (isSpikeLethal(spike, currentTime)) {
            this.physics.isDead = true;
            return { hazard: 'spikes', exitReached: false };
          }
        }
      }
    }

    // 7. Exit reached
    const exitDist = Math.hypot(this.physics.position.x - maze.exitPos.x, this.physics.position.z - maze.exitPos.z);
    if (exitDist < maze.tileSize * 0.5) {
      return { exitReached: true };
    }

    return { exitReached: false };
  }

  /**
   * Wall collision resolution with velocity deflection so player glides along walls
   */
  private resolveWallCollision(targetX: number, targetZ: number, maze: GeneratedMaze): { x: number; z: number } {
    let px = targetX;
    let pz = targetZ;
    const halfW = (maze.width * maze.tileSize) / 2;
    const halfH = (maze.height * maze.tileSize) / 2;

    const currentGridX = Math.floor((px + halfW) / maze.tileSize);
    const currentGridZ = Math.floor((pz + halfH) / maze.tileSize);

    for (let gz = currentGridZ - 1; gz <= currentGridZ + 1; gz++) {
      for (let gx = currentGridX - 1; gx <= currentGridX + 1; gx++) {
        if (gz < 0 || gz >= maze.height || gx < 0 || gx >= maze.width) continue;
        if (maze.grid[gz][gx] === TILE_WALL) {
          const minX = gx * maze.tileSize - halfW;
          const maxX = minX + maze.tileSize;
          const minZ = gz * maze.tileSize - halfH;
          const maxZ = minZ + maze.tileSize;

          const closestX = Math.max(minX, Math.min(px, maxX));
          const closestZ = Math.max(minZ, Math.min(pz, maxZ));

          const distX = px - closestX;
          const distZ = pz - closestZ;
          const distSq = distX * distX + distZ * distZ;

          if (distSq < PLAYER_RADIUS * PLAYER_RADIUS && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const normalX = distX / dist;
            const normalZ = distZ / dist;
            const pushDist = PLAYER_RADIUS - dist;

            px += normalX * pushDist;
            pz += normalZ * pushDist;

            // Deflect velocity along wall tangent so player slides smoothly
            const dot = this.physics.velocity.x * normalX + this.physics.velocity.z * normalZ;
            if (dot < 0) {
              this.physics.velocity.x -= dot * normalX;
              this.physics.velocity.z -= dot * normalZ;
            }
          }
        }
      }
    }

    return { x: px, z: pz };
  }

  /**
   * Applies smoothly interpolated camera orientation and head bob
   */
  public applyToCamera(camera: THREE.PerspectiveCamera, cameraShake: number = 0) {
    const bobOffset = Math.sin(this.physics.bobCycle) * this.physics.bobAmount;
    camera.position.set(
      this.physics.position.x,
      this.physics.position.y + this.physics.eyeHeight + bobOffset,
      this.physics.position.z,
    );

    const euler = new THREE.Euler(
      this.physics.pitch + (Math.random() - 0.5) * cameraShake,
      this.physics.yaw + (Math.random() - 0.5) * cameraShake,
      (Math.random() - 0.5) * cameraShake * 0.4,
      'YXZ',
    );
    camera.quaternion.setFromEuler(euler);
  }
}
