/**
 * Player Module
 * Handles player movement, animation, input, and joystick controls
 */
class Player {
    constructor() {
        // Player position and properties
        this.x = 200;
        this.y = 200;
        this.speed = 2;
        this.direction = 'down';
        this.isMoving = false;
        
        // Animation properties
        this.animationFrame = 0;
        this.animationSpeed = 0.2;
        this.frameCount = 4; // 4 frames per direction
        this.currentFrame = 0;
        
        // Sprite properties
        this.spriteWidth = 32;
        this.spriteHeight = 32;
        this.displayScale = 0.5; // Make player more visible
        
        // Input handling
        this.keys = {};
        this.mouseDown = false;
        this.touchActive = false;
        
        // Joystick properties
        this.joystickActive = false;
        this.joystickCenter = { x: 0, y: 0 };
        this.joystickPosition = { x: 0, y: 0 };
        this.maxJoystickDistance = 50;
        
        // Movement tracking for points
        this.movementCounter = 0;
        this.pointsThreshold = 100; // Award points every 100 movements
    }

    /**
     * Update player state
     */
    update(deltaTime) {
        // Update animation
        this.updateAnimation(deltaTime);
    }

    /**
     * Update animation frames
     */
    updateAnimation(deltaTime) {
        if (this.isMoving) {
            this.animationFrame += this.animationSpeed * deltaTime;
            if (this.animationFrame >= this.frameCount) {
                this.animationFrame = 0;
            }
        } else {
            this.animationFrame = 0;
        }
        this.currentFrame = Math.floor(this.animationFrame);
    }

    /**
     * Set player movement
     */
    setMovement(moveX, moveY) {
        this.isMoving = moveX !== 0 || moveY !== 0;
        
        if (this.isMoving) {
            // Determine direction based on movement
            if (Math.abs(moveX) > Math.abs(moveY)) {
                this.direction = moveX > 0 ? 'right' : 'left';
            } else {
                this.direction = moveY > 0 ? 'down' : 'up';
            }
            
            // Normalize diagonal movement
            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.707;
                moveY *= 0.707;
            }
            
            // Apply movement
            this.move(moveX, moveY);
        }
    }

    /**
     * Move player with collision checking
     */
    move(moveX, moveY) {
        const deltaX = moveX * this.speed;
        const deltaY = moveY * this.speed;
        
        // Test horizontal movement first
        if (deltaX !== 0) {
            const newX = this.x + deltaX;
            if (this.canMoveTo(newX, this.y)) {
                this.x = newX;
            }
        }
        
        // Test vertical movement second
        if (deltaY !== 0) {
            const newY = this.y + deltaY;
            if (this.canMoveTo(this.x, newY)) {
                this.y = newY;
            }
        }
    }

    /**
     * Check if player can move to a position (collision detection)
     */
    canMoveTo(x, y) {
        const playerSize = this.spriteWidth * this.displayScale;
        
        // Use collision manager if available
        if (window.gameCore?.collision) {
            return window.gameCore.collision.canMoveTo(x, y, playerSize, playerSize);
        }
        
        // Fallback to basic boundary checking
        return x >= 0 && y >= 0 && 
               x <= (window.gameCore?.assets?.wallsData?.width || 1000) - playerSize && 
               y <= (window.gameCore?.assets?.wallsData?.height || 1000) - playerSize;
    }

    /**
     * Render player sprite
     */
    render(ctx, spriteSheet) {
        if (!spriteSheet) {
            console.log('No sprite sheet available for player');
            return;
        }
        
        // Get sprite position based on direction and frame
        const spriteX = this.currentFrame * this.spriteWidth;
        const spriteY = this.getDirectionY() * this.spriteHeight;
        
        // Calculate display size
        const displayWidth = this.spriteWidth * this.displayScale;
        const displayHeight = this.spriteHeight * this.displayScale;
        
        // Draw player sprite
        ctx.drawImage(
            spriteSheet,
            spriteX, spriteY, this.spriteWidth, this.spriteHeight,
            this.x, this.y, displayWidth, displayHeight
        );
        
        // Debug: Draw a simple rectangle if sprite fails
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, displayWidth, displayHeight);
    }

    /**
     * Get sprite Y position based on direction
     */
    getDirectionY() {
        switch (this.direction) {
            case 'up': return 3;
            case 'down': return 0;
            case 'left': return 1;
            case 'right': return 2;
            default: return 0;
        }
    }

    /**
     * Handle mouse down events
     */
    handleMouseDown(e) {
        this.mouseDown = true;
        this.joystickActive = true;
        this.joystickCenter.x = e.clientX;
        this.joystickCenter.y = e.clientY;
        this.joystickPosition.x = e.clientX;
        this.joystickPosition.y = e.clientY;
    }

    /**
     * Handle mouse move events
     */
    handleMouseMove(e) {
        if (this.mouseDown) {
            this.joystickPosition.x = e.clientX;
            this.joystickPosition.y = e.clientY;
        }
    }

    /**
     * Handle mouse up events
     */
    handleMouseUp(e) {
        this.mouseDown = false;
        this.joystickActive = false;
    }

    /**
     * Handle touch start events
     */
    handleTouchStart(e) {
        if (e.touches.length > 0) {
            this.touchActive = true;
            this.joystickActive = true;
            const touch = e.touches[0];
            this.joystickCenter.x = touch.clientX;
            this.joystickCenter.y = touch.clientY;
            this.joystickPosition.x = touch.clientX;
            this.joystickPosition.y = touch.clientY;
        }
    }

    /**
     * Handle touch move events
     */
    handleTouchMove(e) {
        if (this.touchActive && e.touches.length > 0) {
            const touch = e.touches[0];
            this.joystickPosition.x = touch.clientX;
            this.joystickPosition.y = touch.clientY;
        }
    }

    /**
     * Handle touch end events
     */
    handleTouchEnd(e) {
        this.touchActive = false;
        this.joystickActive = false;
    }

    /**
     * Get joystick input
     */
    getJoystickInput() {
        if (!this.joystickActive) return { x: 0, y: 0 };
        
        const deltaX = this.joystickPosition.x - this.joystickCenter.x;
        const deltaY = this.joystickPosition.y - this.joystickCenter.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.maxJoystickDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            return {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        }
        
        return {
            x: deltaX / this.maxJoystickDistance,
            y: deltaY / this.maxJoystickDistance
        };
    }

    /**
     * Increment movement counter for points
     */
    incrementMovementCounter() {
        if (this.isMoving) {
            this.movementCounter++;
        }
    }

    /**
     * Check if should award points
     */
    shouldAwardPoints() {
        return this.movementCounter >= this.pointsThreshold;
    }

    /**
     * Reset movement counter
     */
    resetMovementCounter() {
        this.movementCounter = 0;
    }

    /**
     * Get player position
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Set player position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Get player bounds for collision detection
     */
    getBounds() {
        const size = this.spriteWidth * this.displayScale;
        return {
            x: this.x,
            y: this.y,
            width: size,
            height: size
        };
    }
}

// Export for use in other modules
window.Player = Player;
