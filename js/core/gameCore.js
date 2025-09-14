/**
 * Core Game Module
 * Handles game initialization, main loop, asset loading, and core game mechanics
 */
class GameCore {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameReady = false;
        this.isRunning = false;
        
        // Asset management
        this.assets = {
            worldMap: null,
            playerSprite: null,
            wallsData: null
        };
        
        // Loading system
        this.totalAssets = 3;
        this.loadedAssets = 0;
        
        // Game modules
        this.player = null;
        this.camera = null;
        this.collision = null;
        this.ui = null;
        this.authManager = null;
        this.userStatsManager = null;
        
        // Game state
        this.lastTime = 0;
        this.deltaTime = 0;
    }

    /**
     * Initialize the game
     */
    async initialize() {
        console.log('Initializing GameCore...');
        
        // Setup canvas
        this.setupCanvas();
        console.log('Canvas setup complete');
        
        // Initialize modules
        await this.initializeModules();
        console.log('Modules initialized');
        
        // Setup event listeners
        this.setupEventListeners();
        console.log('Event listeners setup');
        
        // Start game loop
        this.startGameLoop();
        console.log('Game loop started');
        
        console.log('GameCore initialized successfully');
    }

    /**
     * Setup canvas and context
     */
    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Game canvas not found');
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            if (this.camera) {
                this.camera.initialize(this.canvas.width, this.canvas.height);
            }
        });
    }

    /**
     * Initialize all game modules
     */
    async initializeModules() {
        // Initialize authentication
        this.authManager = new AuthManager();
        await this.authManager.initialize();
        
        // Initialize user stats
        this.userStatsManager = new UserStatsManager(this.authManager);
        await this.userStatsManager.initialize();
        
        // Initialize UI
        this.ui = new UIManager(this.authManager, this.userStatsManager);
        await this.ui.initialize();
        
        // Initialize player
        this.player = new Player();
        
        // Initialize camera
        this.camera = new Camera();
        this.camera.initialize(this.canvas.width, this.canvas.height);
        
        // Set initial camera position to player position
        this.camera.setPosition(this.player.x, this.player.y);
        
        // Initialize collision system
        this.collision = new CollisionManager();
        
        // Setup authentication flow
        this.setupAuthenticationFlow();
    }

    /**
     * Setup authentication flow
     */
    setupAuthenticationFlow() {
        this.authManager.onAuthStateChange((user) => {
            if (user) {
                console.log('User authenticated:', user.email);
                this.ui.showLoadingScreen();
                this.loadAssets();
            } else {
                console.log('User not authenticated');
                this.ui.showLoginScreen();
                this.gameReady = false;
            }
        });
        
        // Check if user is already authenticated
        if (this.authManager.isAuthenticated()) {
            console.log('User already authenticated, showing loading screen');
            this.ui.showLoadingScreen();
            this.loadAssets();
        } else {
            console.log('No user authenticated, showing login screen');
            this.ui.showLoginScreen();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    /**
     * Load all game assets
     */
    async loadAssets() {
        try {
            await Promise.all([
                this.loadWorldMap(),
                this.loadPlayerSprite(),
                this.loadWallsData()
            ]);
            
            this.ui.hideLoadingScreen();
            this.gameReady = true;
            this.userStatsManager.incrementGamesPlayed();
        } catch (error) {
            console.error('Error loading assets:', error);
            this.ui.showError('Failed to load game assets');
        }
    }

    /**
     * Load world map sprite
     */
    async loadWorldMap() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets.worldMap = img;
                this.updateLoadingProgress('World map loaded');
                resolve();
            };
            img.onerror = () => reject(new Error('Failed to load world map'));
            img.src = 'worldmap.png';
        });
    }

    /**
     * Load player sprite sheet
     */
    async loadPlayerSprite() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets.playerSprite = img;
                this.updateLoadingProgress('Player sprite loaded');
                resolve();
            };
            img.onerror = () => reject(new Error('Failed to load player sprite'));
            img.src = 'assets/player sprite sheet.png';
        });
    }

    /**
     * Load walls collision data
     */
    async loadWallsData() {
        try {
            const response = await fetch('walls.tmj');
            const data = await response.json();
            
        this.assets.wallsData = data;
        if (this.collision) {
            this.collision.setWallsData(data);
        }
        
        // Set camera bounds based on map size
        if (this.camera && data.width && data.height) {
            const mapWidth = data.width * (data.tilewidth || 32);
            const mapHeight = data.height * (data.tileheight || 32);
            this.camera.setBounds(0, 0, mapWidth, mapHeight);
        }
            
            this.updateLoadingProgress('Collision data loaded');
        } catch (error) {
            throw new Error('Failed to load walls data');
        }
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(message) {
        this.loadedAssets++;
        const progress = (this.loadedAssets / this.totalAssets) * 100;
        this.ui.updateLoadingProgress(progress, message);
    }

    /**
     * Start the game loop
     */
    startGameLoop() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    /**
     * Main game loop
     */
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update game state
        this.update();
        
        // Render game
        this.render();
        
        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Update game state
     */
    update() {
        if (!this.gameReady) return;
        
        // Update player
        this.player.update(this.deltaTime);
        
        // Update camera
        this.camera.update(this.player);
        
        // Handle movement and collisions
        this.handleMovement();
    }

    /**
     * Render the game
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.gameReady) return;
        
        // Save context state
        this.ctx.save();
        
        // Apply camera transform
        this.camera.applyTransform(this.ctx);
        
        // Render world map
        this.renderWorldMap();
        
        // Render player
        if (this.player && this.assets.playerSprite) {
            this.player.render(this.ctx, this.assets.playerSprite);
        } else {
            console.log('Player or sprite not available:', {
                player: !!this.player,
                sprite: !!this.assets.playerSprite
            });
        }
        
        // Restore context state
        this.ctx.restore();
    }

    /**
     * Render world map
     */
    renderWorldMap() {
        if (this.assets.worldMap) {
            this.ctx.drawImage(
                this.assets.worldMap,
                0, 0,
                this.assets.worldMap.width,
                this.assets.worldMap.height
            );
        }
    }

    /**
     * Handle player movement
     */
    handleMovement() {
        if (!this.gameReady) return;
        
        const input = this.getMovementInput();
        
        if (input.x !== 0 || input.y !== 0) {
            this.player.setMovement(input.x, input.y);
            
            // Check for movement-based points
            this.player.incrementMovementCounter();
            if (this.player.shouldAwardPoints()) {
                this.userStatsManager.addPoints(1);
                this.player.resetMovementCounter();
            }
        } else {
            this.player.setMovement(0, 0);
        }
    }

    /**
     * Get movement input from various sources
     */
    getMovementInput() {
        let x = 0, y = 0;
        
        // Keyboard input
        if (this.player.keys['w'] || this.player.keys['ArrowUp']) y = -1;
        if (this.player.keys['s'] || this.player.keys['ArrowDown']) y = 1;
        if (this.player.keys['a'] || this.player.keys['ArrowLeft']) x = -1;
        if (this.player.keys['d'] || this.player.keys['ArrowRight']) x = 1;
        
        // Joystick input
        if (this.player.joystickActive) {
            const joystickInput = this.player.getJoystickInput();
            x = joystickInput.x;
            y = joystickInput.y;
        }
        
        return { x, y };
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        if (!this.gameReady) return;
        this.player.keys[e.key.toLowerCase()] = true;
    }

    handleKeyUp(e) {
        if (!this.gameReady) return;
        this.player.keys[e.key.toLowerCase()] = false;
    }

    /**
     * Handle mouse events
     */
    handleMouseDown(e) {
        if (!this.gameReady) return;
        this.player.handleMouseDown(e);
    }

    handleMouseMove(e) {
        if (!this.gameReady) return;
        this.player.handleMouseMove(e);
    }

    handleMouseUp(e) {
        if (!this.gameReady) return;
        this.player.handleMouseUp(e);
    }

    /**
     * Handle touch events
     */
    handleTouchStart(e) {
        if (!this.gameReady) return;
        e.preventDefault();
        this.player.handleTouchStart(e);
    }

    handleTouchMove(e) {
        if (!this.gameReady) return;
        e.preventDefault();
        this.player.handleTouchMove(e);
    }

    handleTouchEnd(e) {
        if (!this.gameReady) return;
        e.preventDefault();
        this.player.handleTouchEnd(e);
    }

    /**
     * Stop the game
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Get game state
     */
    getGameState() {
        return {
            ready: this.gameReady,
            running: this.isRunning,
            assetsLoaded: this.loadedAssets,
            totalAssets: this.totalAssets
        };
    }
}

// Export for use in main.js
window.GameCore = GameCore;
