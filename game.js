/**
 * Adventure Game - Complete Redesign
 * Clean, modular design with proper separation of concerns
 */

class AdventureGame {
    constructor() {
        // Core game properties
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'loading'; // loading, playing, paused
        this.lastTime = 0;
        this.deltaTime = 0;
        this.statsRefreshTimer = 0;
        
        // Initialize canvas
        this.setupCanvas();
        
        // Game systems
        this.input = new InputManager(this);
        this.camera = new Camera(this);
        this.map = new MapManager(this);
        this.player = new Player(this);
        this.ui = new UIManager(this);
        this.auth = new AuthManager(this);
        
        // Start the game
        this.init();
    }
    
    setupCanvas() {
        // Get actual screen dimensions
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Set canvas to full screen
        this.canvas.width = screenWidth;
        this.canvas.height = screenHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.camera.updateViewport();
            
            console.log(`📱 Screen resized: ${newWidth}x${newHeight}`);
        });
        
        // Handle orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                const newWidth = window.innerWidth;
                const newHeight = window.innerHeight;
                
                this.canvas.width = newWidth;
                this.canvas.height = newHeight;
                this.camera.updateViewport();
                
                console.log(`🔄 Orientation changed: ${newWidth}x${newHeight}`);
            }, 100);
        });
    }
    
    async init() {
        console.log('🎮 Initializing Adventure Game...');
        
        // Check if user is on PC and show QR code message
        this.checkDeviceAndShowQR();
        
        // Always show loading screen first
        this.gameState = 'loading';
        this.ui.showLoading();
        
        try {
            // Initialize authentication
            await this.auth.init();
            
            // Wait for Firebase to fully initialize and check auth state
            await this.waitForAuthState();
            
        } catch (error) {
            console.error('❌ Game initialization failed:', error);
            this.showError('Failed to initialize game');
        }
    }
    
    checkDeviceAndShowQR() {
        // Check if user is on a desktop/PC device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        
        // If it's not mobile, not touch device, and not small screen, show QR code
        if (!isMobile && !isTouchDevice && !isSmallScreen) {
            console.log('🖥️ PC detected - showing QR code message');
            const pcMessage = document.getElementById('pcMessage');
            if (pcMessage) {
                pcMessage.style.display = 'flex';
            }
        } else {
            console.log('📱 Mobile device detected - hiding QR code message');
        }
    }
    
    async waitForAuthState() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds max wait
            
            const check = () => {
                attempts++;
                console.log(`⏳ Checking auth state... (attempt ${attempts}/${maxAttempts})`);
                
                const currentUser = window.auth.currentUser;
                console.log("🔍 Current user:", currentUser ? currentUser.email : "No user");
                
                if (currentUser) {
                    console.log("✅ User already logged in:", currentUser.email);
                    // User is logged in, start game directly
                    this.startGame();
                resolve();
                } else if (attempts >= maxAttempts) {
                    console.log("❌ No user logged in after timeout, showing login form");
                    // User not logged in, show login form
                    this.showLogin();
                resolve();
                } else {
                    // Keep checking
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    async startGame() {
        console.log('🚀 Starting game...');
        this.gameState = 'loading';
        this.ui.showLoading();
        
        try {
            // Load all game assets
            await Promise.all([
                this.map.loadAssets(),
                this.player.loadAssets()
            ]);
            
            // Initialize game systems
            this.camera.init();
            this.input.init();
            
            // Start game loop
            this.gameState = 'playing';
            this.ui.hideLoading();
            this.ui.hideLogin();
            
            // Force refresh user stats to ensure latest data from Firestore
            if (this.auth && this.auth.user) {
                this.auth.refreshUserStats();
            }
            
            this.gameLoop();
            
            console.log('✅ Game started successfully!');
            
        } catch (error) {
            console.error('❌ Failed to start game:', error);
            this.showError('Failed to load game assets');
        }
    }
    
    showLogin() {
        console.log("🔐 Showing login screen...");
        this.gameState = 'login';
        this.ui.showLogin();
    }
    
    hideLogin() {
        console.log("🔒 Hiding login screen...");
        this.ui.hideLogin();
    }
    
    showError(message) {
        this.ui.showError(message);
    }
    
    
    gameLoop(currentTime = 0) {
        if (this.gameState !== 'playing') return;
        
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Track stats refresh timer
        this.statsRefreshTimer += this.deltaTime;
        
        // Refresh user stats from Firestore every 30 seconds to stay synchronized
        if (this.statsRefreshTimer >= 30000) {
            this.auth.refreshUserStats();
            this.statsRefreshTimer = 0;
        }
        
        // Update game systems
        this.update();
        
        // Render game
        this.render();
        
        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update() {
        // Update input
        this.input.update();
        
        // Update player
        this.player.update(this.deltaTime);
        
        // Update camera
        this.camera.update();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context state
        this.ctx.save();
        
        // Apply camera transform
        this.camera.applyTransform(this.ctx);
        
        // Render game world
        this.map.render(this.ctx);
        this.player.render(this.ctx);
        
        // Restore context state
        this.ctx.restore();
        
        // Render UI (not affected by camera)
        this.ui.render(this.ctx);
    }
}

/**
 * Input Manager - Handles all input (keyboard, mouse, touch, joystick)
 */
class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.touch = { active: false, x: 0, y: 0 };
        this.joystick = {
            active: false,
            center: { x: 0, y: 0 },
            position: { x: 0, y: 0 },
            maxDistance: 60
        };
    }
    
    init() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        this.game.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.game.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.game.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events
        this.game.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.game.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.game.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    handleKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;
            e.preventDefault();
    }
    
    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }
    
    handleMouseDown(e) {
        this.mouse.down = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.startJoystick(e.clientX, e.clientY);
    }
    
    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        if (this.mouse.down) {
            this.updateJoystick(e.clientX, e.clientY);
        }
    }
    
    handleMouseUp(e) {
        this.mouse.down = false;
        this.stopJoystick();
    }
    
    handleTouchStart(e) {
            e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.touch.active = true;
            this.touch.x = touch.clientX;
            this.touch.y = touch.clientY;
            this.startJoystick(touch.clientX, touch.clientY);
        }
    }
    
    handleTouchMove(e) {
            e.preventDefault();
        if (this.touch.active && e.touches.length > 0) {
            const touch = e.touches[0];
            this.touch.x = touch.clientX;
            this.touch.y = touch.clientY;
            this.updateJoystick(touch.clientX, touch.clientY);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.touch.active = false;
        this.stopJoystick();
    }
    
    startJoystick(x, y) {
        this.joystick.active = true;
        this.joystick.center.x = x;
        this.joystick.center.y = y;
        this.joystick.position.x = x;
        this.joystick.position.y = y;
    }
    
    updateJoystick(x, y) {
        if (!this.joystick.active) return;
        this.joystick.position.x = x;
        this.joystick.position.y = y;
    }
    
    stopJoystick() {
        this.joystick.active = false;
    }
    
    getMovementInput() {
        let x = 0, y = 0;
        
        // Keyboard input
        if (this.keys['w'] || this.keys['arrowup']) y = -1;
        if (this.keys['s'] || this.keys['arrowdown']) y = 1;
        if (this.keys['a'] || this.keys['arrowleft']) x = -1;
        if (this.keys['d'] || this.keys['arrowright']) x = 1;
        
        // Joystick input
        if (this.joystick.active) {
            const deltaX = this.joystick.position.x - this.joystick.center.x;
            const deltaY = this.joystick.position.y - this.joystick.center.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
            if (distance > 10) { // Dead zone
                const maxDist = this.joystick.maxDistance;
                const clampedDist = Math.min(distance, maxDist);
            const angle = Math.atan2(deltaY, deltaX);
                
                x = Math.cos(angle) * (clampedDist / maxDist);
                y = Math.sin(angle) * (clampedDist / maxDist);
            }
        }
        
        // Normalize diagonal movement
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }
        
        return { x, y };
    }
    
    update() {
        // Update input state
    }
}

