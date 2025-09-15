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
        
        // Stats
        this.movementCounter = 0;
        this.pointsThreshold = 100;
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
            
            // Award points for movement
            this.movementCounter++;
            if (this.movementCounter >= this.pointsThreshold) {
                this.game.auth.addPoints(1);
                this.movementCounter = 0;
            }
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
            gamesPlayed: document.getElementById('gamesPlayed')
        };
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
        
        if (this.elements.userName) this.elements.userName.textContent = stats.email.split('@')[0];
        if (this.elements.userLevel) this.elements.userLevel.textContent = stats.level;
        if (this.elements.userPoints) this.elements.userPoints.textContent = stats.points;
        if (this.elements.userExp) {
            const expNeeded = stats.level * 100;
            this.elements.userExp.textContent = `${stats.experience}/${expNeeded}`;
        }
        if (this.elements.gamesPlayed) this.elements.gamesPlayed.textContent = stats.gamesPlayed;
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
            const result = await window.signInWithEmailAndPassword(window.auth, email, password);
            console.log("✅ Login successful:", result.user.email);
            // Don't set loading to false here - let the auth state change handle it
        } catch (error) {
            console.error("❌ Login failed:", error);
            this.showLoginError(this.getErrorMessage(error.code));
            this.setLoginLoading(false);
        }
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
            const userDocRef = window.doc(window.db, 'users', this.user.uid);
            const userDoc = await window.getDoc(userDocRef);
            
            if (userDoc.exists()) {
                this.userStats = userDoc.data();
            } else {
                this.userStats = {
                    email: this.user.email,
                    level: 1,
                    points: 0,
                    experience: 0,
                    gamesPlayed: 0,
                    totalPlayTime: 0,
                    lastLogin: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                };
                await this.saveUserStats();
            }
            
            this.game.ui.updateUserStats(this.userStats);
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }
    
    async saveUserStats() {
        if (!this.user || !this.userStats || !window.db) return;
        
        try {
            const userDocRef = window.doc(window.db, 'users', this.user.uid);
            await window.setDoc(userDocRef, this.userStats);
        } catch (error) {
            console.error('Error saving user stats:', error);
        }
    }
    
    async addPoints(points) {
        if (!this.userStats) return;
        
        this.userStats.points += points;
        this.userStats.experience += points;
        
        // Check for level up
        const expNeeded = this.userStats.level * 100;
        if (this.userStats.experience >= expNeeded) {
            this.userStats.level++;
            this.userStats.experience -= expNeeded;
            console.log(`🎉 Level up! New level: ${this.userStats.level}`);
        }
        
        this.game.ui.updateUserStats(this.userStats);
        await this.saveUserStats();
    }
    
    async incrementGamesPlayed() {
        if (!this.userStats) return;
        
        this.userStats.gamesPlayed++;
        this.userStats.lastLogin = new Date().toISOString();
        
        this.game.ui.updateUserStats(this.userStats);
        await this.saveUserStats();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new AdventureGame();
});