// src/ui/menu.js
export class MenuSystem {
    constructor(game) {
        this.game = game;
        this.currentMenu = null;
        this.currentScore = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        
        // Create menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.style.position = 'fixed';
        this.menuContainer.style.top = '0';
        this.menuContainer.style.left = '0';
        this.menuContainer.style.width = '100%';
        this.menuContainer.style.height = '100%';
        this.menuContainer.style.display = 'flex';
        this.menuContainer.style.justifyContent = 'center';
        this.menuContainer.style.alignItems = 'center';
        this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.menuContainer.style.zIndex = '1000';
        this.playButtonText = 'Play';

        // Add loading state tracking
        this.isLoading = false;
        
        document.body.appendChild(this.menuContainer);
        
        // Create score display
        this.createScoreDisplay();
        
        // Create menus
        this.createMainMenu();
        this.createDeathMenu();
        
        // Show main menu initially
        this.showMainMenu();
        
        // Listen for game over and score updates
        window.addEventListener('gameover', () => {
            // Update final score before showing death menu
            this.currentScore = this.game.score;
            if (this.currentScore > this.highScore) {
                this.highScore = this.currentScore;
                localStorage.setItem('highScore', this.highScore.toString());
            }
            this.showDeathMenu();
        });

        window.addEventListener('scoreupdate', (e) => {
            this.updateScore(e.detail);
        });
    }
    
    updateScore(scoreData) {
        this.currentScore = scoreData.score;
        this.highScore = scoreData.highScore;
        
        // Update in-game score display
        this.scoreDisplay.innerHTML = `
            Score: ${this.currentScore.toLocaleString()}<br>
            High Score: ${this.highScore.toLocaleString()}
        `;
        
        // Update main menu if it's currently shown
        if (this.currentMenu === this.mainMenu) {
            this.createMainMenu();
            this.showMainMenu();
        }
        
        // Update death menu if it's currently shown
        if (this.currentMenu === this.deathMenu) {
            this.createDeathMenu();
            this.showDeathMenu();
        }
    }

    createScoreDisplay() {
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.position = 'fixed';
        this.scoreDisplay.style.top = '20px';
        this.scoreDisplay.style.right = '20px';
        this.scoreDisplay.style.color = '#00ff00';
        this.scoreDisplay.style.fontFamily = 'Arial, sans-serif';
        this.scoreDisplay.style.fontSize = '1.5rem';
        this.scoreDisplay.style.textAlign = 'right';
        this.scoreDisplay.style.textShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
        this.scoreDisplay.style.zIndex = '100';
        this.scoreDisplay.style.display = 'none'; // Hidden by default
        
        document.body.appendChild(this.scoreDisplay);
    }
    
    createMainMenu() {
        this.mainMenu = document.createElement('div');
        this.mainMenu.style.textAlign = 'center';
        this.mainMenu.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.9);
                padding: 2rem;
                border-radius: 1rem;
                border: 2px solid #00ff00;
                box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
            ">
                <h1 style="
                    color: #00ff00;
                    font-family: 'Arial', sans-serif;
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    text-transform: uppercase;
                    text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                ">Rhythm Runner</h1>
                <div style="
                    color: #00ff00;
                    margin-bottom: 2rem;
                    font-size: 1.2rem;
                ">High Score: ${this.highScore.toLocaleString()}</div>
                <button id="playButton" style="
                    background: #00ff00;
                    color: black;
                    border: none;
                    padding: 1rem 3rem;
                    font-size: 1.5rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    font-weight: bold;
                ">${this.playButtonText}</button>
            </div>
        `;
        
        const playButton = this.mainMenu.querySelector('#playButton');
        playButton.onmouseover = () => {
            if (!playButton.disabled) {
                playButton.style.transform = 'scale(1.1)';
                playButton.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
            }
        };
        playButton.onmouseout = () => {
            playButton.style.transform = 'scale(1)';
            playButton.style.boxShadow = 'none';
        };
        playButton.onclick = () => this.startGame();
    }

    createDeathMenu() {
        this.deathMenu = document.createElement('div');
        this.deathMenu.style.textAlign = 'center';
        this.deathMenu.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.9);
                padding: 2rem;
                border-radius: 1rem;
                border: 2px solid #ff0000;
                box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
            ">
                <h2 style="
                    color: #ff0000;
                    font-family: 'Arial', sans-serif;
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                    text-transform: uppercase;
                    text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                ">Game Over</h2>
                
                <div style="
                    margin: 1.5rem 0;
                    color: white;
                    font-size: 1.5rem;
                    font-family: 'Arial', sans-serif;
                ">
                    <div style="margin-bottom: 0.5rem;">
                        Score: <span style="color: #ff0000">${this.currentScore.toLocaleString()}</span>
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        ${this.currentScore >= this.highScore ? 
                            '<div style="color: #ffd700; font-weight: bold; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">New High Score!</div>' : 
                            `High Score: <span style="color: #ffd700">${this.highScore.toLocaleString()}</span>`
                        }
                    </div>
                </div>
                
                <div style="margin: 2rem 0; display: flex; gap: 1rem; justify-content: center;">
                    <button id="retryButton" style="
                        background: #ff0000;
                        color: white;
                        border: none;
                        padding: 0.8rem 2rem;
                        font-size: 1.2rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-transform: uppercase;
                        font-weight: bold;
                    ">Retry</button>
                    <button id="menuButton" style="
                        background: #333;
                        color: white;
                        border: none;
                        padding: 0.8rem 2rem;
                        font-size: 1.2rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-transform: uppercase;
                        font-weight: bold;
                    ">Main Menu</button>
                </div>
            </div>
        `;
        
