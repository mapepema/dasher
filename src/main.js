// src/main.js
import { Game } from './core/game.js';
import { MenuSystem } from './ui/menu.js';
import { setupDebugUI } from './utils/debug.js';

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const game = new Game();
        const menuSystem = new MenuSystem(game);

        // Remove loading screen
        const loadingElement = document.getElementById('loading');
        loadingElement.style.display = 'none';
        
        // Setup debug UI
        setupDebugUI(game);
        
        // Start the game
        game.audioManager.setAudioTrack('../assets/music/test2.mp3');
        //game.start();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Failed to initialize game. See console for details.');
    }
});

// Add hot reload support for development
if (import.meta.hot) {
    import.meta.hot.accept();
}