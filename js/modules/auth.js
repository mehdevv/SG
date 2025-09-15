/**
 * Authentication Module
 * Handles Firebase authentication, login/logout, and user session management
 */
class AuthManager {
    constructor() {
        this.user = null;
        this.authStateListeners = [];
        this.isInitialized = false;
    }

    /**
     * Initialize Firebase authentication
     */
    async initialize() {
        if (this.isInitialized) return;
        
        // Wait for Firebase to be available
        await this.waitForFirebase();
        
        // Check if user is already logged in
        const currentUser = window.auth.currentUser;
        if (currentUser) {
            console.log("✅ User already logged in:", currentUser.email);
            this.user = currentUser;
            this.notifyAuthStateListeners(currentUser);
        }
        
        // Listen for authentication state changes
        window.onAuthStateChanged(window.auth, (user) => {
            this.user = user;
            this.notifyAuthStateListeners(user);
        });
        
        this.isInitialized = true;
        console.log('AuthManager initialized');
    }

    /**
     * Wait for Firebase to be available
     */
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.auth && window.onAuthStateChanged) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    /**
     * Add authentication state change listener
     */
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        if (this.user !== null) {
            callback(this.user);
        }
    }

    /**
     * Notify all authentication state listeners
     */
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }

    /**
     * Handle user login
     */
    async login(email, password) {
        try {
            const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
            console.log('✅ User logged in:', userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    /**
     * Handle user logout
     */
    async logout() {
        try {
            await window.auth.signOut();
            console.log('✅ User logged out');
        } catch (error) {
            console.error('❌ Logout failed:', error);
            throw error;
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.user !== null;
    }

    /**
     * Get user display name
     */
    getUserDisplayName() {
        if (!this.user) return null;
        return this.user.displayName || this.user.email.split('@')[0];
    }

    /**
     * Get user email
     */
    getUserEmail() {
        return this.user ? this.user.email : null;
    }

    /**
     * Get user ID
     */
    getUserId() {
        return this.user ? this.user.uid : null;
    }

    /**
     * Setup login form event listeners
     */
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('emailInput').value;
                const password = document.getElementById('passwordInput').value;
                
                if (!email || !password) {
                    this.showError('Please enter both email and password');
                    return;
                }
                
                try {
                    this.setLoading(true);
                    await this.login(email, password);
                } catch (error) {
                    this.showError(this.getErrorMessage(error.code));
                } finally {
                    this.setLoading(false);
                }
            });
        }
        
        // Setup logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await this.logout();
                } catch (error) {
                    console.error('Logout error:', error);
                }
            });
        }
    }

    /**
     * Set loading state for login form
     */
    setLoading(loading) {
        const loginButton = document.getElementById('loginButton');
        const loginButtonText = document.getElementById('loginButtonText');
        const loginSpinner = document.getElementById('loginSpinner');
        
        if (loginButton) loginButton.disabled = loading;
        if (loginButtonText) loginButtonText.style.display = loading ? 'none' : 'block';
        if (loginSpinner) loginSpinner.style.display = loading ? 'block' : 'none';
    }

    /**
     * Show error message
     */
    showError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
        }
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection.';
            default:
                return 'Login failed. Please check your credentials.';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}