        const retryButton = this.deathMenu.querySelector('#retryButton');
        const menuButton = this.deathMenu.querySelector('#menuButton');
        
        [retryButton, menuButton].forEach(button => {
            button.onmouseover = () => {
                button.style.transform = 'scale(1.1)';
                button.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.3)';
            };
            button.onmouseout = () => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = 'none';
            };
        });
        
        retryButton.onclick = () => this.retryGame();
        menuButton.onclick = () => this.showMainMenu();
    }
    
    showMainMenu() {
        // Stop audio when returning to main menu
        this.game.audioManager.stop();
        
        this.scoreDisplay.style.display = 'none';
        this.menuContainer.style.display = 'flex';
        if (this.currentMenu) {
            this.menuContainer.removeChild(this.currentMenu);
        }
        this.createMainMenu();
        this.menuContainer.appendChild(this.mainMenu);
        this.currentMenu = this.mainMenu;
        this.game.stop();
    }
    
    showDeathMenu() {
        // Pause audio on death
        this.game.audioManager.pause();
        
        this.menuContainer.style.display = 'flex';
        if (this.currentMenu) {
            this.menuContainer.removeChild(this.currentMenu);
        }
        this.createDeathMenu();
        this.menuContainer.appendChild(this.deathMenu);
        this.currentMenu = this.deathMenu;
    }
    
    hideMenus() {
        this.menuContainer.style.display = 'none';
        this.scoreDisplay.style.display = 'block';
        if (this.currentMenu) {
            this.menuContainer.removeChild(this.currentMenu);
            this.currentMenu = null;
        }
    }

    async startGame() {
        if (this.isLoading) return;
        
        const playButton = this.mainMenu.querySelector('#playButton');
        const originalText = playButton.textContent;
        
        try {
            this.isLoading = true;
            playButton.disabled = true;
            playButton.textContent = 'Initializing...';
    
            // Make sure audio is set up
            if (!this.game.audioManager.audioUrl) {
                throw new Error('No audio track set');
            }
    
            // Initialize if needed
            if (!this.game.audioManager.isInitialized) {
                await this.game.audioManager.initialize();
            }
    
            // Analyze if needed
            if (!this.game.audioManager.isAnalyzed) {
                playButton.textContent = 'Analyzing Track...';
                await this.game.audioManager.analyzeFullTrack();
            }
    
            // Start the game
            playButton.textContent = 'Starting...';
            this.hideMenus();
            await this.game.start();
    
        } catch (error) {
            console.error('Failed to start game:', error);
            playButton.textContent = originalText;
            playButton.disabled = false;
            alert('Failed to start game: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    retryGame() {
        this.hideMenus();
        
        // Resume audio from beginning
        this.game.audioManager.stop();
        this.game.audioManager.resume();
        
        // Reset game state but keep audio initialized
        this.game.reset();
        this.game.start();
    }
}