/**
 * Collision Detection Module
 * Handles collision detection between player and walls/objects
 */
class CollisionManager {
    constructor() {
        this.walls = [];
        this.tileSize = 32;
        this.mapWidth = 0;
        this.mapHeight = 0;
    }

    /**
     * Set walls data from Tiled map
     */
    setWallsData(tiledData) {
        this.walls = [];
        
        if (tiledData && tiledData.layers) {
            // Find the walls layer
            const wallsLayer = tiledData.layers.find(layer => layer.name === 'walls');
            
            if (wallsLayer && wallsLayer.objects) {
                this.walls = wallsLayer.objects.map(obj => ({
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height
                }));
            }
        }
        
        // Set map dimensions
        this.mapWidth = tiledData?.width || 0;
        this.mapHeight = tiledData?.height || 0;
        this.tileSize = tiledData?.tilewidth || 32;
        
        console.log(`CollisionManager: Loaded ${this.walls.length} wall objects`);
    }

    /**
     * Check if a position collides with any wall
     */
    checkCollision(x, y, width, height) {
        for (const wall of this.walls) {
            if (this.rectCollision(x, y, width, height, wall.x, wall.y, wall.width, wall.height)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if player can move to a position
     */
    canMoveTo(x, y, playerWidth, playerHeight) {
        // Check map boundaries
        if (x < 0 || y < 0 || 
            x + playerWidth > this.mapWidth * this.tileSize || 
            y + playerHeight > this.mapHeight * this.tileSize) {
            return false;
        }
        
        // Check wall collisions
        return !this.checkCollision(x, y, playerWidth, playerHeight);
    }

    /**
     * Rectangle collision detection (AABB)
     */
    rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 &&
               x1 + w1 > x2 &&
               y1 < y2 + h2 &&
               y1 + h1 > y2;
    }

    /**
     * Get collision response (push player out of collision)
     */
    getCollisionResponse(playerX, playerY, playerWidth, playerHeight, newX, newY) {
        let responseX = newX;
        let responseY = newY;
        
        // Check horizontal movement
        if (this.checkCollision(newX, playerY, playerWidth, playerHeight)) {
            responseX = playerX; // Revert horizontal movement
        }
        
        // Check vertical movement
        if (this.checkCollision(responseX, newY, playerWidth, playerHeight)) {
            responseY = playerY; // Revert vertical movement
        }
        
        return { x: responseX, y: responseY };
    }

    /**
     * Get all walls in a specific area
     */
    getWallsInArea(x, y, width, height) {
        return this.walls.filter(wall => 
            this.rectCollision(x, y, width, height, wall.x, wall.y, wall.width, wall.height)
        );
    }

    /**
     * Get the closest wall to a position
     */
    getClosestWall(x, y) {
        let closestWall = null;
        let closestDistance = Infinity;
        
        for (const wall of this.walls) {
            const wallCenterX = wall.x + wall.width / 2;
            const wallCenterY = wall.y + wall.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(x - wallCenterX, 2) + Math.pow(y - wallCenterY, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestWall = wall;
            }
        }
        
        return closestWall;
    }

    /**
     * Check if a line intersects with any wall
     */
    lineCollision(x1, y1, x2, y2) {
        for (const wall of this.walls) {
            if (this.lineRectIntersection(x1, y1, x2, y2, wall.x, wall.y, wall.width, wall.height)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a line intersects with a rectangle
     */
    lineRectIntersection(x1, y1, x2, y2, rx, ry, rw, rh) {
        // Check if line endpoints are inside rectangle
        if ((x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) ||
            (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)) {
            return true;
        }
        
        // Check line intersection with rectangle edges
        const edges = [
            [rx, ry, rx + rw, ry],           // Top
            [rx + rw, ry, rx + rw, ry + rh], // Right
            [rx, ry + rh, rx + rw, ry + rh], // Bottom
            [rx, ry, rx, ry + rh]            // Left
        ];
        
        for (const edge of edges) {
            if (this.lineLineIntersection(x1, y1, x2, y2, edge[0], edge[1], edge[2], edge[3])) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if two lines intersect
     */
    lineLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return false; // Lines are parallel
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    /**
     * Debug: Draw collision boundaries
     */
    debugDraw(ctx) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        
        for (const wall of this.walls) {
            ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
        }
        
        ctx.restore();
    }

    /**
     * Get collision statistics
     */
    getStats() {
        return {
            wallCount: this.walls.length,
            mapWidth: this.mapWidth,
            mapHeight: this.mapHeight,
            tileSize: this.tileSize
        };
    }
}

// Export for use in other modules
window.CollisionManager = CollisionManager;
