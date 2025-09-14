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
        // Call immediately if user is already set
        if (this.user !== null) {
            callback(this.user);
        }
    }

    /**
     * Notify all auth state listeners
     */
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    /**
     * Handle user login
     */
    async login(email, password) {
        try {
            const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    /**
     * Handle user logout
     */
    async logout() {
        try {
            await window.auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user-friendly error messages
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
     * Get user ID
     */
    getUserId() {
        return this.user ? this.user.uid : null;
    }

    /**
     * Get user email
     */
    getUserEmail() {
        return this.user ? this.user.email : null;
    }
}

// Export for use in other modules
window.AuthManager = AuthManager;
