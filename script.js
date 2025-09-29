class MicroPuzzleApp {
    constructor() {
        this.currentScreen = 'menu';
        this.currentPuzzle = null;
        this.puzzleStartTime = null;
        this.timer = null;
        this.soundEnabled = true;
        this.gameData = this.loadGameData();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
        this.checkDailyStreak();
        this.playSound('start');
    }

    setupEventListeners() {
        document.getElementById('statsBtn').addEventListener('click', () => this.showScreen('stats'));
        document.getElementById('achievementsBtn').addEventListener('click', () => this.showScreen('achievements'));
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());

        document.getElementById('dailyPuzzleBtn').addEventListener('click', () => this.startDailyPuzzle());
        document.querySelectorAll('.pack-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectPuzzlePack(e.target.closest('.pack-card').dataset.pack));
        });

        document.getElementById('backBtn').addEventListener('click', () => this.showScreen('menu'));
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('submitBtn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipPuzzle());

        document.getElementById('closeStatsBtn').addEventListener('click', () => this.showScreen('menu'));
        document.getElementById('closeAchievementsBtn').addEventListener('click', () => this.showScreen('menu'));
        
        // FIXED MODAL HANDLERS
        document.getElementById('nextPuzzleBtn').addEventListener('click', () => {
            this.hideModal('successModal');
            this.generateNewPuzzle();
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.hideModal('successModal');
            this.showScreen('menu');
        });
        
        document.getElementById('closeHintBtn').addEventListener('click', () => this.hideModal('hintModal'));

        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

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
        
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                this.hideModal(openModal.id);
            }
        }
    }

    loadGameData() {
        const defaultData = {
            streak: 0, bestStreak: 0, totalSolved: 0,
            fastestTime: null, averageTime: null, lastPlayDate: null,
            solvedPuzzles: [], achievements: [],
            packProgress: { starter: 0, intermediate: 0, expert: 0 },
            solveTimes: []
        };

        const saved = localStorage.getItem('microPuzzleData');
        return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
    }

    saveGameData() {
        localStorage.setItem('microPuzzleData', JSON.stringify(this.gameData));
    }

    checkDailyStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (this.gameData.lastPlayDate === today) {
            return;
        } else if (this.gameData.lastPlayDate === yesterday) {
            return;
        } else if (this.gameData.lastPlayDate) {
            this.gameData.streak = 0;
            this.saveGameData();
        }
    }

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

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });

        document.getElementById(`${screenName}Screen`).classList.remove('hidden');
        this.currentScreen = screenName;

        if (screenName === 'stats') {
            this.updateStatsDisplay();
        } else if (screenName === 'achievements') {
            this.updateAchievementsDisplay();
        }

        this.playSound('click');
    }

    // FIXED MODAL METHODS
    showModal(modalId) {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.opacity = '1';
            }, 10);
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.style.opacity = '';
            }, 200);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('soundToggle');
        soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        soundBtn.title = this.soundEnabled ? 'Sound' : 'Muted';
        
        if (this.soundEnabled) {
            this.playSound('click');
        }
    }

    playSound(type) {
        if (!this.soundEnabled) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const frequencies = {
                click: 800,
                success: [523, 659, 784],
                error: 200,
                start: 440
            };

            if (type === 'success') {
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

            if ('vibrate' in navigator && type === 'success') {
                navigator.vibrate([100, 50, 100]);
            } else if ('vibrate' in navigator && type === 'click') {
                navigator.vibrate(50);
            }
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    updateUI() {
        document.getElementById('streakCount').textContent = this.gameData.streak;
        document.getElementById('starterProgress').textContent = `${this.gameData.packProgress.starter}/10`;
        document.getElementById('intermediateProgress').textContent = `${this.gameData.packProgress.intermediate}/15`;
        document.getElementById('expertProgress').textContent = `${this.gameData.packProgress.expert}/20`;

        const intermediatePack = document.querySelector('[data-pack="intermediate"]');
        const expertPack = document.querySelector('[data-pack="expert"]');

        if (this.gameData.packProgress.starter >= 5) {
            intermediatePack.classList.remove('locked');
        }

        if (this.gameData.packProgress.intermediate >= 10) {
            expertPack.classList.remove('locked');
        }
    }

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

    checkAchievement(achievement) {
        switch (achievement.id) {
            case 'first_solve': return this.gameData.totalSolved >= 1;
            case 'streak_3': return this.gameData.bestStreak >= 3;
            case 'streak_7': return this.gameData.bestStreak >= 7;
            case 'speed_demon': return this.gameData.fastestTime && this.gameData.fastestTime < 30000;
            case 'puzzle_master': return this.gameData.totalSolved >= 50;
            case 'perfectionist': return false;
            default: return false;
        }
    }

    selectPuzzlePack(packType) {
        if (document.querySelector(`[data-pack="${packType}"]`).classList.contains('locked')) {
            return;
        }

        this.currentPack = packType;
        this.generateNewPuzzle();
        this.showScreen('puzzle');
    }

    startDailyPuzzle() {
        this.currentPack = 'daily';
        this.generateDailyPuzzle();
        this.showScreen('puzzle');
    }

    generateDailyPuzzle() {
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        
        let seedValue = seed;
        const seededRandom = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280;
            return seedValue / 233280;
        };

        this.currentPuzzle = this.generatePuzzleWithRandom(seededRandom);
        this.startPuzzleTimer();
        this.renderPuzzle();
    }

    generateNewPuzzle() {
        const puzzleTypes = ['logic', 'pattern', 'word', 'memory'];
        const randomType = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
        
        this.currentPuzzle = this.generatePuzzleByType(randomType);
        this.startPuzzleTimer();
        this.renderPuzzle();
    }

    generatePuzzleByType(type) {
        switch (type) {
            case 'logic': return this.generateLogicPuzzle();
            case 'pattern': return this.generatePatternPuzzle();
            case 'word': return this.generateWordPuzzle();
            case 'memory': return this.generateMemoryPuzzle();
            default: return this.generateLogicPuzzle();
        }
    }

    generatePuzzleWithRandom(randomFunc) {
        const types = ['logic', 'pattern', 'word'];
        const type = types[Math.floor(randomFunc() * types.length)];
        return this.generatePuzzleByType(type);
    }

    generateLogicPuzzle() {
        const puzzles = [
            { question: "If 2 + 2 = 4, and 3 + 3 = 6, what is 4 + 4?", answer: "8", hint: "Follow the simple addition pattern", type: "input" },
            { question: "What comes next in the sequence: 1, 4, 9, 16, ?", answer: "25", hint: "These are perfect squares: 1², 2², 3², 4²...", type: "input" },
            { question: "If all roses are flowers, and all flowers are plants, are all roses plants?", answer: "yes", hint: "Think about logical relationships", type: "input" },
            { question: "A farmer has 17 sheep. All but 9 die. How many sheep are left?", answer: "9", hint: "'All but 9' means 9 remain alive", type: "input" },
            { question: "What number comes next: 2, 4, 8, 16, ?", answer: "32", hint: "Each number doubles the previous one", type: "input" },
            { question: "If it takes 5 machines 5 minutes to make 5 widgets, how long does it take 100 machines to make 100 widgets?", answer: "5", hint: "Think about the rate per machine", type: "input" }
        ];

        return { ...puzzles[Math.floor(Math.random() * puzzles.length)], category: 'Logic Puzzle' };
    }

    generatePatternPuzzle() {
        const patterns = [
            { grid: ['🔴', '🔵', '🔴', '🔵', '🔴', '🔵', '🔴', '🔵', '?'], answer: '🔴', hint: "Look for the alternating color pattern" },
            { grid: ['⭐', '⭐', '🌙', '⭐', '⭐', '🌙', '⭐', '⭐', '?'], answer: '🌙', hint: "Count the stars between moons" },
            { grid: ['🔺', '🔺', '🔻', '🔺', '🔺', '🔻', '🔺', '🔺', '?'], answer: '🔻', hint: "Two up triangles, then one down triangle" },
            { grid: ['🟢', '🟡', '🔴', '🟢', '🟡', '🔴', '🟢', '🟡', '?'], answer: '🔴', hint: "Green, yellow, red pattern repeating" }
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

    generateWordPuzzle() {
        const wordPuzzles = [
            { scrambled: "TPYHNO", answer: "PYTHON", hint: "A popular programming language (and also a snake!)" },
            { scrambled: "ZELZUP", answer: "PUZZLE", hint: "What you're solving right now!" },
            { scrambled: "RBINA", answer: "BRAIN", hint: "The organ you're using to solve this" },
            { scrambled: "RODW", answer: "WORD", hint: "What you need to unscramble" },
            { scrambled: "EGMA", answer: "GAME", hint: "What you're playing right now" },
            { scrambled: "DEOC", answer: "CODE", hint: "What programmers write" }
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

    generateMemoryPuzzle() {
        const symbols = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];
        const sequenceLength = 4 + Math.floor(Math.random() * 3);
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

    startPuzzleTimer() {
        this.puzzleStartTime = Date.now();
        this.updateTimer();
        
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.timer = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    updateTimer() {
        if (!this.puzzleStartTime) return;
        
        const elapsed = Date.now() - this.puzzleStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    renderPuzzle() {
        if (!this.currentPuzzle) return;

        const puzzleArea = document.getElementById('puzzleArea');
        const answerArea = document.getElementById('answerArea');
        
        if (!puzzleArea || !answerArea) return;
        
        document.getElementById('puzzleType').textContent = this.currentPuzzle.category;

        if (this.currentPuzzle.type === 'pattern') {
            this.renderPatternPuzzle(puzzleArea, answerArea);
        } else if (this.currentPuzzle.type === 'memory') {
            this.renderMemoryPuzzle(puzzleArea, answerArea);
        } else {
            this.renderInputPuzzle(puzzleArea, answerArea);
        }
    }

    renderInputPuzzle(puzzleArea, answerArea) {
        puzzleArea.innerHTML = `<div class="puzzle-question">${this.currentPuzzle.question}</div>`;

        answerArea.innerHTML = `
            <input type="text" class="answer-input" id="puzzleAnswer" 
                   placeholder="Enter your answer here..." autocomplete="off">
        `;

        setTimeout(() => {
            const input = document.getElementById('puzzleAnswer');
            if (input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.checkAnswer();
                    }
                });
            }
        }, 100);
    }

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

        document.querySelectorAll('.answer-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.answer-option').forEach(opt => 
                    opt.classList.remove('selected')
                );
                option.classList.add('selected');
            });
        });
    }

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

        document.getElementById('startMemoryInput').addEventListener('click', () => {
            document.getElementById('memorySequence').style.display = 'none';
            document.getElementById('memoryInstructions').style.display = 'none';
            document.getElementById('memoryAnswerArea').classList.remove('hidden');
            
            this.setupMemoryInput();
        });
    }

    setupMemoryInput() {
        this.memoryUserSequence = [];

        document.querySelectorAll('.memory-option').forEach(option => {
            option.addEventListener('click', () => {
                const symbol = option.dataset.symbol;
                this.memoryUserSequence.push(symbol);
                
                const userSequenceDiv = document.getElementById('userSequence');
                userSequenceDiv.innerHTML = this.memoryUserSequence.map(s => `<span>${s}</span>`).join(' ');
                
                if (this.memoryUserSequence.length === this.currentPuzzle.sequence.length) {
                    setTimeout(() => this.checkAnswer(), 500);
                }
            });
        });

        document.getElementById('clearMemorySequence').addEventListener('click', () => {
            this.memoryUserSequence = [];
            document.getElementById('userSequence').innerHTML = '';
        });
    }

    showHint() {
        if (!this.currentPuzzle) return;

        document.getElementById('hintText').textContent = this.currentPuzzle.hint;
        this.showModal('hintModal');
        this.playSound('click');
    }

    checkAnswer() {
        if (!this.currentPuzzle) return;

        let userAnswer = '';
        
        if (this.currentPuzzle.type === 'input') {
            const input = document.getElementById('puzzleAnswer');
            userAnswer = input ? input.value.toLowerCase().trim() : '';
        } else if (this.currentPuzzle.type === 'pattern') {
            const selected = document.querySelector('.answer-option.selected');
            userAnswer = selected ? selected.dataset.answer : '';
        } else if (this.currentPuzzle.type === 'memory') {
            userAnswer = this.memoryUserSequence ? this.memoryUserSequence.join(',') : '';
        }

        const isCorrect = userAnswer === this.currentPuzzle.answer.toLowerCase();

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleIncorrectAnswer();
        }
    }

    handleCorrectAnswer() {
        this.stopTimer();
        const solveTime = Date.now() - this.puzzleStartTime;
        
        this.gameData.totalSolved++;
        this.gameData.solveTimes.push(solveTime);
        
        if (!this.gameData.fastestTime || solveTime < this.gameData.fastestTime) {
            this.gameData.fastestTime = solveTime;
        }
        
        const totalTime = this.gameData.solveTimes.reduce((a, b) => a + b, 0);
        this.gameData.averageTime = totalTime / this.gameData.solveTimes.length;
        
        if (this.currentPack && this.currentPack !== 'daily') {
            this.gameData.packProgress[this.currentPack]++;
        }
        
        this.updateDailyStreak();
        this.saveGameData();
        this.updateUI();
        
        const successTitle = document.getElementById('successTitle');
        const successMessage = document.getElementById('successMessage');
        const solveTimeElement = document.getElementById('solveTime');
        
        if (successTitle) successTitle.textContent = 'Excellent!';
        if (successMessage) successMessage.textContent = 'You solved the puzzle correctly!';
        if (solveTimeElement) solveTimeElement.textContent = `Time: ${this.formatTime(solveTime)}`;
        
        this.showModal('successModal');
        this.playSound('success');
        
        const successIcon = document.querySelector('.success-icon');
        if (successIcon) {
            successIcon.classList.add('bounce');
            setTimeout(() => {
                successIcon.classList.remove('bounce');
            }, 1000);
        }
    }

    handleIncorrectAnswer() {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            const originalBg = submitBtn.style.background;
            const originalText = submitBtn.textContent;
            
            submitBtn.style.background = 'var(--error-color)';
            submitBtn.textContent = 'Try Again';
            
            setTimeout(() => {
                submitBtn.style.background = originalBg;
                submitBtn.textContent = originalText;
            }, 1500);
        }
        
        this.playSound('error');
        
        const answerArea = document.getElementById('answerArea');
        if (answerArea) {
            answerArea.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                answerArea.style.animation = '';
            }, 500);
        }
    }

    skipPuzzle() {
        this.stopTimer();
        this.generateNewPuzzle();
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.puzzleApp = new MicroPuzzleApp();
});
