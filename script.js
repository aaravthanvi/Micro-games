/* script.js */

/**
 * Micro Puzzle Generator - Main Application Logic
 * A complete puzzle game with multiple puzzle types, progress tracking, and achievements
 */

class MicroPuzzleApp {
    constructor() {
        this.currentScreen = 'menu';
        this.currentPuzzle = null;
        this.puzzleStartTime = null;
        this.timer = null;
        this.soundEnabled = true;
        this.gameData = this.loadGameData();
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.updateUI();
        this.checkDailyStreak();
        this.playSound('start');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Header controls
        document.getElementById('statsBtn').addEventListener('click', () => this.showScreen('stats'));
        document.getElementById('achievementsBtn').addEventListener('click', () => this.showScreen('achievements'));
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());

        // Menu screen
        document.getElementById('dailyPuzzleBtn').addEventListener('click', () => this.startDailyPuzzle());
        document.querySelectorAll('.pack-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectPuzzlePack(e.target.closest('.pack-card').dataset.pack));
        });

        // Puzzle screen
        document.getElementById('backBtn').addEventListener('click', () => this.showScreen('menu'));
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('submitBtn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipPuzzle());

        // Modal controls
        document.getElementById('closeStatsBtn').addEventListener('click', () => this.showScreen('menu'));
        document.getElementById('closeAchievementsBtn').addEventListener('click', () => this.showScreen('menu'));
        document.getElementById('nextPuzzleBtn').addEventListener('click', () => this.generateNewPuzzle());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.showScreen('menu'));
        document.getElementById('closeHintBtn').addEventListener('click', () => this.hideModal('hintModal'));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        if (this.currentScreen === 'puzzle') {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.checkAnswer();
            } else if (e.key === 'h' && e.ctrlKey) {
                e.preventDefault();
                this.showHint();
            }
        }
    }

    /**
     * Load game data from localStorage
     */
    loadGameData() {
        const defaultData = {
            streak: 0,
            bestStreak: 0,
            totalSolved: 0,
            fastestTime: null,
            averageTime: null,
            lastPlayDate: null,
            solvedPuzzles: [],
            achievements: [],
            packProgress: {
                starter: 0,
                intermediate: 0,
                expert: 0
            },
            solveTimes: []
        };

        const saved = localStorage.getItem('microPuzzleData');
        return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
    }

    /**
     * Save game data to localStorage
     */
    saveGameData() {
        localStorage.setItem('microPuzzleData', JSON.stringify(this.gameData));
    }

    /**
     * Check and update daily streak
     */
    checkDailyStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (this.gameData.lastPlayDate === today) {
            // Already played today
            return;
        } else if (this.gameData.lastPlayDate === yesterday) {
            // Played yesterday, can continue streak
            return;
        } else if (this.gameData.lastPlayDate) {
            // Missed a day, reset streak
            this.gameData.streak = 0;
            this.saveGameData();
        }
    }

    /**
     * Update daily streak when puzzle is solved
     */
    updateDailyStreak() {
        const today = new Date().toDateString();
        
        if (this.gameData.lastPlayDate !== today) {
            this.gameData.streak++;
            this.gameData.lastPlayDate = today;
            
            if (this.gameData.streak > this.gameData.bestStreak) {
                this.gameData.bestStreak = this.gameData.streak;
            }
            
            this.saveGameData();
            this.updateUI();
        }
    }

    /**
     * Show specified screen
     */
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        // Show requested screen
        document.getElementById(`${screenName}Screen`).classList.remove('hidden');
        this.currentScreen = screenName;

        // Update screen-specific content
        if (screenName === 'stats') {
            this.updateStatsDisplay();
        } else if (screenName === 'achievements') {
            this.updateAchievementsDisplay();
        }

        this.playSound('click');
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('soundToggle');
        soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        soundBtn.title = this.soundEnabled ? 'Sound' : 'Muted';
        
        if (this.soundEnabled) {
            this.playSound('click');
        }
    }

    /**
     * Play sound effect
     */
    playSound(type) {
        if (!this.soundEnabled) return;

        // Create audio context for sound effects
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const frequencies = {
            click: 800,
            success: [523, 659, 784], // C-E-G chord
            error: 200,
            start: 440
        };

        if (type === 'success') {
            // Play success chord
            frequencies.success.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = freq;
                    gain.gain.value = 0.1;
                    osc.start();
                    osc.stop(audioContext.currentTime + 0.3);
                }, i * 100);
            });
        } else {
            oscillator.frequency.value = frequencies[type] || 440;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }

        // Haptic feedback (if supported)
        if ('vibrate' in navigator && type === 'success') {
            navigator.vibrate([100, 50, 100]);
        } else if ('vibrate' in navigator && type === 'click') {
            navigator.vibrate(50);
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update streak display
        document.getElementById('streakCount').textContent = this.gameData.streak;

        // Update pack progress
        document.getElementById('starterProgress').textContent = `${this.gameData.packProgress.starter}/10`;
        document.getElementById('intermediateProgress').textContent = `${this.gameData.packProgress.intermediate}/15`;
        document.getElementById('expertProgress').textContent = `${this.gameData.packProgress.expert}/20`;

        // Update pack availability
        const intermediatePack = document.querySelector('[data-pack="intermediate"]');
        const expertPack = document.querySelector('[data-pack="expert"]');

        if (this.gameData.packProgress.starter >= 5) {
            intermediatePack.classList.remove('locked');
        }

        if (this.gameData.packProgress.intermediate >= 10) {
            expertPack.classList.remove('locked');
        }
    }

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        document.getElementById('totalSolved').textContent = this.gameData.totalSolved;
        document.getElementById('bestStreak').textContent = this.gameData.bestStreak;
        
        const fastestTime = this.gameData.fastestTime 
            ? this.formatTime(this.gameData.fastestTime) 
            : '--:--';
        document.getElementById('fastestTime').textContent = fastestTime;
        
        const averageTime = this.gameData.averageTime 
            ? this.formatTime(this.gameData.averageTime) 
            : '--:--';
        document.getElementById('averageTime').textContent = averageTime;
    }

    /**
     * Update achievements display
     */
    updateAchievementsDisplay() {
        const achievements = [
            { id: 'first_solve', icon: '🎯', title: 'First Steps', description: 'Solve your first puzzle', requirement: 1 },
            { id: 'streak_3', icon: '🔥', title: 'Getting Hot', description: 'Maintain a 3-day streak', requirement: 3 },
            { id: 'streak_7', icon: '⚡', title: 'On Fire!', description: 'Maintain a 7-day streak', requirement: 7 },
            { id: 'speed_demon', icon: '💨', title: 'Speed Demon', description: 'Solve a puzzle in under 30 seconds', requirement: 'speed' },
            { id: 'puzzle_master', icon: '🧠', title: 'Puzzle Master', description: 'Solve 50 puzzles', requirement: 50 },
            { id: 'perfectionist', icon: '💎', title: 'Perfectionist', description: 'Solve 10 puzzles without hints', requirement: 'no_hints' }
        ];

        const achievementsList = document.getElementById('achievementsList');
        achievementsList.innerHTML = '';

        achievements.forEach(achievement => {
            const isUnlocked = this.checkAchievement(achievement);
            const achievementElement = document.createElement('div');
            achievementElement.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;
            achievementElement.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                </div>
            `;
            achievementsList.appendChild(achievementElement);
        });
    }

    /**
     * Check if achievement is unlocked
     */
    checkAchievement(achievement) {
        switch (achievement.id) {
            case 'first_solve':
                return this.gameData.totalSolved >= 1;
            case 'streak_3':
                return this.gameData.bestStreak >= 3;
            case 'streak_7':
                return this.gameData.bestStreak >= 7;
            case 'speed_demon':
                return this.gameData.fastestTime && this.gameData.fastestTime < 30000;
            case 'puzzle_master':
                return this.gameData.totalSolved >= 50;
            case 'perfectionist':
                // This would need additional tracking in real implementation
                return false;
            default:
                return false;
        }
    }

    /**
     * Select puzzle pack
     */
    selectPuzzlePack(packType) {
        if (document.querySelector(`[data-pack="${packType}"]`).classList.contains('locked')) {
            return;
        }

        this.currentPack = packType;
        this.generateNewPuzzle();
        this.showScreen('puzzle');
    }

    /**
     * Start daily puzzle
     */
    startDailyPuzzle() {
        this.currentPack = 'daily';
        this.generateDailyPuzzle();
        this.showScreen('puzzle');
    }

    /**
     * Generate daily puzzle (seeded by date)
     */
    generateDailyPuzzle() {
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        
        // Use seed to generate consistent daily puzzle
        Math.seedrandom = (seed) => {
            let m = 0x80000000;
            let a = 1103515245;
            let c = 12345;
            let state = seed ? seed : Math.floor(Math.random() * (m - 1));
            
            return function() {
                state = (a * state + c) % m;
                return state / (m - 1);
            };
        };

        const seededRandom = Math.seedrandom(seed);
        this.currentPuzzle = this.generatePuzzleWithRandom(seededRandom);
        this.startPuzzleTimer();
        this.renderPuzzle();
    }

    /**
     * Generate new puzzle
     */
    generateNewPuzzle() {
        const puzzleTypes = ['logic', 'pattern', 'word', 'memory'];
        const randomType = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
        
        this.currentPuzzle = this.generatePuzzleByType(randomType);
        this.startPuzzleTimer();
        this.renderPuzzle();
    }

    /**
     * Generate puzzle by type
     */
    generatePuzzleByType(type) {
        switch (type) {
            case 'logic':
                return this.generateLogicPuzzle();
            case 'pattern':
                return this.generatePatternPuzzle();
            case 'word':
                return this.generateWordPuzzle();
            case 'memory':
                return this.generateMemoryPuzzle();
            default:
                return this.generateLogicPuzzle();
        }
    }

    /**
     * Generate puzzle with seeded random (for daily puzzles)
     */
    generatePuzzleWithRandom(randomFunc) {
        const types = ['logic', 'pattern', 'word'];
        const type = types[Math.floor(randomFunc() * types.length)];
        
        // Generate puzzle using seeded random
        // This is a simplified version - full implementation would use seeded random throughout
        return this.generatePuzzleByType(type);
    }

    /**
     * Generate logic puzzle
     */
    generateLogicPuzzle() {
        const puzzles = [
            {
                question: "If 2 + 2 = 4, and 3 + 3 = 6, what is 4 + 4?",
                answer: "8",
                hint: "Follow the simple addition pattern",
                type: "input"
            },
            {
                question: "What comes next in the sequence: 1, 4, 9, 16, ?",
                answer: "25",
                hint: "These are perfect squares: 1², 2², 3², 4²...",
                type: "input"
            },
            {
                question: "If all roses are flowers, and all flowers are plants, are all roses plants?",
                answer: "yes",
                hint: "Think about logical relationships",
                type: "input"
            },
            {
                question: "A farmer has 17 sheep. All but 9 die. How many sheep are left?",
                answer: "9",
                hint: "'All but 9' means 9 remain alive",
                type: "input"
            }
        ];

        return {
            ...puzzles[Math.floor(Math.random() * puzzles.length)],
            category: 'Logic Puzzle'
        };
    }

    /**
     * Generate pattern puzzle
     */
    generatePatternPuzzle() {
        const patterns = [
            {
                grid: ['🔴', '🔵', '🔴', '🔵', '🔴', '🔵', '🔴', '🔵', '?'],
                answer: '🔴',
                hint: "Look for the alternating color pattern"
            },
            {
                grid: ['⭐', '⭐', '🌙', '⭐', '⭐', '🌙', '⭐', '⭐', '?'],
                answer: '🌙',
                hint: "Count the stars between moons"
            },
            {
                grid: ['🔺', '🔺', '🔻', '🔺', '🔺', '🔻', '🔺', '🔺', '?'],
                answer: '🔻',
                hint: "Two up triangles, then one down triangle"
            }
        ];

        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        return {
            question: "What symbol comes next in this pattern?",
            pattern: selectedPattern.grid,
            answer: selectedPattern.answer,
            hint: selectedPattern.hint,
            type: "pattern",
            category: 'Pattern Puzzle'
        };
    }

    /**
     * Generate word puzzle
     */
    generateWordPuzzle() {
        const wordPuzzles = [
            {
                scrambled: "TPYHNO",
                answer: "PYTHON",
                hint: "A popular programming language (and also a snake!)"
            },
            {
                scrambled: "ZELZUP",
                answer: "PUZZLE",
                hint: "What you're solving right now!"
            },
            {
                scrambled: "RBINA",
                answer: "BRAIN",
                hint: "The organ you're using to solve this"
            },
            {
                scrambled: "RODW",
                answer: "WORD",
                hint: "What you need to unscramble"
            }
        ];

        const selectedPuzzle = wordPuzzles[Math.floor(Math.random() * wordPuzzles.length)];

        return {
            question: `Unscramble this word: ${selectedPuzzle.scrambled}`,
            answer: selectedPuzzle.answer.toLowerCase(),
            hint: selectedPuzzle.hint,
            type: "input",
            category: 'Word Puzzle'
        };
    }

    /**
     * Generate memory puzzle
     */
    generateMemoryPuzzle() {
        const symbols = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];
        const sequenceLength = 4 + Math.floor(Math.random() * 3); // 4-6 items
        const sequence = [];
        
        for (let i = 0; i < sequenceLength; i++) {
            sequence.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }

        return {
            question: "Memorize this sequence, then input it in order:",
            sequence: sequence,
            answer: sequence.join(','),
            hint: "Take your time to memorize before it disappears",
            type: "memory",
            category: 'Memory Puzzle'
        };
    }

    /**
     * Start puzzle timer
     */
    startPuzzleTimer() {
        this.puzzleStartTime = Date.now();
        this.updateTimer();
        
        this.timer = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    /**
     * Update timer display
     */
    updateTimer() {
        if (!this.puzzleStartTime) return;
        
        const elapsed = Date.now() - this.puzzleStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Stop puzzle timer
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Render current puzzle
     */
    renderPuzzle() {
        if (!this.currentPuzzle) return;

        const puzzleArea = document.getElementById('puzzleArea');
        const answerArea = document.getElementById('answerArea');
        
        document.getElementById('puzzleType').textContent = this.currentPuzzle.category;

        if (this.currentPuzzle.type === 'pattern') {
            this.renderPatternPuzzle(puzzleArea, answerArea);
        } else if (this.currentPuzzle.type === 'memory') {
            this.renderMemoryPuzzle(puzzleArea, answerArea);
        } else {
            this.renderInputPuzzle(puzzleArea, answerArea);
        }
    }

    /**
     * Render input-based puzzle
     */
    renderInputPuzzle(puzzleArea, answerArea) {
        puzzleArea.innerHTML = `
            <div class="puzzle-question">${this.currentPuzzle.question}</div>
        `;

        answerArea.innerHTML = `
            <input type="text" class="answer-input" id="puzzleAnswer" 
                   placeholder="Enter your answer here..." autocomplete="off">
        `;

        // Focus on input
        setTimeout(() => {
            document.getElementById('puzzleAnswer').focus();
        }, 100);
    }

    /**
     * Render pattern puzzle
     */
    renderPatternPuzzle(puzzleArea, answerArea) {
        puzzleArea.innerHTML = `
            <div class="puzzle-question">${this.currentPuzzle.question}</div>
            <div class="pattern-grid">
                ${this.currentPuzzle.pattern.map((item, index) => 
                    `<div class="pattern-cell" data-index="${index}">
                        ${item === '?' ? '❓' : item}
                    </div>`
                ).join('')}
            </div>
        `;

        const options = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '⭐', '🌙', '🔺', '🔻'];
        
        answerArea.innerHTML = `
            <div class="answer-options">
                ${options.map(option => 
                    `<div class="answer-option" data-answer="${option}">${option}</div>`
                ).join('')}
            </div>
        `;

        // Add click handlers for options
        document.querySelectorAll('.answer-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.answer-option').forEach(opt => 
                    opt.classList.remove('selected')
                );
                option.classList.add('selected');
            });
        });
    }

    /**
     * Render memory puzzle
     */
    renderMemoryPuzzle(puzzleArea, answerArea) {
        puzzleArea.innerHTML = `
            <div class="puzzle-question">${this.currentPuzzle.question}</div>
            <div class="memory-sequence" id="memorySequence">
                ${this.currentPuzzle.sequence.map(item => 
                    `<div class="memory-item">${item}</div>`
                ).join('')}
            </div>
            <div id="memoryInstructions">
                <p>Memorize the sequence above...</p>
                <button id="startMemoryInput" class="secondary-btn">I'm Ready!</button>
            </div>
        `;

        answerArea.innerHTML = `
            <div id="memoryAnswerArea" class="hidden">
                <p>Click the symbols in the correct order:</p>
                <div class="answer-options memory-input-options">
                    ${[...new Set(this.currentPuzzle.sequence)].map(symbol => 
                        `<div class="answer-option memory-option" data-symbol="${symbol}">${symbol}</div>`
                    ).join('')}
                </div>
                <div class="memory-user-sequence" id="userSequence"></div>
                <button id="clearMemorySequence" class="secondary-btn">Clear</button>
            </div>
        `;

        // Start memory input after delay
        document.getElementById('startMemoryInput').addEventListener('click', () => {
            document.getElementById('memorySequence').style.display = 'none';
            document.getElementById('memoryInstructions').style.display = 'none';
            document.getElementById('memoryAnswerArea').classList.remove('hidden');
            
            this.setupMemoryInput();
        });
    }

    /**
     * Setup memory puzzle input
     */
    setupMemoryInput() {
        let userSequence = [];

        document.querySelectorAll('.memory-option').forEach(option => {
            option.addEventListener('click', () => {
                const symbol = option.dataset.symbol;
                userSequence.push(symbol);
                
                const userSequenceDiv = document.getElementById('userSequence');
                userSequenceDiv.innerHTML = userSequence.map(s => `<span>${s}</span>`).join(' ');
                
                // Auto-submit when sequence is complete
                if (userSequence.length === this.currentPuzzle.sequence.length) {
                    setTimeout(() => this.checkAnswer(), 500);
                }
            });
        });

        document.getElementById('clearMemorySequence').addEventListener('click', () => {
            userSequence = [];
            document.getElementById('userSequence').innerHTML = '';
        });

        // Store user sequence for checking
        this.memoryUserSequence = userSequence;
    }

    /**
     * Show hint for current puzzle
     */
    showHint() {
        if (!this.currentPuzzle) return;

        document.getElementById('hintText').textContent = this.currentPuzzle.hint;
        this.showModal('hintModal');
        this.playSound('click');
    }

    /**
     * Check user's answer
     */
    checkAnswer() {
        if (!this.currentPuzzle) return;

        let userAnswer = '';
        
        if (this.currentPuzzle.type === 'input') {
            userAnswer = document.getElementById('puzzleAnswer').value.toLowerCase().trim();
        } else if (this.currentPuzzle.type === 'pattern') {
            const selected = document.querySelector('.answer-option.selected');
            userAnswer = selected ? selected.dataset.answer : '';
        } else if (this.currentPuzzle.type === 'memory') {
            const userSequence = Array.from(document.querySelectorAll('#userSequence span'))
                .map(span => span.textContent);
            userAnswer = userSequence.join(',');
        }

        const isCorrect = userAnswer === this.currentPuzzle.answer.toLowerCase();

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleIncorrectAnswer();
        }
    }

    /**
     * Handle correct answer
     */
    handleCorrectAnswer() {
        this.stopTimer();
        const solveTime = Date.now() - this.puzzleStartTime;
        
        // Update statistics
        this.gameData.totalSolved++;
        this.gameData.solveTimes.push(solveTime);
        
        // Update fastest time
        if (!this.gameData.fastestTime || solveTime < this.gameData.fastestTime) {
            this.gameData.fastestTime = solveTime;
        }
        
        // Update average time
        const totalTime = this.gameData.solveTimes.reduce((a, b) => a + b, 0);
        this.gameData.averageTime = totalTime / this.gameData.solveTimes.length;
        
        // Update pack progress
        if (this.currentPack !== 'daily') {
            this.gameData.packProgress[this.currentPack || 'starter']++;
        }
        
        // Update daily streak
        this.updateDailyStreak();
        
        this.saveGameData();
        this.updateUI();
        
        // Show success modal
        document.getElementById('successTitle').textContent = 'Excellent!';
        document.getElementById('successMessage').textContent = 'You solved the puzzle correctly!';
        document.getElementById('solveTime').textContent = `Time: ${this.formatTime(solveTime)}`;
        
        this.showModal('successModal');
        this.playSound('success');
        
        // Add bounce animation to success icon
        document.querySelector('.success-icon').classList.add('bounce');
        setTimeout(() => {
            document.querySelector('.success-icon').classList.remove('bounce');
        }, 1000);
    }

    /**
     * Handle incorrect answer
     */
    handleIncorrectAnswer() {
        // Visual feedback for wrong answer
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.style.background = 'var(--error-color)';
        submitBtn.textContent = 'Try Again';
        
        setTimeout(() => {
            submitBtn.style.background = '';
            submitBtn.textContent = 'Check Answer';
        }, 1500);
        
        this.playSound('error');
        
        // Shake animation for answer area
        const answerArea = document.getElementById('answerArea');
        answerArea.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            answerArea.style.animation = '';
        }, 500);
    }

    /**
     * Skip current puzzle
     */
    skipPuzzle() {
        this.stopTimer();
        this.generateNewPuzzle();
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    window.puzzleApp = new MicroPuzzleApp();
});

/**
 * Future AI Integration Hooks
 * These are placeholder functions for potential AI features
 */

/**
 * Generate AI-powered puzzle based on user preferences and difficulty
 * @param {Object} userPreferences - User's puzzle preferences
 * @param {string} difficulty - Desired difficulty level
 * @returns {Object} Generated puzzle object
 */
function generatePuzzleAI(userPreferences, difficulty) {
    // TODO: Implement AI puzzle generation
    // This could connect to an AI service to generate custom puzzles
    console.log('AI Puzzle Generation - Coming Soon!');
    return null;
}

/**
 * Get AI-powered hint for current puzzle
 * @param {Object} puzzle - Current puzzle object
 * @param {Array} previousAttempts - User's previous incorrect attempts
 * @returns {string} Contextual hint
 */
function getAIHint(puzzle, previousAttempts) {
    // TODO: Implement AI-powered contextual hints
    console.log('AI Hints - Coming Soon!');
    return puzzle.hint;
}

/**
 * Analyze user performance and suggest improvements
 * @param {Object} gameData - User's game statistics
 * @returns {Object} Performance analysis and suggestions
 */
function analyzePerformanceAI(gameData) {
    // TODO: Implement AI performance analysis
    console.log('AI Performance Analysis - Coming Soon!');
    return {
        strengths: [],
        weaknesses: [],
        suggestions: []
    };
}

// Add CSS animation for shake effect
const shakeCSS = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;

// Inject shake animation CSS
const style = document.createElement('style');
style.textContent = shakeCSS;
document.head.appendChild(style);