/**
 * Camera System - Handles viewport and following with zoom and bounds
 */
class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.followSpeed = 0.25;
        this.zoom = 2.0; // Zoom in on player
        this.viewport = { width: 0, height: 0 };
        this.bounds = null;
    }
    
    init() {
        this.updateViewport();
        this.x = this.game.player.x;
        this.y = this.game.player.y;
        this.targetX = this.x;
        this.targetY = this.y;
    }
    
    updateViewport() {
        this.viewport.width = this.game.canvas.width;
        this.viewport.height = this.game.canvas.height;
    }
    
    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
    }
    
    update() {
        // Follow player closely
        const playerCenterX = this.game.player.x + this.game.player.width / 2;
        const playerCenterY = this.game.player.y + this.game.player.height / 2;
        
        // Center camera on player (adjusted for zoom)
        this.targetX = playerCenterX - (this.viewport.width / 2) / this.zoom;
        this.targetY = playerCenterY - (this.viewport.height / 2) / this.zoom;
        
        // Smooth interpolation
        this.x += (this.targetX - this.x) * this.followSpeed;
        this.y += (this.targetY - this.y) * this.followSpeed;
        
        // Apply bounds to prevent showing areas outside the map
        if (this.bounds) {
            const zoomedViewportWidth = this.viewport.width / this.zoom;
            const zoomedViewportHeight = this.viewport.height / this.zoom;
            
            // Calculate bounds to keep camera within map
            const minX = this.bounds.x;
            const maxX = this.bounds.x + this.bounds.width - zoomedViewportWidth;
            const minY = this.bounds.y;
            const maxY = this.bounds.y + this.bounds.height - zoomedViewportHeight;
            
            // Clamp camera position to stay within map bounds
            this.x = Math.max(minX, Math.min(maxX, this.x));
            this.y = Math.max(minY, Math.min(maxY, this.y));
        }
    }
    
    applyTransform(ctx) {
        // Apply zoom first
        ctx.scale(this.zoom, this.zoom);
        
        // Then apply translation
        ctx.translate(-this.x, -this.y);
    }
}

/**
 * Map Manager - Handles world map and collision
 */
class MapManager {
    constructor(game) {
        this.game = game;
        this.worldMap = null;
        this.collisionLayer = null;
        this.width = 0;
        this.height = 0;
        this.tileSize = 32;
    }
    
    async loadAssets() {
        console.log('🗺️ Loading map assets...');
        
        // Load world map image
        this.worldMap = await this.loadImage('worldmap.png');
        
        // Load collision data
        await this.loadCollisionData();
        
        console.log('✅ Map assets loaded');
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }
    
