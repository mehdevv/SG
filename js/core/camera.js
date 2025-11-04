/**
 * Camera Module
 * Handles camera positioning, smooth following, and viewport management
 */
class Camera {
    constructor() {
        // Camera position
        this.x = 0;
        this.y = 0;
        
        // Target position for smooth following
        this.targetX = 0;
        this.targetY = 0;
        
        // Camera properties
        this.followSpeed = 0.3;
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 2;
        
        // Viewport properties
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        
        // Camera bounds (optional)
        this.bounds = null;
        this.boundX = 0;
        this.boundY = 0;
        this.boundWidth = 0;
        this.boundHeight = 0;
    }

    /**
     * Initialize camera with viewport dimensions
     */
    initialize(viewportWidth, viewportHeight) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        console.log('Camera initialized with viewport:', { width: viewportWidth, height: viewportHeight });
    }

    /**
     * Update camera position
     */
    update(player) {
        if (!player) return;
        
        // Set target to center on player
        const playerCenterX = player.x + 16; // Half of player size (32/2)
        const playerCenterY = player.y + 16; // Half of player size (32/2)
        
        this.centerOn(playerCenterX, playerCenterY);
        
        // Smoothly move camera towards target
        this.x += (this.targetX - this.x) * this.followSpeed;
        this.y += (this.targetY - this.y) * this.followSpeed;
        
        // Apply bounds if set
        this.applyBounds();
        
        // Debug: Log camera position occasionally
        if (Math.random() < 0.01) { // 1% chance to log
            console.log('Camera position:', { x: this.x, y: this.y, targetX: this.targetX, targetY: this.targetY });
        }
    }

    /**
     * Set camera target position
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Set camera position immediately
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Center camera on a position
     */
    centerOn(x, y) {
        this.setTarget(x - this.viewportWidth / 2, y - this.viewportHeight / 2);
    }

    /**
     * Apply camera transform to context
     */
    applyTransform(ctx) {
        ctx.save();
        
        // Apply zoom
        ctx.scale(this.zoom, this.zoom);
        
        // Apply translation (center camera on viewport)
        const offsetX = (this.viewportWidth / 2) - this.x;
        const offsetY = (this.viewportHeight / 2) - this.y;
        ctx.translate(offsetX, offsetY);
    }

    /**
     * Restore camera transform
     */
    restoreTransform(ctx) {
        ctx.restore();
    }

    /**
     * Set camera bounds
     */
    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
        this.boundX = x;
        this.boundY = y;
        this.boundWidth = width;
        this.boundHeight = height;
    }

    /**
     * Remove camera bounds
     */
    removeBounds() {
        this.bounds = null;
    }

    /**
     * Apply camera bounds
     */
    applyBounds() {
        if (!this.bounds) return;
        
        const halfViewportWidth = this.viewportWidth / 2 / this.zoom;
        const halfViewportHeight = this.viewportHeight / 2 / this.zoom;
        
        // Clamp camera position to bounds
        this.x = Math.max(this.boundX, Math.min(this.boundX + this.boundWidth - this.viewportWidth / this.zoom, this.x));
        this.y = Math.max(this.boundY, Math.min(this.boundY + this.boundHeight - this.viewportHeight / this.zoom, this.y));
    }

    /**
     * Set zoom level
     */
    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }

    /**
     * Zoom in
     */
    zoomIn(factor = 0.1) {
        this.setZoom(this.zoom + factor);
    }

    /**
     * Zoom out
     */
    zoomOut(factor = 0.1) {
        this.setZoom(this.zoom - factor);
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        const worldX = (screenX / this.zoom) + this.x - (this.viewportWidth / 2 / this.zoom);
        const worldY = (screenY / this.zoom) + this.y - (this.viewportHeight / 2 / this.zoom);
        return { x: worldX, y: worldY };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x + (this.viewportWidth / 2 / this.zoom)) * this.zoom;
        const screenY = (worldY - this.y + (this.viewportHeight / 2 / this.zoom)) * this.zoom;
        return { x: screenX, y: screenY };
    }

    /**
     * Check if a world position is visible in the viewport
     */
    isVisible(worldX, worldY, width = 0, height = 0) {
        const halfViewportWidth = this.viewportWidth / 2 / this.zoom;
        const halfViewportHeight = this.viewportHeight / 2 / this.zoom;
        
        return worldX + width >= this.x - halfViewportWidth &&
               worldX <= this.x + halfViewportWidth &&
               worldY + height >= this.y - halfViewportHeight &&
               worldY <= this.y + halfViewportHeight;
    }

    /**
     * Get camera viewport in world coordinates
     */
    getViewport() {
        const halfViewportWidth = this.viewportWidth / 2 / this.zoom;
        const halfViewportHeight = this.viewportHeight / 2 / this.zoom;
        
        return {
            x: this.x - halfViewportWidth,
            y: this.y - halfViewportHeight,
            width: this.viewportWidth / this.zoom,
            height: this.viewportHeight / this.zoom
        };
    }

    /**
     * Shake camera effect
     */
    shake(intensity = 5, duration = 100) {
        // Simple shake implementation
        const originalX = this.x;
        const originalY = this.y;
        
        const shakeInterval = setInterval(() => {
            this.x = originalX + (Math.random() - 0.5) * intensity;
            this.y = originalY + (Math.random() - 0.5) * intensity;
        }, 16);
        
        setTimeout(() => {
            clearInterval(shakeInterval);
            this.x = originalX;
            this.y = originalY;
        }, duration);
    }

    /**
     * Get camera state
     */
    getState() {
        return {
            x: this.x,
            y: this.y,
            targetX: this.targetX,
            targetY: this.targetY,
            zoom: this.zoom,
            viewportWidth: this.viewportWidth,
            viewportHeight: this.viewportHeight,
            bounds: this.bounds
        };
    }
}

// Export for use in other modules
window.Camera = Camera;
