# Performance Optimization - Firebase API Call Reduction

## Changes Required in game.js

### 1. Quest Updates Interval (Line 2284-2285)
**Replace:**
```javascript
        // Check for quest updates every 3 seconds
        setInterval(checkForQuestUpdates, 3000);
```
**With:**
```javascript
        // Check for quest updates every 30 seconds
        setInterval(checkForQuestUpdates, 30000);
```

### 2. Stat Updates Interval (Line 2220-2221)
**Replace:**
```javascript
        // Check for updates every 2 seconds
        setInterval(checkForStatUpdates, 2000);
```
**With:**
```javascript
        // Check for updates every 7 seconds
        setInterval(checkForStatUpdates, 7000);
```

### 3. Feedback Notifications Interval (Line 3897-3900)
**Replace:**
```javascript
        // Check for new feedback every 5 seconds
        setInterval(() => {
            this.checkForNewFeedback();
        }, 5000);
```
**With:**
```javascript
        // Check for new feedback every 30 seconds
        setInterval(() => {
            this.checkForNewFeedback();
        }, 30000);
```

### 4. Quest Timer Updates (Line 1094-1096) - NO CHANGE
**Keep as is:**
```javascript
        // Update timers every 2 seconds to reduce lag
        this.questTimerInterval = setInterval(() => {
            this.updateQuestTimers();
        }, 2000);
```
*Note: This only updates DOM elements, no Firebase calls*

## Performance Impact

### Before Optimization:
- Quest Updates: Every 3 seconds = 1,200 calls/hour
- Feedback Notifications: Every 5 seconds = 720 calls/hour
- Stat Updates: Every 2 seconds = 1,800 checks/hour
- **Total Firebase calls: ~1,920 calls/hour**

### After Optimization:
- Quest Updates: Every 30 seconds = 120 calls/hour
- Feedback Notifications: Every 30 seconds = 120 calls/hour
- Stat Updates: Every 7 seconds = 514 checks/hour
- **Total Firebase calls: ~240 calls/hour**

### Result:
- **87.5% reduction** in Firebase API calls
- **10x less frequent** quest updates
- **6x less frequent** feedback checks
- **3.5x less frequent** stat updates

## Additional Optimization (Optional)

To make quest updates trigger immediately when player clicks "done" button, add this to the quest done button handler:

```javascript
// After marking quest as done, immediately refresh quest list
this.loadPlayerQuests();
```

This ensures quests update immediately when player takes action, while maintaining the 30-second fallback for external updates.

## Implementation Status
- [ ] Quest Updates: 3s → 30s
- [ ] Stat Updates: 2s → 7s  
- [ ] Feedback Notifications: 5s → 30s
- [ ] Quest Timer Updates: Keep at 2s (no change needed)
- [ ] Optional: Add immediate quest refresh on "done" button

