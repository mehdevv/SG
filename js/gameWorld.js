/**
 * Game World Module
 * Combines map rendering, player management, and camera system
 */
class GameWorld {
    constructor() {
        // Player properties
        this.player = {
            x: 200,
            y: 200,
            speed: 2,
            direction: 'down',
            isMoving: false,
            animationFrame: 0,
            animationSpeed: 0.2,
            frameCount: 4,
            currentFrame: 0,
            spriteWidth: 32,
            spriteHeight: 32,
            displayScale: 0.5,
            keys: {},
            mouseDown: false,
            touchActive: false,
            joystickActive: false,
            joystickCenter: { x: 0, y: 0 },
            joystickPosition: { x: 0, y: 0 },
            maxJoystickDistance: 50,
            movementCounter: 0,
            pointsThreshold: 100
        };

        // Camera properties
        this.camera = {
            x: 200,
            y: 200,
            targetX: 200,
            targetY: 200,
            followSpeed: 0.3,
            zoom: 1,
            viewportWidth: 0,
            viewportHeight: 0,
            bounds: null
        };

        // Map properties
        this.map = {
            width: 0,
            height: 0,
            tileSize: 32,
            walls: []
        };

        // Assets
        this.assets = {
            worldMap: null,
            playerSprite: null
        };
    }

    /**
     * Initialize the game world
     */
    initialize(canvasWidth, canvasHeight) {
        this.camera.viewportWidth = canvasWidth;
        this.camera.viewportHeight = canvasHeight;
        this.camera.x = this.player.x;
        this.camera.y = this.player.y;
        this.camera.targetX = this.player.x;
        this.camera.targetY = this.player.y;
        
        console.log('GameWorld initialized');
    }