    async loadCollisionData() {
        try {
            const response = await fetch('walls.tmj');
            const data = await response.json();
            
            this.collisionLayer = [];
            
            if (data && data.layers) {
                const wallsLayer = data.layers.find(layer => layer.name === 'walls');
                if (wallsLayer && wallsLayer.objects) {
                    this.collisionLayer = wallsLayer.objects.map(obj => ({
                        x: obj.x,
                        y: obj.y,
                        width: obj.width,
                        height: obj.height
                    }));
                }
            }
            
            this.width = data.width || 0;
            this.height = data.height || 0;
            this.tileSize = data.tilewidth || 32;
            
            // Set camera bounds
            const mapWidth = this.width * this.tileSize;
            const mapHeight = this.height * this.tileSize;
            this.game.camera.setBounds(0, 0, mapWidth, mapHeight);
            
            console.log(`📐 Map: ${this.width}x${this.height} tiles, ${mapWidth}x${mapHeight} pixels`);
            console.log(`🧱 Collision objects: ${this.collisionLayer.length}`);
            
        } catch (error) {
            console.error('❌ Failed to load collision data:', error);
        }
    }
    
    checkCollision(x, y, width, height) {
        // Check map boundaries
        const mapWidth = this.width * this.tileSize;
        const mapHeight = this.height * this.tileSize;
        
        if (x < 0 || y < 0 || x + width > mapWidth || y + height > mapHeight) {
            return true;
        }
        
        // Check collision objects
        for (const wall of this.collisionLayer) {
            if (this.rectCollision(x, y, width, height, wall.x, wall.y, wall.width, wall.height)) {
                return true;
            }
        }
        
        return false;
    }
    
    rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }
    
    render(ctx) {
        if (!this.worldMap) return;
        
        // Render world map at correct size
        const mapWidth = this.width * this.tileSize;
        const mapHeight = this.height * this.tileSize;
        
        ctx.drawImage(this.worldMap, 0, 0, mapWidth, mapHeight);
    }
}

/**
 * Player - Handles player character
 */
class Player {
    constructor(game) {
        this.game = game;
        this.x = 30;
        this.y = 550;
        this.width = 24;
        this.height = 31.2;
        this.speed = 120; // pixels per second
        this.direction = 'down';
        this.isMoving = false;
        
        // Animation
        this.animationFrame = 0;
        this.animationSpeed = 8; // frames per second
        this.frameCount = 4;
        this.currentFrame = 0;
        
        // Sprite
        this.sprite = null;
        this.spriteWidth = 0;   // Will be calculated from image width / 4
        this.spriteHeight = 0;  // Will be calculated from image height / 4
        this.spriteSheetCols = 4; // Number of columns in sprite sheet
        this.spriteSheetRows = 4; // Number of rows in sprite sheet
        
    }
    
    async loadAssets() {
        console.log('👤 Loading player assets...');
        this.sprite = await this.loadImage('assets/player sprite sheet.png');
        
        // Calculate sprite dimensions from actual image size
        this.spriteWidth = this.sprite.width / this.spriteSheetCols;
        this.spriteHeight = this.sprite.height / this.spriteSheetRows;
        
        console.log('✅ Player assets loaded');
        console.log(`📐 Sprite sheet: ${this.spriteSheetCols}x${this.spriteSheetRows} grid`);
        console.log(`🖼️ Image size: ${this.sprite.width}x${this.sprite.height}px`);
        console.log(`🎬 Frame size: ${this.spriteWidth}x${this.spriteHeight}px`);
        console.log(`🎯 Total frames: ${this.spriteSheetCols * this.spriteSheetRows}`);
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }
    
    update(deltaTime) {
        // Get movement input
        const input = this.game.input.getMovementInput();
        
        // Update movement
        this.isMoving = input.x !== 0 || input.y !== 0;
        
        if (this.isMoving) {
            // Update direction
            if (Math.abs(input.x) > Math.abs(input.y)) {
                this.direction = input.x > 0 ? 'right' : 'left';
            } else {
                this.direction = input.y > 0 ? 'down' : 'up';
            }
            
            // Calculate movement
            const moveX = input.x * this.speed * deltaTime / 1000;
            const moveY = input.y * this.speed * deltaTime / 1000;
            
            // Apply movement with collision detection
            this.move(moveX, moveY);
            
        }
        
        // Update animation
        this.updateAnimation(deltaTime);
    }
    
    move(deltaX, deltaY) {
        // Test horizontal movement
        if (deltaX !== 0) {
            const newX = this.x + deltaX;
            if (!this.game.map.checkCollision(newX, this.y, this.width, this.height)) {
                this.x = newX;
            }
        }
        
        // Test vertical movement
        if (deltaY !== 0) {
            const newY = this.y + deltaY;
            if (!this.game.map.checkCollision(this.x, newY, this.width, this.height)) {
                this.y = newY;
            }
        }
    }
    
    updateAnimation(deltaTime) {
        if (this.isMoving) {
            this.animationFrame += this.animationSpeed * deltaTime / 1000;
            if (this.animationFrame >= this.frameCount) {
                this.animationFrame = 0;
            }
        } else {
            this.animationFrame = 0;
        }
        this.currentFrame = Math.floor(this.animationFrame);
    }
    
