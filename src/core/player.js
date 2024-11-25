// src/core/player.js
import * as THREE from 'three';

export class Player {
    constructor(game) {
        this.game = game;
        
        // Create player geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1, 0);
        this.game.scene.add(this.mesh);
        
        // Physics properties - adjusted for lower max height
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravity = -35; // Increased gravity
        this.baseJumpForce = 10; // Reduced base jump force
        this.maxJumpForce = 14; // Reduced maximum jump force
        this.isGrounded = true;
        
        // Jump control properties
        this.isJumping = false;
        this.jumpStartTime = 0;
        this.jumpHeldTime = 0;
        this.maxJumpHoldTime = 0.2; // Reduced max hold time
        this.minJumpVelocity = 7; // Adjusted minimum jump
        
        // Debug properties
        this.debugText = document.createElement('div');
        this.debugText.style.position = 'fixed';
        this.debugText.style.bottom = '10px';
        this.debugText.style.left = '10px';
        this.debugText.style.color = 'white';
        this.debugText.style.fontFamily = 'monospace';
        document.body.appendChild(this.debugText);
        
        // Rotation properties
        this.targetRotation = 0;
        this.currentRotation = 0;
        this.rotationSpeed = Math.PI * 8;
        
        // Input tracking
        this.isSpaceDown = false;
        this.isMouseDown = false;
        
        // Bind input handlers
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Create player with distinct visual and collision geometries
        const visualGeometry = new THREE.BoxGeometry(1, 1, 1);
        const collisionGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);

        // Create visual mesh
        this.mesh = new THREE.Mesh(visualGeometry, material);
        
        // Create collision mesh (invisible)
        this.collisionMesh = new THREE.Mesh(collisionGeometry, material.clone());
        this.collisionMesh.visible = false;
        
        // Create a group to hold both meshes
        this.group = new THREE.Group();
        this.group.add(this.mesh);
        this.group.add(this.collisionMesh);
        
        // Set initial position
        this.group.position.set(0, 1, 0);
        
        game.scene.add(this.group);
    }
    
    update(deltaTime) {
        // Handle variable jump height
        if (this.isJumping && (this.isSpaceDown || this.isMouseDown)) {
            this.jumpHeldTime += deltaTime;
            
            // Apply additional jump force while held
            const jumpProgress = Math.min(this.jumpHeldTime / this.maxJumpHoldTime, 1);
            const currentJumpForce = this.baseJumpForce + 
                (this.maxJumpForce - this.baseJumpForce) * jumpProgress;
            
            // Apply continuous upward force while holding
            if (this.jumpHeldTime <= this.maxJumpHoldTime) {
                this.velocity.y = Math.max(this.velocity.y, currentJumpForce);
            }
            
            this.collisionMesh.position.copy(this.mesh.position);
            this.collisionMesh.rotation.copy(this.mesh.rotation);
        }
        
        // Apply gravity
        if (!this.isGrounded) {
            // Faster fall when jump is released
            const fallMultiplier = (!this.isJumping || (!this.isSpaceDown && !this.isMouseDown)) ? 1.5 : 1;
            this.velocity.y += this.gravity * fallMultiplier * deltaTime;
            
            // Limit maximum fall speed
            this.velocity.y = Math.max(this.velocity.y, -25);
        }
        
        // Update position
        this.mesh.position.x += this.game.speed * deltaTime;
        this.mesh.position.y += this.velocity.y * deltaTime;
        
        // Ground collision
        if (this.mesh.position.y <= 1) {
            this.mesh.position.y = 1;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.isJumping = false;
            this.jumpHeldTime = 0;
        }
        
        // Handle rotation
        if (this.currentRotation !== this.targetRotation) {
            const rotationThisFrame = this.rotationSpeed * deltaTime;
            const remainingRotation = this.targetRotation - this.currentRotation;
            
            if (Math.abs(remainingRotation) <= rotationThisFrame) {
                this.currentRotation = this.targetRotation;
                this.mesh.rotation.z = this.targetRotation;
            } else {
                this.currentRotation += Math.sign(remainingRotation) * rotationThisFrame;
                this.mesh.rotation.z = this.currentRotation;
            }
        }
        
        // Update debug text
        this.debugText.textContent = `
            Height: ${this.mesh.position.y.toFixed(2)}
            Jump Held: ${this.jumpHeldTime.toFixed(2)}s
            Velocity: ${this.velocity.y.toFixed(2)}
        `;
    }
    
    jump() {
        if (this.isGrounded) {
            this.isGrounded = false;
            this.isJumping = true;
            this.jumpHeldTime = 0;
            this.jumpStartTime = performance.now();
            
            // Initial jump impulse
            this.velocity.y = this.minJumpVelocity;
            
            // Update rotation target (quarter turn)
            this.targetRotation = this.targetRotation - Math.PI / 2;
        }
    }
    
    onKeyDown(event) {
        if (event.code === 'Space' && !this.isSpaceDown) {
            this.isSpaceDown = true;
            this.jump();
        }
    }
    
    onKeyUp(event) {
        if (event.code === 'Space') {
            this.isSpaceDown = false;
            this.isJumping = false;
        }
    }
    
    onMouseDown(event) {
        if (!this.isMouseDown) {
            this.isMouseDown = true;
            this.jump();
        }
    }
    
    onMouseUp() {
        this.isMouseDown = false;
        this.isJumping = false;
    }
}