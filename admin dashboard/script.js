/**
 * Admin Dashboard - Game Management System
 * Handles authentication, player management, and quest management
 */

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.players = [];
        this.quests = [];
        this.leaderboard = [];
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Admin Dashboard...');
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Setup authentication listener
        this.setupAuthListener();
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    waitForFirebase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.auth && window.db) {
                    console.log('✅ Firebase is ready');
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    setupAuthListener() {
        window.onAuthStateChanged(window.auth, async (user) => {
            if (user) {
                console.log('👤 Admin logged in:', user.email);
                this.currentUser = user;
                await this.checkAdminRole(user);
            } else {
                console.log('👋 Admin logged out');
                this.currentUser = null;
                this.showLogin();
            }
        });
    }
    
    async checkAdminRole(user) {
        try {
            const adminDoc = await window.getDoc(window.doc(window.db, 'admin_users', user.uid));
            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                console.log('✅ Admin role verified');
                this.showDashboard();
                await this.loadData();
            } else {
                console.log('❌ Not an admin user');
                this.showError('Access denied. Admin privileges required.');
                await window.signOut(window.auth);
            }
        } catch (error) {
            console.error('❌ Error checking admin role:', error);
            this.showError('Error verifying admin access.');
        }
    }
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Add buttons
        const addPlayerBtn = document.getElementById('addPlayerBtn');
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', () => this.showPlayerModal());
        }
        
        const addQuestBtn = document.getElementById('addQuestBtn');
        if (addQuestBtn) {
            addQuestBtn.addEventListener('click', () => this.showQuestModal());
        }
        
        // Modal close buttons
        const closePlayerModal = document.getElementById('closePlayerModal');
        if (closePlayerModal) {
            closePlayerModal.addEventListener('click', () => this.hidePlayerModal());
        }
        
        const closeQuestModal = document.getElementById('closeQuestModal');
        if (closeQuestModal) {
            closeQuestModal.addEventListener('click', () => this.hideQuestModal());
        }
        
        // Cancel buttons
        const cancelPlayerBtn = document.getElementById('cancelPlayerBtn');
        if (cancelPlayerBtn) {
            cancelPlayerBtn.addEventListener('click', () => this.hidePlayerModal());
        }
        
        const cancelQuestBtn = document.getElementById('cancelQuestBtn');
        if (cancelQuestBtn) {
            cancelQuestBtn.addEventListener('click', () => this.hideQuestModal());
        }
        
        // Form submissions
        const playerForm = document.getElementById('playerForm');
        if (playerForm) {
            playerForm.addEventListener('submit', (e) => this.handlePlayerSubmit(e));
        }
        
        const questForm = document.getElementById('questForm');
        if (questForm) {
            questForm.addEventListener('submit', (e) => this.handleQuestSubmit(e));
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hidePlayerModal();
                this.hideQuestModal();
            }
        });
        
        // Success notification close button
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            closeNotification.addEventListener('click', () => this.hideSuccessNotification());
        }
        
        // Emoji selection handlers
        this.setupEmojiHandlers();
        
        // Start quest timer updates
        this.startQuestTimerUpdates();
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        
        this.setLoginLoading(true);
        
        try {
            await window.signInWithEmailAndPassword(window.auth, email, password);
        } catch (error) {
            console.error('❌ Login failed:', error);
            this.showLoginError(this.getErrorMessage(error.code));
            this.setLoginLoading(false);
        }
    }
    
    async handleLogout() {
        try {
            await window.signOut(window.auth);
        } catch (error) {
            console.error('❌ Logout error:', error);
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
                return 'No admin account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            default:
                return 'Login failed. Please check your credentials.';
        }
    }
    
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }
    
    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        // Update admin name
        const adminName = document.getElementById('adminName');
        if (adminName && this.currentUser) {
            adminName.textContent = this.currentUser.email.split('@')[0];
        }
    }
    
    showError(message) {
        alert(message); // You can replace this with a better error display
    }
    
    // Email validation helper method
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Helper method to format last login date
    formatLastLogin(lastLoginDate) {
        if (!lastLoginDate) {
            return 'Never';
        }
        
        const date = new Date(lastLoginDate);
        const now = new Date();
        
        // Reset time to start of day for accurate day comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const loginDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = today - loginDay;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    // Setup emoji selection handlers
    setupEmojiHandlers() {
        const emojiOptions = document.querySelectorAll('.emoji-option');
        const questLogoInput = document.getElementById('questLogo');
        
        emojiOptions.forEach(option => {
            option.addEventListener('click', () => {
                if (questLogoInput) {
                    questLogoInput.value = option.dataset.emoji;
                }
            });
        });
    }
    
    // Start quest timer updates
    startQuestTimerUpdates() {
        // Update timers every second
        setInterval(() => {
            this.updateQuestTimers();
        }, 1000);
    }
    
    // Update quest timers
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
    
    showSuccessNotification(email, password) {
        const notification = document.getElementById('successNotification');
        const emailSpan = document.getElementById('createdEmail');
        const passwordSpan = document.getElementById('createdPassword');
        
        if (notification && emailSpan && passwordSpan) {
            emailSpan.textContent = email;
            passwordSpan.textContent = password;
            notification.classList.add('show');
        }
    }
    
    hideSuccessNotification() {
        const notification = document.getElementById('successNotification');
        if (notification) {
            notification.classList.remove('show');
        }
    }
    
    async loadData() {
        console.log('📊 Loading dashboard data...');
        
        try {
            // Load players first, then load leaderboard (which depends on players data)
            await this.loadPlayers();
            await this.loadLeaderboard();
            await this.loadQuests();
            
            console.log('✅ Dashboard data loaded');
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    async loadPlayers() {
        try {
            const playersSnapshot = await window.getDocs(window.collection(window.db, 'users'));
            this.players = [];
            
            playersSnapshot.forEach((doc) => {
                const playerData = doc.data();
                this.players.push({
                    id: doc.id,
                    ...playerData
                });
            });
            
            this.renderPlayers();
            this.updateQuestPlayerSelect();
        } catch (error) {
            console.error('❌ Error loading players:', error);
        }
    }
    
    async loadQuests() {
        try {
            const questsSnapshot = await window.getDocs(window.collection(window.db, 'quests'));
            this.quests = [];
            
            questsSnapshot.forEach((doc) => {
                const questData = doc.data();
                // Only show active quests in the main list
                if (questData.status !== 'completed') {
                    this.quests.push({
                        id: doc.id,
                        ...questData
                    });
                }
            });
            
            this.renderQuests();
        } catch (error) {
            console.error('❌ Error loading quests:', error);
        }
    }
    
    async loadLeaderboard() {
        try {
            console.log('🏆 Loading leaderboard...');
            console.log('📊 Available players:', this.players.length);
            
            // Get top 5 players by level, then by experience
            const topPlayers = this.players
                .sort((a, b) => {
                    if (b.level !== a.level) {
                        return b.level - a.level;
                    }
                    return b.experience - a.experience;
                })
                .slice(0, 5);
            
            this.leaderboard = topPlayers;
            console.log('🏆 Leaderboard loaded with', topPlayers.length, 'players');
            this.renderLeaderboard();
        } catch (error) {
            console.error('❌ Error loading leaderboard:', error);
        }
    }
    
    renderLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) {
            console.warn('⚠️ Leaderboard list element not found');
            return;
        }
        
        console.log('🎨 Rendering leaderboard with', this.leaderboard.length, 'players');
        
        if (this.leaderboard.length === 0) {
            leaderboardList.innerHTML = '<div class="empty-state"><h4>No players found</h4><p>Players will appear here once they start playing</p></div>';
            return;
        }
        
        leaderboardList.innerHTML = this.leaderboard.map((player, index) => `
            <div class="leaderboard-item rank-${index + 1}">
                <div class="player-avatar">
                    ${player.name ? player.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div class="player-info">
                    <div class="player-name">${player.name || 'Unknown Player'}</div>
                    <div class="player-level">Level ${player.level || 1}</div>
                </div>
                <div class="rank-badge">#${index + 1}</div>
            </div>
        `).join('');
        
        console.log('✅ Leaderboard rendered successfully');
    }
    
    // Method to force refresh leaderboard (for debugging)
    async refreshLeaderboard() {
        console.log('🔄 Force refreshing leaderboard...');
        await this.loadLeaderboard();
    }
    
    renderPlayers() {
        const playersList = document.getElementById('playersList');
        if (!playersList) return;
        
        if (this.players.length === 0) {
            playersList.innerHTML = '<div class="empty-state"><h4>No players found</h4><p>Players will appear here once they register</p></div>';
            return;
        }
        
        playersList.innerHTML = this.players.map(player => `
            <div class="list-item">
                <div class="item-info">
                    <div class="item-title">
                        ${player.skin ? `<img src="${player.skin}" alt="Skin" class="player-skin-preview" onerror="this.style.display='none'">` : ''}
                        ${player.name || 'Unknown Player'}
                    </div>
                    <div class="item-subtitle">${player.email} • Level ${player.level || 1} • ${player.points || 0} DZD • Last login: ${this.formatLastLogin(player.lastLogin)}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary" onclick="adminDashboard.editPlayer('${player.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminDashboard.deletePlayer('${player.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    renderQuests() {
        const questsList = document.getElementById('questsList');
        if (!questsList) return;
        
        if (this.quests.length === 0) {
            questsList.innerHTML = '<div class="empty-state"><h4>No quests found</h4><p>Create your first quest to get started</p></div>';
            return;
        }
        
        questsList.innerHTML = this.quests.map(quest => {
            const timerInfo = this.formatQuestTimeRemaining(quest.endTime);
            const assignedPlayer = quest.assignedPlayer ? 
                this.players.find(p => p.id === quest.assignedPlayer)?.name || 'Unknown Player' : 
                'All Players';
            
            return `
                <div class="quest-item">
                    <div class="quest-info">
                        <div class="quest-logo">${quest.logo || '📍'}</div>
                        <div class="quest-details">
                            <div class="quest-title">
                                ${quest.name}
                                <span class="quest-timer ${timerInfo.class}" data-end-time="${quest.endTime}">
                                    ${timerInfo.text}
                                </span>
                            </div>
                            <div class="quest-subtitle">${quest.description}</div>
                            <div class="quest-subtitle">Assigned to: ${assignedPlayer}</div>
                            <div class="quest-rewards">
                                <span class="reward-badge reward-xp">+${quest.xpReward || 0} XP</span>
                                <span class="reward-badge reward-coins">+${quest.coinsReward || 0} DZD</span>
                            </div>
                        </div>
                    </div>
                    <div class="quest-actions">
                        <button class="btn btn-success" onclick="adminDashboard.approveQuest('${quest.id}')" title="Approve quest completion and award rewards">
                            ✓ Approve
                        </button>
                           <button class="btn btn-info" onclick="adminDashboard.duplicateQuest('${quest.id}')" title="Duplicate this quest">
                               📋
                           </button>
                        <button class="btn btn-primary" onclick="adminDashboard.editQuest('${quest.id}')">Edit</button>
                        <button class="btn btn-danger" onclick="adminDashboard.deleteQuest('${quest.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateQuestPlayerSelect() {
        const questPlayerSelect = document.getElementById('questPlayer');
        if (!questPlayerSelect) return;
        
        questPlayerSelect.innerHTML = '<option value="">All Players</option>' +
            this.players.map(player => 
                `<option value="${player.id}">${player.name || player.email}</option>`
            ).join('');
    }
    
    showPlayerModal(playerId = null) {
        const modal = document.getElementById('playerModal');
        const title = document.getElementById('playerModalTitle');
        const form = document.getElementById('playerForm');
        
        if (playerId) {
            // Edit mode
            const player = this.players.find(p => p.id === playerId);
            if (player) {
                title.textContent = 'Edit Player';
                document.getElementById('playerId').value = player.id;
                document.getElementById('playerEmail').value = player.email || '';
                document.getElementById('playerPassword').value = '';
                document.getElementById('playerName').value = player.name || '';
                document.getElementById('playerSkin').value = player.skin || '';
                document.getElementById('playerCoins').value = player.points || 0;
                document.getElementById('playerLevel').value = player.level || 1;
                document.getElementById('playerXP').value = player.experience || 0;
            }
        } else {
            // Add mode
            title.textContent = 'Add Player';
            form.reset();
            document.getElementById('playerId').value = '';
        }
        
        modal.classList.add('show');
    }
    
    hidePlayerModal() {
        const modal = document.getElementById('playerModal');
        modal.classList.remove('show');
    }
    
    showQuestModal(questId = null) {
        const modal = document.getElementById('questModal');
        const title = document.getElementById('questModalTitle');
        const form = document.getElementById('questForm');
        
        if (questId) {
            // Edit mode
            const quest = this.quests.find(q => q.id === questId);
            if (quest) {
                title.textContent = 'Edit Quest';
                document.getElementById('questId').value = quest.id;
                document.getElementById('questLogo').value = quest.logo || '📍';
                document.getElementById('questName').value = quest.name || '';
                document.getElementById('questDescription').value = quest.description || '';
                document.getElementById('questXP').value = quest.xpReward || 0;
                document.getElementById('questCoins').value = quest.coinsReward || 0;
                document.getElementById('questPlayer').value = quest.assignedPlayer || '';
                document.getElementById('questEndTime').value = quest.endTime || '';
                document.getElementById('questVerificationName').value = quest.verificationName || '';
                document.getElementById('questVerificationLink').value = quest.verificationLink || '';
            }
        } else {
            // Add mode
            title.textContent = 'Add Quest';
            form.reset();
            document.getElementById('questId').value = '';
            document.getElementById('questLogo').value = '📍'; // Default emoji
            
            // Set default end time to 24 hours from now
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('questEndTime').value = tomorrow.toISOString().slice(0, 16);
        }
        
        modal.classList.add('show');
    }
    
    hideQuestModal() {
        const modal = document.getElementById('questModal');
        modal.classList.remove('show');
    }
    
    async handlePlayerSubmit(e) {
        e.preventDefault();
        
        const formData = {
            email: document.getElementById('playerEmail').value,
            password: document.getElementById('playerPassword').value,
            name: document.getElementById('playerName').value,
            skin: document.getElementById('playerSkin').value,
            points: parseInt(document.getElementById('playerCoins').value) || 0,
            level: parseInt(document.getElementById('playerLevel').value) || 1,
            experience: parseInt(document.getElementById('playerXP').value) || 0
        };
        
        // Validate email format
        if (!this.isValidEmail(formData.email)) {
            this.showError('Please enter a valid email address (e.g., user@example.com)');
            return;
        }
        
        const playerId = document.getElementById('playerId').value;
        
        try {
            if (playerId) {
                // Update existing player
                await window.updateDoc(window.doc(window.db, 'users', playerId), {
                    name: formData.name,
                    skin: formData.skin,
                    points: formData.points,
                    level: formData.level,
                    experience: formData.experience
                });
                console.log('✅ Player updated');
            } else {
                // Create new player with Firebase Auth account
                if (!formData.password) {
                    throw new Error('Password is required for new players');
                }
                
                // Create user document in Firestore with a custom UID
                // The game will handle Firebase Auth creation on first login
                const customUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                await window.setDoc(window.doc(window.db, 'users', customUserId), {
                    email: formData.email,
                    name: formData.name,
                    skin: formData.skin,
                    points: formData.points,
                    level: formData.level,
                    experience: formData.experience,
                    createdAt: new Date().toISOString(),
                    password: formData.password, // Store password for first-time auth creation
                    needsAuthCreation: true // Flag to indicate this user needs Firebase Auth account
                });
                
                console.log('✅ Player created in Firestore with custom ID:', customUserId);
                
                // Show success notification with login credentials
                this.showSuccessNotification(formData.email, formData.password);
            }
            
            this.hidePlayerModal();
            await this.loadPlayers();
            await this.loadLeaderboard();
        } catch (error) {
            console.error('❌ Error saving player:', error);
            this.showError('Failed to save player');
        }
    }
    
    async handleQuestSubmit(e) {
        e.preventDefault();
        
        const formData = {
            logo: document.getElementById('questLogo').value || '📍',
            name: document.getElementById('questName').value,
            description: document.getElementById('questDescription').value,
            xpReward: parseInt(document.getElementById('questXP').value) || 0,
            coinsReward: parseInt(document.getElementById('questCoins').value) || 0,
            assignedPlayer: document.getElementById('questPlayer').value || null,
            endTime: document.getElementById('questEndTime').value,
            verificationName: document.getElementById('questVerificationName').value,
            verificationLink: document.getElementById('questVerificationLink').value,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        const questId = document.getElementById('questId').value;
        
        try {
            if (questId) {
                // Update existing quest
                await window.updateDoc(window.doc(window.db, 'quests', questId), {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Quest updated');
            } else {
                // Create new quest
                const newQuestRef = window.doc(window.collection(window.db, 'quests'));
                await window.setDoc(newQuestRef, formData);
                console.log('✅ Quest created');
            }
            
            this.hideQuestModal();
            await this.loadQuests();
        } catch (error) {
            console.error('❌ Error saving quest:', error);
            this.showError('Failed to save quest');
        }
    }
    
    editPlayer(playerId) {
        this.showPlayerModal(playerId);
    }
    
    async deletePlayer(playerId) {
        if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
            return;
        }
        
        try {
            await window.deleteDoc(window.doc(window.db, 'users', playerId));
            console.log('✅ Player deleted');
            await this.loadPlayers();
            await this.loadLeaderboard();
        } catch (error) {
            console.error('❌ Error deleting player:', error);
            this.showError('Failed to delete player');
        }
    }
    
    editQuest(questId) {
        this.showQuestModal(questId);
    }
    
    async duplicateQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) {
            this.showError('Quest not found');
            return;
        }
        
        try {
            // Create a copy of the quest with modified name and timestamps
            const duplicatedQuest = {
                logo: quest.logo || '📍',
                name: `${quest.name} (Copy)`,
                description: quest.description,
                xpReward: quest.xpReward || 0,
                coinsReward: quest.coinsReward || 0,
                assignedPlayer: quest.assignedPlayer || null,
                endTime: this.getDefaultEndTime(), // Set new end time
                verificationName: quest.verificationName || '',
                verificationLink: quest.verificationLink || '',
                status: 'active',
                createdAt: new Date().toISOString()
            };
            
            // Create new quest document in Firestore
            const newQuestRef = window.doc(window.collection(window.db, 'quests'));
            await window.setDoc(newQuestRef, duplicatedQuest);
            
            console.log('✅ Quest duplicated successfully');
            this.showSuccessMessage(`Quest "${quest.name}" has been duplicated successfully!`);
            
            // Refresh quests list
            await this.loadQuests();
            
        } catch (error) {
            console.error('❌ Error duplicating quest:', error);
            this.showError('Failed to duplicate quest');
        }
    }
    
    getDefaultEndTime() {
        // Set default end time to 24 hours from now
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().slice(0, 16); // Format for datetime-local input
    }
    
    // Notify the game about stat updates for real-time updates
    notifyGameOfStatUpdate(playerId, updatedStats) {
        try {
            // Try to find the game window and notify it
            if (window.opener && window.opener.game && window.opener.game.auth) {
                // If admin dashboard was opened from the game
                window.opener.game.auth.handleExternalStatUpdate(updatedStats);
            } else {
                // Try to find any open game window
                const gameWindows = window.parent.frames || [];
                for (let i = 0; i < gameWindows.length; i++) {
                    try {
                        if (gameWindows[i].game && gameWindows[i].game.auth) {
                            gameWindows[i].game.auth.handleExternalStatUpdate(updatedStats);
                            break;
                        }
                    } catch (e) {
                        // Cross-origin or window closed, continue
                    }
                }
            }
            
            // Also try to use localStorage as a fallback for real-time updates
            const statUpdate = {
                playerId: playerId,
                stats: updatedStats,
                timestamp: Date.now()
            };
            localStorage.setItem('playerStatUpdate', JSON.stringify(statUpdate));
            
            // Trigger a custom event that the game can listen to
            window.dispatchEvent(new CustomEvent('playerStatsUpdated', {
                detail: { playerId, stats: updatedStats }
            }));
            
        } catch (error) {
            console.log('Could not notify game directly, using localStorage fallback');
        }
    }
    
    async deleteQuest(questId) {
        if (!confirm('Are you sure you want to delete this quest? This action cannot be undone.')) {
            return;
        }
        
        try {
            await window.deleteDoc(window.doc(window.db, 'quests', questId));
            console.log('✅ Quest deleted');
            await this.loadQuests();
        } catch (error) {
            console.error('❌ Error deleting quest:', error);
            this.showError('Failed to delete quest');
        }
    }
    
    async approveQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) {
            this.showError('Quest not found');
            return;
        }
        
        console.log('🔍 Quest data:', quest);
        console.log('🔍 Available players:', this.players.map(p => ({ id: p.id, name: p.name, email: p.email })));
        
        // Find the assigned player - try multiple lookup methods
        let player = null;
        if (quest.assignedPlayer && quest.assignedPlayer.trim() !== '') {
            // Try to find by exact ID match
            player = this.players.find(p => p.id === quest.assignedPlayer);
            
            // If not found, try to find by email (in case assignedPlayer is an email)
            if (!player) {
                player = this.players.find(p => p.email === quest.assignedPlayer);
            }
            
            // If still not found, try to find by name (in case assignedPlayer is a name)
            if (!player) {
                player = this.players.find(p => p.name === quest.assignedPlayer);
            }
        }
        
        console.log('🔍 Found player:', player);
        
        if (!player) {
            if (!quest.assignedPlayer || quest.assignedPlayer.trim() === '') {
                this.showError('This quest is assigned to "All Players". Please assign it to a specific player before approving.');
                return;
            } else {
                const errorMsg = `No player found for assignment: "${quest.assignedPlayer}". Please check if the player exists and is properly assigned.`;
                this.showError(errorMsg);
                return;
            }
        }
        
        // Confirm approval
        const confirmMessage = `Approve quest completion for ${player.name}?\n\nRewards:\n• ${quest.xpReward || 0} XP\n• ${quest.coinsReward || 0} DZD\n\nThis action cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            // Update player stats
            const currentExperience = player.experience || 0;
            const currentLevel = player.level || 1;
            const xpReward = quest.xpReward || 0;
            const newPoints = (player.points || 0) + (quest.coinsReward || 0);
            
            // Calculate new experience and level
            let newExperience = currentExperience + xpReward;
            let newLevel = currentLevel;
            
            // Check if player leveled up (level 1: 100 XP, level 2: 200 XP, etc.)
            while (newLevel < 10 && newExperience >= (newLevel * 100)) {
                newExperience -= (newLevel * 100); // Subtract XP needed for current level
                newLevel++;
            }
            
            // Cap at level 10
            if (newLevel > 10) {
                newLevel = 10;
                newExperience = 0; // Reset XP when reaching max level
            }
            
            await window.updateDoc(window.doc(window.db, 'users', player.id), {
                experience: newExperience,
                points: newPoints,
                level: newLevel
            });
            
            console.log(`✅ Quest approved for ${player.name}: +${quest.xpReward || 0} XP, +${quest.coinsReward || 0} DZD`);
            
            // Mark quest as completed
            await window.updateDoc(window.doc(window.db, 'quests', questId), {
                status: 'completed',
                completedAt: new Date().toISOString(),
                completedBy: player.id
            });
            
            // Show success message with level up notification
            let successMessage = `Quest approved! ${player.name} received ${quest.xpReward || 0} XP and ${quest.coinsReward || 0} DZD.`;
            if (newLevel > currentLevel) {
                const levelsGained = newLevel - currentLevel;
                successMessage += `\n\n🎉 LEVEL UP! ${player.name} reached level ${newLevel}! (${levelsGained} level${levelsGained > 1 ? 's' : ''} gained)`;
                if (newLevel >= 10) {
                    successMessage += `\n🏆 MAX LEVEL REACHED!`;
                } else {
                    const xpNeeded = newLevel * 100;
                    successMessage += `\n📊 New XP: ${newExperience}/${xpNeeded}`;
                }
            }
            this.showSuccessMessage(successMessage);
            
            // Refresh data
            await this.loadPlayers();
            await this.loadLeaderboard();
            await this.loadQuests();
            
            // Notify the game about the stat update for real-time updates
            this.notifyGameOfStatUpdate(player.id, {
                level: newLevel,
                experience: newExperience,
                points: newPoints
            });
            
        } catch (error) {
            console.error('❌ Error approving quest:', error);
            this.showError('Failed to approve quest');
        }
    }
    
    showSuccessMessage(message) {
        // Create a temporary success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
    
    // Make refresh methods available globally for debugging
    window.refreshLeaderboard = () => {
        if (window.adminDashboard) {
            return window.adminDashboard.refreshLeaderboard();
        } else {
            console.log("❌ Admin dashboard not initialized yet");
        }
    };
});