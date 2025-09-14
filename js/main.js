/**
 * Main Game Entry Point
 * Initializes and starts the game
 */

// Global game instance
let game = null;

/**
 * Initialize the game when the page loads
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing game...');
        
        // Create and initialize the game
        game = new GameCore();
        window.gameCore = game; // Make globally accessible for debugging
        
        await game.initialize();
        
        console.log('Game initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showInitializationError(error);
    }
});

/**
 * Show initialization error
 */
function showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a1a;
        color: #ff4444;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-family: Arial, sans-serif;
        z-index: 10000;
    `;
    
    errorDiv.innerHTML = `
        <h1>Game Initialization Failed</h1>
        <p>Error: ${error.message}</p>
        <p>Please check the console for more details.</p>
        <button onclick="location.reload()" style="
            padding: 10px 20px;
            background: #444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 20px;
        ">Reload Game</button>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Handle window resize
 */
window.addEventListener('resize', () => {
    if (game && game.canvas) {
        game.canvas.width = window.innerWidth;
        game.canvas.height = window.innerHeight;
        if (game.camera) {
            game.camera.initialize(game.canvas.width, game.canvas.height);
        }
    }
});

/**
 * Handle page visibility change (pause/resume game)
 */
document.addEventListener('visibilitychange', () => {
    if (game) {
        if (document.hidden) {
            // Page is hidden, could pause game here
            console.log('Game paused (page hidden)');
        } else {
            // Page is visible, resume game
            console.log('Game resumed (page visible)');
        }
    }
});

/**
 * Handle page unload (cleanup)
 */
window.addEventListener('beforeunload', () => {
    if (game) {
        game.stop();
        console.log('Game stopped');
    }
});

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (game && game.ui) {
        game.ui.showError('An unexpected error occurred. Please refresh the page.');
    }
});

/**
 * Global unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (game && game.ui) {
        game.ui.showError('An unexpected error occurred. Please refresh the page.');
    }
});

// Export game instance for debugging
window.game = game;
