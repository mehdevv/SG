/**
 * User Stats Module
 * Handles user statistics, leveling system, and Firestore data management
 */
class UserStatsManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.userStats = null;
        this.statsUpdateListeners = [];
    }

    /**
     * Initialize user stats system
     */
    async initialize() {
        // Listen for authentication changes
        this.authManager.onAuthStateChange((user) => {
            if (user) {
                this.loadUserStats();
            } else {
                this.userStats = null;
                this.notifyStatsUpdateListeners(null);
            }
        });
    }

    /**
     * Add stats update listener
     */
    onStatsUpdate(callback) {
        this.statsUpdateListeners.push(callback);
        // Call immediately if stats are already loaded
        if (this.userStats !== null) {
            callback(this.userStats);
        }
    }

    /**
     * Notify all stats update listeners
     */
    notifyStatsUpdateListeners(stats) {
        this.statsUpdateListeners.forEach(callback => {
            try {
                callback(stats);
            } catch (error) {
                console.error('Error in stats update listener:', error);
            }
        });
    }

    /**
     * Load user stats from Firestore
     */
    async loadUserStats() {
        if (!this.authManager.isAuthenticated() || !window.db) return;
        
        try {
            const userDocRef = window.doc(window.db, 'users', this.authManager.getUserId());
            const userDoc = await window.getDoc(userDocRef);
            
            if (userDoc.exists()) {
                this.userStats = userDoc.data();
                console.log('User stats loaded:', this.userStats);
            } else {
                // Create new user stats if they don't exist
                this.userStats = this.createDefaultUserStats();
                await this.saveUserStats();
                console.log('New user stats created');
            }
            
            this.notifyStatsUpdateListeners(this.userStats);
        } catch (error) {
            console.error('Error loading user stats:', error);
            // Create default stats as fallback
            this.userStats = this.createDefaultUserStats();
            this.notifyStatsUpdateListeners(this.userStats);
        }
    }

    /**
     * Create default user stats for new users
     */
    createDefaultUserStats() {
        return {
            email: this.authManager.getUserEmail(),
            level: 1,
            points: 0,
            experience: 0,
            gamesPlayed: 0,
            totalPlayTime: 0,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Save user stats to Firestore
     */
    async saveUserStats() {
        if (!this.authManager.isAuthenticated() || !this.userStats || !window.db) return;
        
        try {
            const userDocRef = window.doc(window.db, 'users', this.authManager.getUserId());
            await window.setDoc(userDocRef, this.userStats);
            console.log('User stats saved');
        } catch (error) {
            console.error('Error saving user stats:', error);
        }
    }

    /**
     * Add points to user
     */
    async addPoints(points) {
        if (!this.userStats) return;
        
        this.userStats.points += points;
        this.userStats.experience += points;
        
        // Check for level up
        const expNeeded = this.userStats.level * 100;
        if (this.userStats.experience >= expNeeded) {
            this.userStats.level++;
            this.userStats.experience -= expNeeded;
            console.log(`Level up! New level: ${this.userStats.level}`);
            // You can add level up effects here
        }
        
        this.notifyStatsUpdateListeners(this.userStats);
        await this.saveUserStats();
    }

    /**
     * Increment games played counter
     */
    async incrementGamesPlayed() {
        if (!this.userStats) return;
        
        this.userStats.gamesPlayed++;
        this.userStats.lastLogin = new Date().toISOString();
        
        this.notifyStatsUpdateListeners(this.userStats);
        await this.saveUserStats();
    }

    /**
     * Add play time
     */
    async addPlayTime(seconds) {
        if (!this.userStats) return;
        
        this.userStats.totalPlayTime += seconds;
        await this.saveUserStats();
    }

    /**
     * Get current user stats
     */
    getStats() {
        return this.userStats;
    }

    /**
     * Get specific stat value
     */
    getStat(statName) {
        return this.userStats ? this.userStats[statName] : 0;
    }

    /**
     * Get experience needed for next level
     */
    getExperienceNeeded() {
        if (!this.userStats) return 0;
        return this.userStats.level * 100;
    }

    /**
     * Get experience progress (0-1)
     */
    getExperienceProgress() {
        if (!this.userStats) return 0;
        const expNeeded = this.getExperienceNeeded();
        return expNeeded > 0 ? this.userStats.experience / expNeeded : 0;
    }

    /**
     * Check if user can level up
     */
    canLevelUp() {
        if (!this.userStats) return false;
        return this.userStats.experience >= this.getExperienceNeeded();
    }

    /**
     * Get user display name (email without domain)
     */
    getDisplayName() {
        if (!this.userStats) return 'Guest';
        return this.userStats.email.split('@')[0];
    }
}

// Export for use in other modules
window.UserStatsManager = UserStatsManager;