    render(ctx) {
        if (!this.sprite) {
            // Draw debug rectangle
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }
        
        // Get sprite frame coordinates
        const spriteX = this.currentFrame * this.spriteWidth;
        const spriteY = this.getDirectionY() * this.spriteHeight;
        
        // Debug info (uncomment for troubleshooting)
        // console.log(`Direction: ${this.direction}, Frame: ${this.currentFrame}, Sprite coords: (${spriteX}, ${spriteY})`);
        
        // Draw player sprite
        ctx.drawImage(
            this.sprite,
            spriteX, spriteY, this.spriteWidth, this.spriteHeight,
            this.x, this.y, this.width, this.height
        );
    }
    
    getDirectionY() {
        // For a 4x4 sprite sheet, each direction has 4 animation frames
        // Row 0: Down, Row 1: Right, Row 2: Left, Row 3: Up
        switch (this.direction) {
            case 'down': return 0;  // First row (frames 0-3)
            case 'right': return 1; // Second row (frames 0-3)
            case 'left': return 2;  // Third row (frames 0-3)
            case 'up': return 3;    // Fourth row (frames 0-3)
            default: return 0;
        }
    }
}

/**
 * UI Manager - Handles all user interface
 */
class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = {};
        this.getElements();
    }
    
    getElements() {
        this.elements = {
            loginScreen: document.getElementById('loginScreen'),
            loadingScreen: document.getElementById('loadingScreen'),
            gameContainer: document.getElementById('gameContainer'),
            loginForm: document.getElementById('loginForm'),
            emailInput: document.getElementById('emailInput'),
            passwordInput: document.getElementById('passwordInput'),
            loginButton: document.getElementById('loginButton'),
            loginButtonText: document.getElementById('loginButtonText'),
            loginSpinner: document.getElementById('loginSpinner'),
            loginError: document.getElementById('loginError'),
            logoutButton: document.getElementById('logoutButton'),
            userName: document.getElementById('userName'),
            userLevel: document.getElementById('userLevel'),
            userPoints: document.getElementById('userPoints'),
            userExp: document.getElementById('userExp'),
            playerAvatar: document.getElementById('playerAvatar'),
            questToggle: document.getElementById('questToggle'),
            questPanel: document.getElementById('questPanel')
        };
        
        // Setup quest panel functionality
        this.setupQuestPanel();
    }
    
    setupQuestPanel() {
        // Quest toggle click handler
        if (this.elements.questToggle) {
            this.elements.questToggle.addEventListener('click', () => {
                this.toggleQuestPanel();
            });
        }
        
        
        // Quest panel drag functionality
        this.setupQuestPanelDrag();
    }
    
    setupQuestPanelDrag() {
        // Simple click-only functionality - no dragging
        // The click handler is already set up in setupQuestPanel()
    }
    
    toggleQuestPanel() {
        if (this.elements.questPanel.classList.contains('open')) {
            this.closeQuestPanel();
        } else {
            this.openQuestPanel();
        }
    }
    
    openQuestPanel() {
        this.elements.questPanel.classList.add('open');
        this.elements.questToggle.classList.add('open');
        console.log('📋 Quest panel pulled out from left side');
    }
    
    closeQuestPanel() {
        this.elements.questPanel.classList.remove('open');
        this.elements.questToggle.classList.remove('open');
        console.log('📋 Quest panel pushed back behind arrow');
    }
    
    showLogin() {
        this.elements.loginScreen.style.display = 'flex';
        this.elements.loadingScreen.style.display = 'none';
        this.elements.gameContainer.style.display = 'none';
    }
    
    hideLogin() {
        this.elements.loginScreen.style.display = 'none';
    }
    
    showLoading() {
        this.elements.loginScreen.style.display = 'none';
        this.elements.loadingScreen.style.display = 'flex';
        this.elements.gameContainer.style.display = 'block';
    }
    
    hideLoading() {
        this.elements.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            this.elements.loadingScreen.style.display = 'none';
        }, 500);
    }
    
    showError(message) {
        console.error('UI Error:', message);
    }
    
    updateUserStats(stats) {
        if (!stats) return;
        
        // Store previous values for comparison
        const previousStats = this.lastStats || {};
        
        // Update username - always use the actual name from Firebase
        if (this.elements.userName) {
            const newName = stats.name || 'Player';
            if (this.elements.userName.textContent !== newName) {
                this.elements.userName.textContent = newName;
                this.highlightStatChange('userName');
            }
        }
        
        // Update level
        if (this.elements.userLevel) {
            if (this.elements.userLevel.textContent !== stats.level.toString()) {
                this.elements.userLevel.textContent = stats.level;
                this.highlightStatChange('userLevel');
            }
        }
        
        // Update points (DZD)
        if (this.elements.userPoints) {
            if (this.elements.userPoints.textContent !== stats.points.toString()) {
                this.elements.userPoints.textContent = stats.points;
                this.highlightStatChange('userPoints');
            }
        }
        
        // Update experience
        if (this.elements.userExp) {
            let newExpText;
            if (stats.level >= 10) {
                newExpText = 'MAX';
            } else {
                const expNeeded = stats.level * 100; // Level 1: 100, Level 2: 200, etc.
                newExpText = `${stats.experience}/${expNeeded}`;
            }
            if (this.elements.userExp.textContent !== newExpText) {
                this.elements.userExp.textContent = newExpText;
                this.highlightStatChange('userExp');
            }
        }
        
        
        // Update player avatar
        if (this.elements.playerAvatar) {
            if (stats.skin && stats.skin.trim() !== '') {
                if (this.elements.playerAvatar.src !== stats.skin) {
                    this.elements.playerAvatar.src = stats.skin;
                    this.elements.playerAvatar.style.display = 'block';
                    this.elements.playerAvatar.onerror = () => {
                        this.elements.playerAvatar.style.display = 'none';
                    };
                    }
                } else {
                this.elements.playerAvatar.style.display = 'none';
            }
        }
        
        // Store current stats for next comparison
        this.lastStats = { ...stats };
        
        // Update quest progress
        this.updateQuestProgress(stats);
    }
    
    // Add visual feedback when stats change
    highlightStatChange(elementId) {
        const element = this.elements[elementId];
        if (element) {
            element.style.transition = 'all 0.3s ease';
            element.style.backgroundColor = '#4CAF50';
            element.style.color = 'white';
            element.style.borderRadius = '4px';
            element.style.padding = '2px 4px';
            
            setTimeout(() => {
                element.style.backgroundColor = '';
                element.style.color = '';
                element.style.borderRadius = '';
                element.style.padding = '';
            }, 1000);
        }
    }
    
    updatePlayerQuests(quests) {
        const questContent = document.querySelector('.quest-content');
        if (!questContent) return;
        
        if (quests.length === 0) {
            questContent.innerHTML = '<div class="no-quests">No active quests</div>';
            return;
        }
        
        questContent.innerHTML = quests.map(quest => {
            const timerInfo = this.game.auth.formatQuestTimeRemaining(quest.endTime);
            
            return `
                <div class="quest-item" data-quest-id="${quest.id}">
                    <div class="quest-header">
                        <div class="quest-logo">${quest.logo || '📍'}</div>
                        <div class="quest-info">
                            <div class="quest-title">${quest.name}</div>
                            <div class="quest-timer ${timerInfo.class}" data-end-time="${quest.endTime}">
                                ${timerInfo.text}
                            </div>
                        </div>
                    </div>
                    <div class="quest-description">${quest.description}</div>
                    <div class="quest-rewards">
                        <span class="reward-badge reward-xp">+${quest.xpReward || 0} XP</span>
                        <span class="reward-badge reward-coins">+${quest.coinsReward || 0} DZD</span>
                    </div>
                    ${quest.verificationLink ? `
                        <div class="quest-verification">
                            <button class="verification-btn" onclick="window.open('${quest.verificationLink}', '_blank')">
                                ${quest.verificationName || 'Verify Quest'}
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Start quest timer updates
        this.startQuestTimerUpdates();
    }
    
    startQuestTimerUpdates() {
        // Clear existing timer
        if (this.questTimerInterval) {
            clearInterval(this.questTimerInterval);
        }
        
        // Update timers every second
        this.questTimerInterval = setInterval(() => {
            this.updateQuestTimers();
        }, 1000);
    }
    
    updateQuestTimers() {
        const questItems = document.querySelectorAll('.quest-item');
        questItems.forEach(item => {
            const timerElement = item.querySelector('.quest-timer');
            if (timerElement && timerElement.dataset.endTime) {
                const endTime = new Date(timerElement.dataset.endTime);
                const now = new Date();
                const timeLeft = endTime - now;
                
                if (timeLeft <= 0) {
                    timerElement.textContent = 'Expired';
                    timerElement.className = 'quest-timer expired';
                } else {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                    
                    if (hours > 0) {
                        timerElement.textContent = `${hours}h ${minutes}m`;
                    } else if (minutes > 0) {
                        timerElement.textContent = `${minutes}m ${seconds}s`;
                    } else {
                        timerElement.textContent = `${seconds}s`;
                    }
                    
                    // Change styling based on time remaining
                    if (timeLeft < 60000) { // Less than 1 minute
                        timerElement.className = 'quest-timer ending';
                    } else if (timeLeft < 3600000) { // Less than 1 hour
                        timerElement.className = 'quest-timer ending';
                    } else {
                        timerElement.className = 'quest-timer active';
                    }
                }
            }
        });
    }
    
    updateQuestProgress(stats) {
        // This method is now handled by updatePlayerQuests
        // Keeping it for backward compatibility but it's no longer used
    }
    
    render(ctx) {
        // Render joystick if active
        if (this.game.input.joystick.active) {
            this.renderJoystick(ctx);
        }
    }
    
    renderJoystick(ctx) {
        const joystick = this.game.input.joystick;
        
        // Outer circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(joystick.center.x, joystick.center.y, joystick.maxDistance, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(joystick.position.x, joystick.position.y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Authentication Manager - Handles Firebase auth and user stats
 */
class AuthManager {
    constructor(game) {
        this.game = game;
        this.user = null;
        this.userStats = null;
        this.authStateListeners = [];
    }
    
    async init() {
        // Wait for Firebase
        await this.waitForFirebase();
        
        // Listen for auth state changes
        window.onAuthStateChanged(window.auth, (user) => {
            console.log("🔥 Auth state changed:", user ? user.email : "No user");
            this.user = user;
            this.notifyAuthStateListeners(user);
            
            // Load user stats if user is logged in
            if (user) {
                this.loadUserStats();
                // Reset login loading state
                this.setLoginLoading(false);
                // If we're in login state and user just logged in, start the game
                if (this.game.gameState === 'login') {
                    console.log("🎮 User logged in, starting game...");
                    this.game.startGame();
                }
            } else {
                // User logged out, show login screen only if we're currently playing
                if (this.game.gameState === 'playing') {
                    console.log("👋 User logged out, showing login...");
                    this.game.showLogin();
                }
                // Don't show login form during initialization - let waitForAuthState handle it
            }
        });
        
        // Setup login form
        this.setupLoginForm();
        
        // Set up real-time stat update listeners
        this.setupRealTimeUpdates();
    }
    
    waitForFirebase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const check = () => {
                attempts++;
                console.log(`⏳ Waiting for Firebase... (attempt ${attempts}/${maxAttempts})`);
                
                if (window.auth && window.onAuthStateChanged) {
                    console.log("✅ Firebase is ready!");
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error("❌ Firebase initialization timeout");
                    resolve(); // Continue anyway
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        if (this.user !== null) {
            callback(this.user);
        }
    }
    
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }
    
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        
        console.log("🔐 Attempting login for:", email);
        this.setLoginLoading(true);
        
        try {
            // First, try normal Firebase Auth login
            const result = await window.signInWithEmailAndPassword(window.auth, email, password);
            console.log("✅ Login successful:", result.user.email);
            // Don't set loading to false here - let the auth state change handle it
        } catch (error) {
            console.log("⚠️ Firebase Auth login failed, checking for admin-created account...");
            console.log("🔍 Original error:", error.code, error.message);
            
            // If Firebase Auth fails, check if this is an admin-created account
            try {
                await this.handleAdminCreatedAccount(email, password);
            } catch (adminError) {
                console.error("❌ Admin account creation/login failed:", adminError);
                
                // Show more specific error message
                let errorMessage = "Login failed. ";
                if (adminError.message.includes("No account found")) {
                    errorMessage += "Account not found. Please check if the account was created in the admin dashboard.";
                } else if (adminError.message.includes("Invalid password")) {
                    errorMessage += "Incorrect password.";
                } else if (adminError.message.includes("Firebase Auth account")) {
                    errorMessage += "Failed to create authentication account. Please try again.";
                } else {
                    errorMessage += adminError.message;
                }
                
                this.showLoginError(errorMessage);
                this.setLoginLoading(false);
            }
        }
    }
    
    async handleAdminCreatedAccount(email, password) {
        console.log("🔍 Looking for admin-created account:", email);
        
        try {
            // Validate email format first
            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format. Please use a valid email address.');
            }
            
            // Search for user document by email in Firestore
            const usersRef = window.collection(window.db, 'users');
            const q = window.query(usersRef, window.where('email', '==', email));
            const querySnapshot = await window.getDocs(q);
            
            console.log("📊 Query results:", querySnapshot.size, "documents found");
            
            if (querySnapshot.empty) {
                console.log("❌ No documents found for email:", email);
                throw new Error('No account found with this email. Please check if the account was created in the admin dashboard.');
            }
            
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            console.log("📋 User document data:", userData);
            console.log("🔑 needsAuthCreation:", userData.needsAuthCreation);
            console.log("🔐 Password match:", userData.password === password);
            
            if (userData.needsAuthCreation && userData.password === password) {
                console.log("🆕 Creating Firebase Auth account for admin-created user...");
                
                try {
                    // Create Firebase Auth account
                    const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
                    const newUserId = userCredential.user.uid;
                    
                    console.log("✅ Firebase Auth account created with UID:", newUserId);
                    
                    // Update the existing document with the new Firebase Auth UID and remove auth creation flags
                    await window.updateDoc(window.doc(window.db, 'users', userDoc.id), {
                        needsAuthCreation: false,
                        password: window.deleteField() // Remove password from document
                    });
                    
                    console.log("✅ Existing Firestore document updated with auth flags removed");
                    
                    // Now sign in with the new account
                    await window.signInWithEmailAndPassword(window.auth, email, password);
                    
                    console.log("✅ Successfully signed in with new Firebase Auth account");
                    
                } catch (authError) {
                    console.error("❌ Firebase Auth creation failed:", authError);
                    
                    // Provide more specific error messages
                    if (authError.code === 'auth/invalid-email') {
                        throw new Error('Invalid email format. Please use a valid email address (e.g., user@example.com).');
                    } else if (authError.code === 'auth/email-already-in-use') {
                        throw new Error('This email is already registered. Try logging in normally.');
                    } else if (authError.code === 'auth/weak-password') {
                        throw new Error('Password is too weak. Please use a stronger password.');
                    } else {
                        throw new Error(`Failed to create Firebase Auth account: ${authError.message}`);
                    }
                }
                
            } else if (userData.password === password) {
                // Account exists but password matches - this shouldn't happen if needsAuthCreation is true
                console.log("⚠️ Account exists but needsAuthCreation is false");
                throw new Error('Account already has Firebase Auth. Try logging in normally.');
            } else {
                console.log("❌ Password mismatch");
                throw new Error('Invalid password');
            }
            
        } catch (error) {
            console.error("❌ handleAdminCreatedAccount error:", error);
            throw error;
        }
    }
    
    // Email validation helper method
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    async handleLogout() {
        try {
            await window.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    setLoginLoading(loading) {
        const loginButton = document.getElementById('loginButton');
        const loginButtonText = document.getElementById('loginButtonText');
        const loginSpinner = document.getElementById('loginSpinner');
        
        if (loginButton) loginButton.disabled = loading;
        if (loginButtonText) loginButtonText.style.display = loading ? 'none' : 'block';
        if (loginSpinner) loginSpinner.style.display = loading ? 'block' : 'none';
    }
    
    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }
    
    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            default:
                return 'Login failed. Please check your credentials.';
        }
    }
    
    async loadUserStats() {
        if (!this.user || !window.db) return;
        
        try {
            // First try to find by Firebase Auth UID
            let userDocRef = window.doc(window.db, 'users', this.user.uid);
            let userDoc = await window.getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                // If not found by UID, search by email (for admin-created accounts)
                console.log("🔍 User document not found by UID, searching by email...");
                const usersRef = window.collection(window.db, 'users');
                const q = window.query(usersRef, window.where('email', '==', this.user.email));
                const querySnapshot = await window.getDocs(q);
                
                if (!querySnapshot.empty) {
                    userDoc = querySnapshot.docs[0];
                    console.log("✅ User document found by email:", userDoc.id);
                }
            }
            
            if (userDoc && userDoc.exists()) {
                this.userStats = userDoc.data();
                console.log("✅ User stats loaded:", this.userStats);
                
                // Update last login timestamp
                await this.updateLastLogin();
            } else {
                // User document doesn't exist - this shouldn't happen if created via admin dashboard
                console.warn("⚠️ User document not found for:", this.user.email);
                this.userStats = {
                    email: this.user.email,
                    name: 'Player', // Default name
                    level: 1,
                    points: 0,
                    experience: 0,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                await this.saveUserStats();
                console.log("✅ Created default user stats");
            }
            
            this.game.ui.updateUserStats(this.userStats);
            
            // Load player's quests after loading user stats
            await this.loadPlayerQuests();
        } catch (error) {
            console.error('❌ Error loading user stats:', error);
        }
    }
    
    async loadPlayerQuests() {
        if (!this.user || !window.db) return;
        
        try {
            console.log("📋 Loading player quests...");
            
            // Get all active quests
            const questsRef = window.collection(window.db, 'quests');
            const q = window.query(questsRef, window.where('status', '==', 'active'));
            const querySnapshot = await window.getDocs(q);
            
            const allQuests = [];
            querySnapshot.forEach((doc) => {
                allQuests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Filter quests assigned to this player or to all players
            const playerQuests = [];
            
            for (const quest of allQuests) {
                let shouldInclude = false;
                
                if (!quest.assignedPlayer || quest.assignedPlayer.trim() === '') {
                    // Quest is assigned to all players
                    shouldInclude = true;
                } else {
                    // Quest is assigned to a specific player
                    // Try multiple matching methods
                    
                    // 1. Direct match with Firebase Auth UID
                    if (quest.assignedPlayer === this.user.uid) {
                        shouldInclude = true;
                    }
                    
                    // 2. Direct match with email
                    if (quest.assignedPlayer === this.user.email) {
                        shouldInclude = true;
                    }
                    
                    // 3. Check if assignedPlayer is a Firestore document ID that belongs to us
                    if (!shouldInclude) {
                        try {
                            const userDocRef = window.doc(window.db, 'users', quest.assignedPlayer);
                            const userDoc = await window.getDoc(userDocRef);
                            
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                // Check if this document belongs to the current user
                                if (userData.email === this.user.email || userData.uid === this.user.uid) {
                                    shouldInclude = true;
                                }
                            }
                        } catch (error) {
                            console.log('Could not check user document for quest assignment:', error);
                        }
                    }
                }
                
                if (shouldInclude) {
                    playerQuests.push(quest);
                }
            }
            
            console.log(`📋 Found ${playerQuests.length} quests for player`);
            console.log('📋 Quest details:', playerQuests.map(q => ({ 
                name: q.name, 
                assignedPlayer: q.assignedPlayer,
                status: q.status 
            })));
            
            // Update UI with player's quests
            this.game.ui.updatePlayerQuests(playerQuests);
            
        } catch (error) {
            console.error('❌ Error loading player quests:', error);
        }
    }
    
    async saveUserStats() {
        if (!this.user || !this.userStats || !window.db) return;
        
        try {
            // First try to save using Firebase Auth UID
            let userDocRef = window.doc(window.db, 'users', this.user.uid);
            let userDoc = await window.getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                // If document doesn't exist with UID, find by email
                console.log("🔍 Document not found by UID, searching by email for save...");
                const usersRef = window.collection(window.db, 'users');
                const q = window.query(usersRef, window.where('email', '==', this.user.email));
                const querySnapshot = await window.getDocs(q);
                
                if (!querySnapshot.empty) {
                    const existingDoc = querySnapshot.docs[0];
                    userDocRef = window.doc(window.db, 'users', existingDoc.id);
                    console.log("✅ Found existing document for save:", existingDoc.id);
                }
            }
            
            await window.setDoc(userDocRef, this.userStats);
            console.log("💾 User stats saved to database:", this.userStats);
        } catch (error) {
            console.error('❌ Error saving user stats:', error);
        }
    }
    
    // Method to update specific stats and save to database
    async updateStats(updates) {
        if (!this.userStats) return;
        
        // Update the stats
        Object.assign(this.userStats, updates);
        
        // Update UI immediately
        this.game.ui.updateUserStats(this.userStats);
        
        // Save to database
        await this.saveUserStats();
        
        console.log("📊 Stats updated:", updates);
    }
    
    // Method to update last login timestamp
    async updateLastLogin() {
        if (!this.user || !this.userStats || !window.db) return;
        
        try {
            // Update last login timestamp
            this.userStats.lastLogin = new Date().toISOString();
            
            // Save to database
            await this.saveUserStats();
            
            console.log("🕒 Last login updated:", this.userStats.lastLogin);
        } catch (error) {
            console.error('❌ Error updating last login:', error);
        }
    }
    
    
    
    // Method to refresh user stats from Firestore
    async refreshUserStats() {
        if (!this.user || !window.db) return;
        
        try {
            const userDocRef = window.doc(window.db, 'users', this.user.uid);
            const userDoc = await window.getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const freshStats = userDoc.data();
                this.userStats = freshStats;
                this.game.ui.updateUserStats(this.userStats);
                console.log("🔄 User stats refreshed from Firestore");
            }
            
            // Also refresh quests
            await this.loadPlayerQuests();
        } catch (error) {
            console.error('❌ Error refreshing user stats:', error);
        }
    }
    
    // Format quest time remaining
    formatQuestTimeRemaining(endTime) {
        const end = new Date(endTime);
        const now = new Date();
        const timeLeft = end - now;
        
        if (timeLeft <= 0) {
            return { text: 'Expired', class: 'expired' };
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        let text;
        if (hours > 0) {
            text = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            text = `${minutes}m ${seconds}s`;
        } else {
            text = `${seconds}s`;
        }
        
        let className = 'active';
        if (timeLeft < 60000) { // Less than 1 minute
            className = 'ending';
        } else if (timeLeft < 3600000) { // Less than 1 hour
            className = 'ending';
        }
        
        return { text, class: className };
    }
    
    
    // Method to handle external stat updates (from admin dashboard)
    handleExternalStatUpdate(updatedStats) {
        console.log("🔄 External stat update received:", updatedStats);
        
        // Update local stats
        this.userStats = { ...this.userStats, ...updatedStats };
        
        // Update UI immediately
        this.game.ui.updateUserStats(this.userStats);
        
        // Show notification of external update
        this.showStatUpdateNotification();
    }
    
    setupRealTimeUpdates() {
        console.log('🔄 Setting up real-time stat updates...');
        
        // Listen for custom events from admin dashboard
        window.addEventListener('playerStatsUpdated', (event) => {
            const { playerId, stats } = event.detail;
            console.log('📡 Received real-time stat update:', { playerId, stats });
            
            // Check if this update is for the current user
            if (this.user && (this.user.uid === playerId || this.user.email === playerId)) {
                this.handleExternalStatUpdate(stats);
            }
        });
        
        // Check localStorage for stat updates (fallback method)
        const checkForStatUpdates = () => {
            try {
                const statUpdateData = localStorage.getItem('playerStatUpdate');
                if (statUpdateData) {
                    const statUpdate = JSON.parse(statUpdateData);
                    const { playerId, stats, timestamp } = statUpdate;
                    
                    // Check if this update is recent (within last 30 seconds) and for current user
                    const isRecent = (Date.now() - timestamp) < 30000;
                    const isForCurrentUser = this.user && (this.user.uid === playerId || this.user.email === playerId);
                    
                    if (isRecent && isForCurrentUser) {
                        console.log('📡 Received localStorage stat update:', { playerId, stats });
                        this.handleExternalStatUpdate(stats);
                        
                        // Clear the update to prevent duplicate processing
                        localStorage.removeItem('playerStatUpdate');
                    }
                }
            } catch (error) {
                console.error('Error checking localStorage for stat updates:', error);
            }
        };
        
        // Check for updates every 2 seconds
        setInterval(checkForStatUpdates, 2000);
        
        // Also check immediately
        checkForStatUpdates();
        
        console.log('✅ Real-time stat updates configured');
    }
    
    // Show notification when stats are updated externally
    showStatUpdateNotification() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            font-weight: 600;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">📊</span>
                <div>
                    <div style="font-weight: 700; margin-bottom: 2px;">Stats Updated!</div>
                    <div style="font-size: 12px; opacity: 0.9;">Your progress has been updated</div>
                </div>
            </div>
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }, 4000);
    }
    
    // Debug method to check what's in Firestore (call from browser console)
    async debugFirestoreUsers() {
        console.log("🔍 Debugging Firestore users collection...");
        
        try {
            const usersRef = window.collection(window.db, 'users');
            const querySnapshot = await window.getDocs(usersRef);
            
            console.log("📊 Total users in Firestore:", querySnapshot.size);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log(`👤 User ID: ${doc.id}`);
                console.log(`   Email: ${data.email}`);
                console.log(`   Name: ${data.name}`);
                console.log(`   needsAuthCreation: ${data.needsAuthCreation}`);
                console.log(`   Has Password: ${!!data.password}`);
                console.log(`   Created: ${data.createdAt}`);
                console.log("---");
            });
            
        } catch (error) {
            console.error("❌ Debug error:", error);
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new AdventureGame();
    
    // Make debug method available globally
    window.debugFirestoreUsers = () => {
        if (window.game && window.game.auth) {
            return window.game.auth.debugFirestoreUsers();
        } else {
            console.log("❌ Game not initialized yet");
        }
    };
    
    // Make updateStats method available globally for manual stat updates
    window.updatePlayerStats = (updates) => {
        if (window.game && window.game.auth) {
            return window.game.auth.updateStats(updates);
        } else {
            console.log("❌ Game not initialized yet");
        }
    };
});