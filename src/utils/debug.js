// src/utils/debug.js
export function setupDebugUI(game) {
    // Add debug info
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'fixed';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.zIndex = '100';
    document.body.appendChild(debugDiv);

    // Update debug info
    setInterval(() => {
        const fps = Math.round(1 / game.clock.getDelta());
        const playerPos = game.player.mesh.position;
        debugDiv.innerHTML = `
            FPS: ${fps}<br>
            Player Position: (${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}, ${playerPos.z.toFixed(2)})<br>
            Beat Detected: ${game.audioManager.beatDetected ? 'Yes' : 'No'}<br>
            Obstacles: ${game.levelGenerator.obstacleQueue.length}
        `;
    }, 100);
}