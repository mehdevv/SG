class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.joystick = document.getElementById('joystick');
        this.joystickKnob = document.getElementById('joystick-knob');
        
        // Game settings - using Tiled map dimensions
        this.tileSize = 16; // Tiled map uses 16x16 tiles
        this.mapWidth = 20; // Tiled map width
        this.mapHeight = 40; // Tiled map height
        
        // Camera system - centered on player with smooth following
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            zoom: 2.0, // Moderate zoom for good visibility
            viewWidth: this.canvas.width,
            viewHeight: this.canvas.height,
            followSpeed: 0.1 // Smooth camera following speed (0.1 = 10% per frame)
        };
        
        // Player
        this.player = {
            x: 2.5 * this.tileSize, // More centered horizontally (map width is 20)
            y: 35 * this.tileSize, // More centered vertically (map height is 40)
            width: this.tileSize,
            height: this.tileSize,
            speed: 2.5,
            direction: 'down', // 'up', 'down', 'left', 'right'
            animationFrame: 0,
            animationSpeed: 0.2,
            animationCounter: 0,
            isMoving: false
        };
        
        // Initialize camera to center on player
        this.updateCamera();
        // Set initial camera position to match target for smooth start
        this.camera.x = this.camera.targetX;
        this.camera.y = this.camera.targetY;
        
        // Wall collision data
        this.walls = [];
        
        // Joystick
        this.joystickActive = false;
        this.joystickCenter = { x: 0, y: 0 };
        this.joystickPosition = { x: 0, y: 0 };
        this.maxJoystickDistance = 35;
        
        // Input
        this.keys = {};
        this.mouseDown = false;
        this.touchActive = false;
        
        // Images
        this.tiles = {};
        this.playerSprite = null;
        this.worldMapSprite = null; // World map background image
        this.wallsData = null; // Walls collision data from walls.tmj
        this.loadAssets();
        
        // Load walls collision data
        this.loadWallsData();
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    loadAssets() {
        // Load key assets for the game
        const assetPromises = [];
        
        // Load world map background
        assetPromises.push(this.loadWorldMapSprite());
        
        // Load player sprite sheet
        assetPromises.push(this.loadPlayerSprite());
        
        Promise.all(assetPromises).then(() => {
            console.log('All assets loaded successfully');
        }).catch(error => {
            console.error('Error loading assets:', error);
        });
    }
    
    loadWorldMapSprite() {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.worldMapSprite = img;
                console.log(`World map loaded: ${img.width}x${img.height}`);
                resolve();
            };
            img.onerror = () => {
                console.warn('No world map found');
                this.worldMapSprite = null;
                resolve();
            };
            img.src = 'worldmap.png';
        });
    }
    
    loadWallsData() {
        // Load the walls collision data from walls.tmj
        fetch('walls.tmj')
            .then(response => response.json())
            .then(data => {
                this.wallsData = data;
                console.log('Walls data loaded:', this.wallsData);
                
                // Adjust map dimensions based on walls data
                this.mapWidth = this.wallsData.width;
                this.mapHeight = this.wallsData.height;
                this.tileSize = this.wallsData.tilewidth;
                
                // Load wall collision data from the "walls" layer
                this.loadWallCollisions();
            })
            .catch(error => {
                console.error('Error loading walls data:', error);
                this.wallsData = null;
            });
    }

    loadWallCollisions() {
        // Find the "walls" layer in the walls data
        const wallsLayer = this.wallsData.layers.find(layer => layer.name === 'walls');
        if (wallsLayer && wallsLayer.objects) {
            this.walls = wallsLayer.objects.map(wall => ({
                x: wall.x,
                y: wall.y,
                width: wall.width,
                height: wall.height
            }));
            console.log('Loaded wall collisions:', this.walls);
        } else {
            console.warn('No walls layer found in walls data');
            this.walls = [];
        }
    }
    
    loadPlayerSprite() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.playerSprite = img;
                // Sprite sheet is 153x200 with 4x4 grid
                // Each sprite frame is 38.25x50 pixels
                this.playerSpriteWidth = img.width / 4; // 38.25
                this.playerSpriteHeight = img.height / 4; // 50
                this.playerFramesPerDirection = 4;
                this.playerDirections = 4;
                console.log(`Player sprite loaded: ${img.width}x${img.height}, frame size: ${this.playerSpriteWidth}x${this.playerSpriteHeight}`);
                resolve();
            };
            img.onerror = () => {
                console.warn('Failed to load player sprite sheet');
                // Create fallback
                const canvas = document.createElement('canvas');
                canvas.width = this.tileSize;
                canvas.height = this.tileSize;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(0, 0, this.tileSize, this.tileSize);
                this.playerSprite = canvas;
                this.playerSpriteWidth = this.tileSize;
                this.playerSpriteHeight = this.tileSize;
                this.playerFramesPerDirection = 1;
                this.playerDirections = 1;
                resolve();
            };
            img.src = 'assets/player sprite sheet.png';
        });
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleInputMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleInputEnd(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInputStart(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleInputMove(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleInputEnd(e);
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }
    
    handleInputStart(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.joystickCenter = { x, y };
        this.joystickPosition = { x, y };
        this.joystickActive = true;
        
        this.joystick.style.left = (x - 50) + 'px';
        this.joystick.style.top = (y - 50) + 'px';
        this.joystick.classList.add('active');
        
        this.mouseDown = true;
        this.touchActive = true;
    }
    
    handleInputMove(e) {
        if (!this.joystickActive) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const deltaX = x - this.joystickCenter.x;
        const deltaY = y - this.joystickCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance <= this.maxJoystickDistance) {
            this.joystickPosition = { x, y };
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            this.joystickPosition = {
                x: this.joystickCenter.x + Math.cos(angle) * this.maxJoystickDistance,
                y: this.joystickCenter.y + Math.sin(angle) * this.maxJoystickDistance
            };
        }
        
        this.updateJoystickKnob();
    }
    
    handleInputEnd(e) {
        this.joystickActive = false;
        this.joystick.classList.remove('active');
        this.mouseDown = false;
        this.touchActive = false;
        this.joystickPosition = { x: this.joystickCenter.x, y: this.joystickCenter.y };
        this.updateJoystickKnob();
    }
    
    updateJoystickKnob() {
        const knobX = this.joystickPosition.x - this.joystickCenter.x;
        const knobY = this.joystickPosition.y - this.joystickCenter.y;
        
        this.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }
    
    update() {
        this.handleMovement();
        this.updatePlayerAnimation();
        
        // Update camera to follow player
        this.updateCamera();
    }
    
    updatePlayerAnimation() {
        if (this.player.isMoving) {
            this.player.animationCounter += this.player.animationSpeed;
            if (this.player.animationCounter >= 1) {
                this.player.animationFrame = (this.player.animationFrame + 1) % this.playerFramesPerDirection;
                this.player.animationCounter = 0;
            }
        } else {
            this.player.animationFrame = 0; // Reset to idle frame
        }
    }
    
    handleMovement() {
        let moveX = 0;
        let moveY = 0;
        
        // Joystick movement
        if (this.joystickActive) {
            const deltaX = this.joystickPosition.x - this.joystickCenter.x;
            const deltaY = this.joystickPosition.y - this.joystickCenter.y;
            
            moveX = deltaX / this.maxJoystickDistance;
            moveY = deltaY / this.maxJoystickDistance;
        }
        
        // Keyboard movement (WASD or Arrow keys)
        if (this.keys['w'] || this.keys['ArrowUp']) moveY = -1;
        if (this.keys['s'] || this.keys['ArrowDown']) moveY = 1;
        if (this.keys['a'] || this.keys['ArrowLeft']) moveX = -1;
        if (this.keys['d'] || this.keys['ArrowRight']) moveX = 1;
        
        // Update player direction and movement state
        this.player.isMoving = moveX !== 0 || moveY !== 0;
        
        if (this.player.isMoving) {
            // Determine direction based on movement
            if (Math.abs(moveX) > Math.abs(moveY)) {
                this.player.direction = moveX > 0 ? 'right' : 'left';
            } else {
                this.player.direction = moveY > 0 ? 'down' : 'up';
            }
        }
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }
        
        // Apply movement with collision prevention
        const deltaX = moveX * this.player.speed;
        const deltaY = moveY * this.player.speed;
        
        // Test horizontal movement first
        if (deltaX !== 0) {
            const newX = this.player.x + deltaX;
            if (newX >= 0 && newX <= (this.mapWidth - 1) * this.tileSize && this.canMoveTo(newX, this.player.y)) {
                this.player.x = newX;
            }
        }
        
        // Test vertical movement second
        if (deltaY !== 0) {
            const newY = this.player.y + deltaY;
            if (newY >= 0 && newY <= (this.mapHeight - 1) * this.tileSize && this.canMoveTo(this.player.x, newY)) {
                this.player.y = newY;
            }
        }
        
        // Update camera to follow player
        this.updateCamera();
    }
    
    // Helper function to check if player can move to a position without collision
    canMoveTo(x, y) {
        const playerSize = this.playerSpriteWidth * 0.13; // Match the display size (3x smaller)
        const playerLeft = x;
        const playerRight = x + playerSize;
        const playerTop = y;
        const playerBottom = y + playerSize;
        
        // Check collision with all walls
        for (let wall of this.walls) {
            const wallLeft = wall.x;
            const wallRight = wall.x + wall.width;
            const wallTop = wall.y;
            const wallBottom = wall.y + wall.height;
            
            // Check if player would collide with this wall
            if (playerRight > wallLeft && 
                playerLeft < wallRight && 
                playerBottom > wallTop && 
                playerTop < wallBottom) {
                return false; // Collision detected, movement not allowed
            }
        }
        
        return true; // No collision, movement allowed
    }
    
    updateCamera() {
        // Calculate target camera position (centered on player)
        const viewWidth = this.camera.viewWidth / this.camera.zoom;
        const viewHeight = this.camera.viewHeight / this.camera.zoom;
        
        // Set target position
        this.camera.targetX = this.player.x - viewWidth / 2;
        this.camera.targetY = this.player.y - viewHeight / 2;
        
        // Keep target camera within map bounds (accounting for zoom)
        const mapPixelWidth = this.mapWidth * this.tileSize;
        const mapPixelHeight = this.mapHeight * this.tileSize;
        
        // Constrain target camera to map boundaries
        this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, mapPixelWidth - viewWidth));
        this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, mapPixelHeight - viewHeight));
        
        // Smoothly interpolate camera position towards target
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.followSpeed;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.followSpeed;
    }
    
    worldToScreen(worldX, worldY) {
        // Convert world coordinates to screen coordinates (with zoom)
        return {
            x: (worldX - this.camera.x) * this.camera.zoom,
            y: (worldY - this.camera.y) * this.camera.zoom
        };
    }
    
    screenToWorld(screenX, screenY) {
        // Convert screen coordinates to world coordinates
        return {
            x: screenX / this.camera.zoom + this.camera.x,
            y: screenY / this.camera.zoom + this.camera.y
        };
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for camera transformations
        this.ctx.save();
        
        // Apply camera zoom and translation
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Create array of all renderable objects for depth sorting
        const renderObjects = [];
        
        // Draw world map background
        if (this.worldMapSprite) {
            this.ctx.drawImage(
                this.worldMapSprite,
                0, 0, this.worldMapSprite.width, this.worldMapSprite.height,
                0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize
            );
        } else {
            // Fallback: draw a simple green background
            this.ctx.fillStyle = '#4a7c59';
            this.ctx.fillRect(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);
        }
        
        
        // Add player
        renderObjects.push({
            type: 'player',
            x: this.player.x,
            y: this.player.y,
            width: this.playerSpriteWidth * 0.13, // 3x smaller (0.4 / 3 ≈ 0.13)
            height: this.playerSpriteHeight * 0.13,
            depth: this.player.y + this.playerSpriteHeight * 0.13
        });
        
        // Sort by depth (Y position)
        renderObjects.sort((a, b) => a.depth - b.depth);
        
        // Render all objects in depth order
        renderObjects.forEach(obj => {
            if (obj.type === 'tile') {
                if (obj.sourceX !== undefined && obj.sourceY !== undefined) {
                    // Tiled map tile with source coordinates
                    this.ctx.drawImage(
                        obj.image, 
                        obj.sourceX, obj.sourceY, obj.width, obj.height, // Source
                        obj.x, obj.y, obj.width, obj.height // Destination
                    );
                } else {
                    // Regular tile
                    this.ctx.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height);
                }
            } else if (obj.type === 'player') {
                this.drawPlayerAt(obj.x, obj.y);
            }
        });
        
        // Restore context after camera transformations
        this.ctx.restore();
    }
    
    drawPlayerAt(x, y) {
        if (!this.playerSprite) return;
        
        // Get direction index based on sprite sheet layout:
        // 0=down, 1=right, 2=left, 3=up
        const directionMap = { 'down': 0, 'right': 1, 'left': 2, 'up': 3 };
        const directionIndex = directionMap[this.player.direction] || 0;
        
        // Calculate source position in sprite sheet
        const sourceX = this.player.animationFrame * this.playerSpriteWidth;
        const sourceY = directionIndex * this.playerSpriteHeight;
        
        // Draw the player sprite 3x smaller
        const playerDisplaySize = this.playerSpriteWidth * 0.13; // 3x smaller (0.4 / 3 ≈ 0.13)
        const playerDisplayHeight = this.playerSpriteHeight * 0.13;
        
        // Center the player sprite on the tile
        const offsetX = (this.tileSize - playerDisplaySize) / 2;
        const offsetY = (this.tileSize - playerDisplayHeight) / 2;
        
        this.ctx.drawImage(
            this.playerSprite,
            sourceX, sourceY, this.playerSpriteWidth, this.playerSpriteHeight,
            x + offsetX, y + offsetY, playerDisplaySize, playerDisplayHeight
        );
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});