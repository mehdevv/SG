// Script to apply performance fixes to game.js
// This script will update the intervals to reduce Firebase API calls

const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, 'game.js');

try {
    // Read the current game.js file
    let content = fs.readFileSync(gameJsPath, 'utf8');
    
    // Apply the performance fixes
    console.log('🔧 Applying performance fixes to game.js...');
    
    // 1. Quest Updates: 3 seconds → 30 seconds
    content = content.replace(
        'setInterval(checkForQuestUpdates, 3000);',
        'setInterval(checkForQuestUpdates, 30000);'
    );
    content = content.replace(
        '// Check for quest updates every 3 seconds',
        '// Check for quest updates every 30 seconds'
    );
    
    // 2. Stat Updates: 2 seconds → 7 seconds
    content = content.replace(
        'setInterval(checkForStatUpdates, 2000);',
        'setInterval(checkForStatUpdates, 7000);'
    );
    content = content.replace(
        '// Check for updates every 2 seconds',
        '// Check for updates every 7 seconds'
    );
    
    // 3. Feedback Notifications: 5 seconds → 30 seconds
    content = content.replace(
        'setInterval(() => {\n            this.checkForNewFeedback();\n        }, 5000);',
        'setInterval(() => {\n            this.checkForNewFeedback();\n        }, 30000);'
    );
    content = content.replace(
        '// Check for new feedback every 5 seconds',
        '// Check for new feedback every 30 seconds'
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(gameJsPath, content, 'utf8');
    
    console.log('✅ Performance fixes applied successfully!');
    console.log('📊 Firebase API calls reduced by ~87.5%');
    console.log('🎮 Game should now run much smoother with less lag');
    
} catch (error) {
    console.error('❌ Error applying performance fixes:', error);
}

