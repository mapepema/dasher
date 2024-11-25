// src/core/level.js
import * as THREE from 'three';

export class LevelGenerator {
    constructor(game) {
        this.game = game;
        this.obstacleQueue = [];
        this.plannedObstacles = new Map();
        this.lastObstaclePosition = 0;
        this.minObstacleDistance = 5;
        this.maxObstacleDistance = 15;
        
        // Adjusted visualization settings for obstacles
        this.obstacleSettings = {
            baseSize: 0.8,    // Reduced base size
            maxSize: 2,       // Reduced max size
            baseHeight: 1.5,  // Reduced base height
            maxHeight: 3,     // Reduced max height
            spawnDistance: 35, // Distance ahead to spawn obstacles
            despawnDistance: -20, // Distance behind player to remove obstacles
            baseColor: new THREE.Color(0x00ff00),
            peakColor: new THREE.Color(0xff0000)
        };
    }

    preplanObstacles(beatMap) {
        console.log('Preplanning obstacles for beats:', beatMap);
        this.plannedObstacles.clear();
        
        // Filter out beats that are too close together
        let lastBeatTime = -Infinity;
        const minBeatInterval = 0.2; // Minimum time between beats in seconds
        
        beatMap.forEach(beat => {
            if (beat.time - lastBeatTime >= minBeatInterval) {
                // Calculate initial position based on beat timing and game speed
                const spawnTime = beat.time;
                const spawnPosition = this.obstacleSettings.spawnDistance + 
                                    (this.game.speed * spawnTime);
                
                // Store the planned obstacle
                this.plannedObstacles.set(beat.time, {
                    position: spawnPosition,
                    intensity: beat.intensity,
                    spawned: false
                });
                
                lastBeatTime = beat.time;
            }
        });
        
        console.log(`Planned ${this.plannedObstacles.size} obstacles`);
        return this.plannedObstacles;
    }

    generateObstacleOnBeat(intensity, playerFuturePos) {
        // Calculate spawn position
        const spawnPosition = playerFuturePos + this.obstacleSettings.spawnDistance;
        
        // Check minimum distance from last obstacle
        if (Math.abs(spawnPosition - this.lastObstaclePosition) >= this.minObstacleDistance) {
            this.spawnObstacle(spawnPosition, intensity);
        }
    }

    spawnObstacle(position, intensity) {
        const obstacle = this.createPyramid(position, intensity);
        this.game.scene.add(obstacle);
        this.obstacleQueue.push(obstacle);
        this.lastObstaclePosition = position;
    }

    update() {
        const currentTime = this.game.audioManager.audioElement.currentTime;
        const playerX = this.game.player.mesh.position.x;
        
        // Update planned obstacles
        this.plannedObstacles.forEach((obstacle, beatTime) => {
            if (!obstacle.spawned) {
                const timeUntilBeat = beatTime - currentTime;
                if (timeUntilBeat > 0 && timeUntilBeat <= 2.5) { // 2.5s look-ahead window
                    const spawnPosition = playerX + this.obstacleSettings.spawnDistance;
                    if (Math.abs(spawnPosition - this.lastObstaclePosition) >= this.minObstacleDistance) {
                        this.spawnObstacle(spawnPosition, obstacle.intensity);
                        obstacle.spawned = true;
                    }
                }
            }
        });

        // Clean up passed obstacles
        this.obstacleQueue = this.obstacleQueue.filter(obstacle => {
            if (obstacle.position.x < playerX + this.obstacleSettings.despawnDistance) {
                this.game.scene.remove(obstacle);
                return false;
            }
            return true;
        });
    }

    createPyramid(x, intensity) {
        const settings = this.obstacleSettings;
        
        // Scale size and height based on intensity
        const size = settings.baseSize + (settings.maxSize - settings.baseSize) * intensity;
        const height = settings.baseHeight + (settings.maxHeight - settings.baseHeight) * intensity;
        
        // Use BoxGeometry for more reliable collisions while keeping pyramid visuals
        const visualGeometry = new THREE.ConeGeometry(size, height, 4);
        const collisionGeometry = new THREE.BoxGeometry(size * 1.4, height, size * 1.4);
        
        // Create gradient color based on intensity
        const color = new THREE.Color().lerpColors(
            settings.baseColor,
            settings.peakColor,
            intensity
        );
        
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color.clone().multiplyScalar(0.5),
            emissiveIntensity: 0.5,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });
        
        // Create visual mesh
        const visualMesh = new THREE.Mesh(visualGeometry, material);
        
        // Create collision mesh (invisible)
        const collisionMesh = new THREE.Mesh(collisionGeometry, material.clone());
        collisionMesh.visible = false;
        
        // Create a group to hold both meshes
        const obstacle = new THREE.Group();
        obstacle.add(visualMesh);
        obstacle.add(collisionMesh);
        
        // Position the group
        obstacle.position.set(x, height / 2, 0);
        visualMesh.rotation.y = Math.PI / 4;
        
        // Store collision mesh reference
        obstacle.collisionMesh = collisionMesh;
        
        return obstacle;
    }

    addBeatEffect(obstacle, intensity) {
        const originalScale = obstacle.scale.clone();
        const pulseScale = originalScale.multiplyScalar(1.1);
        const duration = 0.2;
        
        const startPulse = () => {
            obstacle.scale.copy(pulseScale);
            setTimeout(() => {
                obstacle.scale.copy(originalScale);
            }, duration * 1000);
        };
        
        startPulse();
    }

    reset() {
        this.obstacleQueue.forEach(obstacle => {
            this.game.scene.remove(obstacle);
        });
        this.obstacleQueue = [];
        this.plannedObstacles.clear();
        this.lastObstaclePosition = 0;
    }
}