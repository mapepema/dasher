// src/core/game.js
import * as THREE from 'three';
import { AudioManager } from './audio.js';
import { LevelGenerator } from './level.js';
import { Player } from './player.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.entities = [];

        this.cameraSettings = {
            position: new THREE.Vector3(-8, 10, 15), // Moved back and up
            lookAheadDistance: 15, // Distance to look ahead
            height: 10 // Camera height
        };
        
        // Set up camera
        this.camera.position.copy(this.cameraSettings.position);
        this.camera.lookAt(5, 0, 0);

        // Initialize audiomanager without starting it
        this.audioManager = new AudioManager();
        this.audioLatency = 0.1; // 100ms default latency compensation
        this.gameSpeed = 10;     // Base game speed in units per second

        // Score system
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.distance = 0;
        this.spawnDistance = this.gameSpeed * (this.audioLatency + 1.5); // 1.5s look-ahead
        
        // Set up renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        document.body.appendChild(this.renderer.domElement);
    
        
        // Initialize game state
        this.score = 0;
        this.speed = 10; // Units per second
        
        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this.handleBeat = this.handleBeat.bind(this);
        
        // Set up event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Initialize components
        this.player = new Player(this);
        this.audioManager = new AudioManager();
        this.levelGenerator = new LevelGenerator(this);
        
        this.entities.push(this.player);
        
        // Initialize scene
        this.initScene();

        // Score update interval
        setInterval(() => {
            if (this.isRunning) {
                // Increase score based on distance and obstacles passed
                this.score = Math.floor(this.player.mesh.position.x * 10);

                // Update high score
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('highScore', this.highScore);
                }

                // Dispatch score update event
                window.dispatchEvent(new CustomEvent('scoreupdate', {
                    detail: { score: this.score, highScore: this.highScore }
                }));
            }
        }, 100); // Update every 100ms
    }


    async start() {
        if (!this.isRunning) {
            try {
                console.log('Starting game...');
                this.isRunning = true;
                this.clock.start();
                
                // Pre-calculate beat positions if we have beats analyzed
                if (this.audioManager.beatMap && this.audioManager.beatMap.length > 0) {
                    console.log('Preplanning obstacles for', this.audioManager.beatMap.length, 'beats');
                    this.levelGenerator.preplanObstacles(this.audioManager.beatMap);
                } else {
                    console.warn('No beat map available for obstacle planning');
                }
                
                // Start audio with beat callback
                await this.audioManager.start(this.handleBeat.bind(this));
                
                this.gameLoop();
                return true;
            } catch (error) {
                console.error('Failed to start game:', error);
                this.isRunning = false;
                throw error;
            }
        }
        return false;
    }
    
    handleBeat(intensity, time) {
        if (this.levelGenerator) {
            const currentTime = this.audioManager.audioElement.currentTime;
            const playerPos = this.player.mesh.position.x;
            const playerFuturePos = playerPos + (this.speed * (time - currentTime));
            this.levelGenerator.generateObstacleOnBeat(intensity, playerFuturePos);
        }
    }
    
    stop() {
        this.isRunning = false;
        this.clock.stop();
    }
    
    update(deltaTime) {
        // Update all game entities
        this.entities.forEach(entity => entity.update(deltaTime));
        
        // Update level generation
        this.levelGenerator.update();
        
        // Check collisions
        this.checkCollisions();

        // Update camera position with smoother following
        const targetX = this.player.mesh.position.x;
        const cameraTargetX = targetX - this.cameraSettings.position.x;
        const lookAtTargetX = targetX + this.cameraSettings.lookAheadDistance;
        
        // Smooth camera movement
        this.camera.position.x = cameraTargetX;
        this.camera.position.y = this.cameraSettings.height;
        this.camera.lookAt(lookAtTargetX, 0, 0);
    }

    initScene() {
        // Add basic lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increased ambient light
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // Add ground plane with grid for better distance perception
        const groundGeometry = new THREE.PlaneGeometry(1000, 10);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x444444,
            emissive: 0x111111,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Add grid helper for better distance perception
        const grid = new THREE.GridHelper(1000, 100, 0x222222, 0x333333);
        grid.position.y = 0.1;
        this.scene.add(grid);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const deltaTime = this.clock.getDelta();
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(this.gameLoop);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    reset() {
        // Reset player position and state
        this.player.mesh.position.set(0, 1, 0);
        this.player.velocity.set(0, 0, 0);
        this.player.isGrounded = true;
        this.player.isJumping = false;
        this.player.jumpHeldTime = 0;
        this.player.currentRotation = 0;
        this.player.targetRotation = 0;
        this.player.mesh.rotation.z = 0;
        
        // Reset game speed
        this.speed = 10;
        
        // Reset score
        this.score = 0;
        
        // Clear all obstacles
        this.levelGenerator.obstacleQueue.forEach(obstacle => {
            this.scene.remove(obstacle);
        });
        this.levelGenerator.obstacleQueue = [];
        this.levelGenerator.lastObstaclePosition = 0;
        
        // Reset camera position
        this.camera.position.set(-5, 8, 12);
        this.camera.lookAt(5, 0, 0);
        
        // Reset clock
        this.clock.start();
    }

    createObstacleHitbox(obstacle) {
        // Get obstacle's world position and scale
        const position = obstacle.position;
        const geometry = obstacle.geometry;
        geometry.computeBoundingBox();

        // Create a slightly smaller hitbox than the visual model
        const margin = 0.1; // Collision margin
        const box = geometry.boundingBox.clone();

        // Scale and position the box
        box.min.multiply(obstacle.scale).add(position);
        box.max.multiply(obstacle.scale).add(position);

        // Apply margin
        box.min.add(new THREE.Vector3(margin, margin, margin));
        box.max.sub(new THREE.Vector3(margin, margin, margin));

        return box;
    }

    handleCollision() {
        console.log('Collision detected!');
        this.stop();
        // Dispatch game over event
        window.dispatchEvent(new CustomEvent('gameover'));
    }

    // Add debug mode toggle
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
    }

    checkCollisions() {
        if (!this.player || !this.levelGenerator) return;

        // Create player hitbox
        const playerPosition = this.player.mesh.position;
        const playerSize = {
            x: 0.8,
            y: 0.8,
            z: 0.8
        };

        const playerBox = new THREE.Box3(
            new THREE.Vector3(
                playerPosition.x - playerSize.x/2,
                playerPosition.y - playerSize.y/2,
                playerPosition.z - playerSize.z/2
            ),
            new THREE.Vector3(
                playerPosition.x + playerSize.x/2,
                playerPosition.y + playerSize.y/2,
                playerPosition.z + playerSize.z/2
            )
        );

        // Check each obstacle
        let collision = false;
        for (const obstacle of this.levelGenerator.obstacleQueue) {
            // Get the obstacle's world position
            const obstaclePosition = obstacle.position;
            const obstacleSize = {
                x: 1.4, // Base size * 1.4 as defined in createPyramid
                y: obstacle.scale.y * 2, // Height
                z: 1.4  // Base size * 1.4
            };

            // Create obstacle hitbox
            const obstacleBox = new THREE.Box3(
                new THREE.Vector3(
                    obstaclePosition.x - obstacleSize.x/2,
                    obstaclePosition.y - obstacleSize.y/2,
                    obstaclePosition.z - obstacleSize.z/2
                ),
                new THREE.Vector3(
                    obstaclePosition.x + obstacleSize.x/2,
                    obstaclePosition.y + obstacleSize.y/2,
                    obstaclePosition.z + obstacleSize.z/2
                )
            );

            if (this.debugMode) {
                this.visualizeHitbox(playerBox, 0x00ff00);
                this.visualizeHitbox(obstacleBox, 0xff0000);
            }

            if (playerBox.intersectsBox(obstacleBox)) {
                collision = true;
                break;
            }
        }

        if (collision) {
            this.handleCollision();
        }
    }

    visualizeHitbox(box, color) {
        // Remove previous hitbox visualizations
        this.scene.children = this.scene.children.filter(
            child => !child.isHitboxHelper
        );

        const geometry = new THREE.BoxGeometry(
            box.max.x - box.min.x,
            box.max.y - box.min.y,
            box.max.z - box.min.z
        );
        const material = new THREE.LineBasicMaterial({ color: color });
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            material
        );

        wireframe.position.set(
            (box.min.x + box.max.x) / 2,
            (box.min.y + box.max.y) / 2,
            (box.min.z + box.max.z) / 2
        );

        wireframe.isHitboxHelper = true;
        this.scene.add(wireframe);
    }

    // Add this method to initialize debug mode
    initDebug() {
        this.debugMode = false;
        window.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') {
                this.debugMode = !this.debugMode;
                console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
            }
        });
    }
}