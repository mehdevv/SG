/**
 * UI Module
 * Handles all user interface elements including login, loading, and user stats
 */
class UIManager {
    constructor(authManager, userStatsManager) {
        this.authManager = authManager;
        this.userStatsManager = userStatsManager;
        
        // UI Elements
        this.loginScreen = null;
        this.loadingScreen = null;
        this.gameContainer = null;
        this.userStats = null;
        
        // Login form elements
        this.loginForm = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.loginButton = null;
        this.loginButtonText = null;
        this.loginSpinner = null;
        this.loginError = null;
        
        // Loading elements
        this.loadingText = null;
        this.loadingProgress = null;
        
        // User stats elements
        this.userName = null;
        this.userLevel = null;
        this.userPoints = null;
        this.userExp = null;
        this.gamesPlayed = null;
        this.logoutButton = null;
    }

    /**
     * Initialize UI manager
     */
    async initialize() {
        this.getUIElements();
        this.setupEventListeners();
        this.setupStatsListeners();
    }

    /**
     * Get all UI elements
     */
    getUIElements() {
        // Main containers
        this.loginScreen = document.getElementById('loginScreen');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.gameContainer = document.getElementById('gameContainer');
        this.userStats = document.getElementById('userStats');
        
        // Debug: Check if elements are found
        console.log('UI Elements found:', {
            loginScreen: !!this.loginScreen,
            loadingScreen: !!this.loadingScreen,
            gameContainer: !!this.gameContainer,
            userStats: !!this.userStats
        });
        
        // Login form elements
        this.loginForm = document.getElementById('loginForm');
        this.emailInput = document.getElementById('emailInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.loginButton = document.getElementById('loginButton');
        this.loginButtonText = document.getElementById('loginButtonText');
        this.loginSpinner = document.getElementById('loginSpinner');
        this.loginError = document.getElementById('loginError');
        
        // Loading elements
        this.loadingText = document.getElementById('loadingText');
        this.loadingProgress = document.getElementById('loadingProgress');
        
        // User stats elements
        this.userName = document.getElementById('userName');
        this.userLevel = document.getElementById('userLevel');
        this.userPoints = document.getElementById('userPoints');
        this.userExp = document.getElementById('userExp');
        this.gamesPlayed = document.getElementById('gamesPlayed');
        this.logoutButton = document.getElementById('logoutButton');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login form
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Logout button
        if (this.logoutButton) {
            this.logoutButton.addEventListener('click', () => this.handleLogout());
        }
    }

    /**
     * Setup user stats listeners
     */
    setupStatsListeners() {
        this.userStatsManager.onStatsUpdate((stats) => {
            this.updateUserStatsDisplay(stats);
        });
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        if (this.loginScreen) {
            this.loginScreen.style.display = 'flex';
        }
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
        if (this.gameContainer) {
            this.gameContainer.style.display = 'none';
        }
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        if (this.loginScreen) {
            this.loginScreen.style.display = 'none';
        }
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
        if (this.gameContainer) {
            this.gameContainer.style.display = 'block';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(progress, message) {
        if (this.loadingText) {
            this.loadingText.textContent = message || 'Loading...';
        }
        if (this.loadingProgress) {
            this.loadingProgress.style.width = `${progress}%`;
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const email = this.emailInput?.value;
        const password = this.passwordInput?.value;
        
        if (!email || !password) {
            this.showLoginError('Please enter both email and password');
            return;
        }
        
        this.setLoginLoading(true);
        this.hideLoginError();
        
        try {
            const result = await this.authManager.login(email, password);
            
            if (result.success) {
                // Authentication state change will be handled by onAuthStateChange
                console.log('Login successful');
            } else {
                this.showLoginError(result.error);
            }
        } catch (error) {
            this.showLoginError('An unexpected error occurred');
            console.error('Login error:', error);
        } finally {
            this.setLoginLoading(false);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await this.authManager.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    /**
     * Set login button loading state
     */
    setLoginLoading(loading) {
        if (this.loginButton) {
            this.loginButton.disabled = loading;
        }
        if (this.loginButtonText) {
            this.loginButtonText.style.display = loading ? 'none' : 'block';
        }
        if (this.loginSpinner) {
            this.loginSpinner.style.display = loading ? 'block' : 'none';
        }
    }

    /**
     * Show login error
     */
    showLoginError(message) {
        if (this.loginError) {
            this.loginError.textContent = message;
            this.loginError.style.display = 'block';
        }
        // Also show as bottom notification for better visibility
        this.showBottomNotification(message, 'error', 4000);
    }
    
    /**
     * Show notification at the bottom of the screen
     * @param {string} message - The notification message
     * @param {string} type - The notification type (success, error, info, warning)
     * @param {number} duration - How long to show the notification (default: 3000ms)
     */
    showBottomNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notifications to prevent stacking
        const existingNotifications = document.querySelectorAll('.bottom-notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'bottom-notification';
        
        // Set colors based on type
        let backgroundColor, textColor, icon;
        switch (type) {
            case 'success':
                backgroundColor = 'rgba(52, 199, 89, 0.9)';
                textColor = 'white';
                icon = '✅';
                break;
            case 'error':
                backgroundColor = 'rgba(255, 59, 48, 0.9)';
                textColor = 'white';
                icon = '❌';
                break;
            case 'warning':
                backgroundColor = 'rgba(255, 149, 0, 0.9)';
                textColor = 'white';
                icon = '⚠️';
                break;
            case 'info':
            default:
                backgroundColor = 'rgba(0, 122, 255, 0.9)';
                textColor = 'white';
                icon = 'ℹ️';
                break;
        }
        
        // Apply styles
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${backgroundColor};
            color: ${textColor};
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 90vw;
            text-align: center;
            animation: slideUpIn 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Set content
        notification.innerHTML = `${icon} ${message}`;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Add CSS animation if not already added
        if (!document.getElementById('bottom-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'bottom-notification-styles';
            style.textContent = `
                @keyframes slideUpIn {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                @keyframes slideDownOut {
                    from {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideDownOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }

    /**
     * Hide login error
     */
    hideLoginError() {
        if (this.loginError) {
            this.loginError.style.display = 'none';
        }
    }

    /**
     * Update user stats display
     */
    updateUserStatsDisplay(stats) {
        if (!stats) return;
        
        if (this.userName) {
            this.userName.textContent = this.userStatsManager.getDisplayName();
        }
        if (this.userLevel) {
            this.userLevel.textContent = stats.level;
        }
        if (this.userPoints) {
            this.userPoints.textContent = stats.points;
        }
        if (this.userExp) {
            const expNeeded = this.userStatsManager.getExperienceNeeded();
            this.userExp.textContent = `${stats.experience}/${expNeeded}`;
        }
        if (this.gamesPlayed) {
            this.gamesPlayed.textContent = stats.gamesPlayed;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create a temporary error overlay
        const errorOverlay = document.createElement('div');
        errorOverlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        errorOverlay.textContent = message;
        
        document.body.appendChild(errorOverlay);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (errorOverlay.parentNode) {
                errorOverlay.parentNode.removeChild(errorOverlay);
            }
        }, 3000);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Create a temporary success overlay
        const successOverlay = document.createElement('div');
        successOverlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        successOverlay.textContent = message;
        
        document.body.appendChild(successOverlay);
        
        // Remove after 2 seconds
        setTimeout(() => {
            if (successOverlay.parentNode) {
                successOverlay.parentNode.removeChild(successOverlay);
            }
        }, 2000);
    }

    /**
     * Get UI state
     */
    getState() {
        return {
            loginVisible: this.loginScreen?.style.display === 'flex',
            loadingVisible: this.loadingScreen?.style.display === 'flex',
            gameVisible: this.gameContainer?.style.display === 'block'
        };
    }
}

// Export for use in other modules
window.UIManager = UIManager;