    /**
     * Load world map sprite
     */
    async loadWorldMap() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets.worldMap = img;
                console.log('World map loaded');
                resolve();
            };
            img.onerror = () => reject(new Error('Failed to load world map'));
            img.src = 'worldmap.png';
        });
    }

    /**
     * Load player sprite
     */
    async loadPlayerSprite() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets.playerSprite = img;
                console.log('Player sprite loaded');
                resolve();
            };
            img.onerror = () => reject(new Error('Failed to load player sprite'));
            img.src = 'assets/player sprite sheet.png';
        });
    }

    /**
     * Load walls data
     */
    async loadWallsData() {
        try {
            const response = await fetch('walls.tmj');
            const data = await response.json();
            
            this.map.walls = [];
            if (data && data.layers) {
                const wallsLayer = data.layers.find(layer => layer.name === 'walls');
                if (wallsLayer && wallsLayer.objects) {
                    this.map.walls = wallsLayer.objects.map(obj => ({
                        x: obj.x,
                        y: obj.y,
                        width: obj.width,
                        height: obj.height
                    }));
                }
            }
            
            this.map.width = data.width || 0;
            this.map.height = data.height || 0;
            this.map.tileSize = data.tilewidth || 32;
            
            // Set camera bounds
            const mapWidth = this.map.width * this.map.tileSize;
            const mapHeight = this.map.height * this.map.tileSize;
            this.camera.bounds = { x: 0, y: 0, width: mapWidth, height: mapHeight };
            
            console.log(`Walls loaded: ${this.map.walls.length} objects`);
        } catch (error) {
            console.error('Failed to load walls data:', error);
        }
    }

    /**
     * Update game world
     */
    update(deltaTime) {
        this.updatePlayer(deltaTime);
        this.updateCamera();
    }

    /**
     * Update player
     */
    updatePlayer(deltaTime) {
        // Update animation
        if (this.player.isMoving) {
            this.player.animationFrame += this.player.animationSpeed * deltaTime;
            if (this.player.animationFrame >= this.player.frameCount) {
                this.player.animationFrame = 0;
            }
        } else {
            this.player.animationFrame = 0;
        }
        this.player.currentFrame = Math.floor(this.player.animationFrame);
    }

    /**
     * Update camera
     */
    updateCamera() {
        // Set target to center on player
        const playerCenterX = this.player.x + 16;
        const playerCenterY = this.player.y + 16;
        
        this.camera.targetX = playerCenterX - this.camera.viewportWidth / 2;
        this.camera.targetY = playerCenterY - this.camera.viewportHeight / 2;
        
        // Smoothly move camera towards target
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.followSpeed;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.followSpeed;
        
        // Apply bounds
        this.applyCameraBounds();
    }

    /**
     * Apply camera bounds
     */
    applyCameraBounds() {
        if (!this.camera.bounds) return;
        
        const halfViewportWidth = this.camera.viewportWidth / 2;
        const halfViewportHeight = this.camera.viewportHeight / 2;
        
        this.camera.x = Math.max(this.camera.bounds.x, 
            Math.min(this.camera.bounds.x + this.camera.bounds.width - this.camera.viewportWidth, this.camera.x));
        this.camera.y = Math.max(this.camera.bounds.y, 
            Math.min(this.camera.bounds.y + this.camera.bounds.height - this.camera.viewportHeight, this.camera.y));
    }

    /**
     * Handle player movement
     */
    handleMovement() {
        let moveX = 0, moveY = 0;
        
        // Keyboard input
        if (this.player.keys['w'] || this.player.keys['ArrowUp']) moveY = -1;
        if (this.player.keys['s'] || this.player.keys['ArrowDown']) moveY = 1;
        if (this.player.keys['a'] || this.player.keys['ArrowLeft']) moveX = -1;
        if (this.player.keys['d'] || this.player.keys['ArrowRight']) moveX = 1;
        
        // Joystick input
        if (this.player.joystickActive) {
            const joystickInput = this.getJoystickInput();
            moveX = joystickInput.x;
            moveY = joystickInput.y;
        }
        
        // Update player state
        this.player.isMoving = moveX !== 0 || moveY !== 0;
        
        if (this.player.isMoving) {
            // Determine direction
            if (Math.abs(moveX) > Math.abs(moveY)) {
                this.player.direction = moveX > 0 ? 'right' : 'left';
            } else {
                this.player.direction = moveY > 0 ? 'down' : 'up';
            }
            
            // Normalize diagonal movement
            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.707;
                moveY *= 0.707;
            }
            
            // Apply movement
            this.movePlayer(moveX, moveY);
            
            // Award points for movement
            this.player.movementCounter++;
            if (this.player.movementCounter >= this.player.pointsThreshold) {
                if (window.gameCore && window.gameCore.userStatsManager) {
                    window.gameCore.userStatsManager.addPoints(1);
                }
                this.player.movementCounter = 0;
            }
        }
    }

    /**
     * Move player with collision detection
     */
    movePlayer(moveX, moveY) {
        const deltaX = moveX * this.player.speed;
        const deltaY = moveY * this.player.speed;
        
        // Test horizontal movement
        if (deltaX !== 0) {
            const newX = this.player.x + deltaX;
            if (this.canMoveTo(newX, this.player.y)) {
                this.player.x = newX;
            }
        }
        
        // Test vertical movement
        if (deltaY !== 0) {
            const newY = this.player.y + deltaY;
            if (this.canMoveTo(this.player.x, newY)) {
                this.player.y = newY;
            }
        }
    }

    /**
     * Check if player can move to position
     */
    canMoveTo(x, y) {
        const playerSize = this.player.spriteWidth * this.player.displayScale;
        
        // Check map boundaries
        if (x < 0 || y < 0 || 
            x + playerSize > this.map.width * this.map.tileSize || 
            y + playerSize > this.map.height * this.map.tileSize) {
            return false;
        }
        
        // Check wall collisions
        for (const wall of this.map.walls) {
            if (this.rectCollision(x, y, playerSize, playerSize, wall.x, wall.y, wall.width, wall.height)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Rectangle collision detection
     */
    rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    /**
     * Get joystick input
     */
    getJoystickInput() {
        if (!this.player.joystickActive) return { x: 0, y: 0 };
        
        const deltaX = this.player.joystickPosition.x - this.player.joystickCenter.x;
        const deltaY = this.player.joystickPosition.y - this.player.joystickCenter.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.player.maxJoystickDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            return { x: Math.cos(angle), y: Math.sin(angle) };
        }
        
        return {
            x: deltaX / this.player.maxJoystickDistance,
            y: deltaY / this.player.maxJoystickDistance
        };
    }

    /**
     * Render the game world
     */
    render(ctx) {
        // Save context state
        ctx.save();
        
        // Apply camera transform
        ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render world map
        if (this.assets.worldMap) {
            ctx.drawImage(
                this.assets.worldMap,
                0, 0,
                this.assets.worldMap.width,
                this.assets.worldMap.height
            );
        }
        
        // Render player
        this.renderPlayer(ctx);
        
        // Restore context state
        ctx.restore();
    }

    /**
     * Render player
     */
    renderPlayer(ctx) {
        if (!this.assets.playerSprite) {
            // Draw debug rectangle
            ctx.fillStyle = 'red';
            const size = this.player.spriteWidth * this.player.displayScale;
            ctx.fillRect(this.player.x, this.player.y, size, size);
            return;
        }
        
        // Get sprite position
        const spriteX = this.player.currentFrame * this.player.spriteWidth;
        const spriteY = this.getDirectionY() * this.player.spriteHeight;
        
        // Calculate display size
        const displayWidth = this.player.spriteWidth * this.player.displayScale;
        const displayHeight = this.player.spriteHeight * this.player.displayScale;
        
        // Draw player sprite
        ctx.drawImage(
            this.assets.playerSprite,
            spriteX, spriteY, this.player.spriteWidth, this.player.spriteHeight,
            this.player.x, this.player.y, displayWidth, displayHeight
        );
    }

    /**
     * Get sprite Y position based on direction
     */
    getDirectionY() {
        switch (this.player.direction) {
            case 'up': return 3;
            case 'down': return 0;
            case 'left': return 1;
            case 'right': return 2;
            default: return 0;
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        this.player.keys[e.key.toLowerCase()] = true;
    }

    handleKeyUp(e) {
        this.player.keys[e.key.toLowerCase()] = false;
    }

    /**
     * Handle mouse events
     */
    handleMouseDown(e) {
        this.player.mouseDown = true;
        this.player.joystickActive = true;
        this.player.joystickCenter.x = e.clientX;
        this.player.joystickCenter.y = e.clientY;
        this.player.joystickPosition.x = e.clientX;
        this.player.joystickPosition.y = e.clientY;
    }

    handleMouseMove(e) {
        if (this.player.mouseDown) {
            this.player.joystickPosition.x = e.clientX;
            this.player.joystickPosition.y = e.clientY;
        }
    }

    handleMouseUp(e) {
        this.player.mouseDown = false;
        this.player.joystickActive = false;
    }

    /**
     * Handle touch events
     */
    handleTouchStart(e) {
        if (e.touches.length > 0) {
            this.player.touchActive = true;
            this.player.joystickActive = true;
            const touch = e.touches[0];
            this.player.joystickCenter.x = touch.clientX;
            this.player.joystickCenter.y = touch.clientY;
            this.player.joystickPosition.x = touch.clientX;
            this.player.joystickPosition.y = touch.clientY;
        }
    }

    handleTouchMove(e) {
        if (this.player.touchActive && e.touches.length > 0) {
            const touch = e.touches[0];
            this.player.joystickPosition.x = touch.clientX;
            this.player.joystickPosition.y = touch.clientY;
        }
    }

    handleTouchEnd(e) {
        this.player.touchActive = false;
        this.player.joystickActive = false;
    }
}

// Export for use in other modules
window.GameWorld = GameWorld;
