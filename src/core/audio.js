// src/core/audio.js
export class AudioManager {
    constructor() {
        // Core audio properties
        this.audioContext = null;
        this.audioElement = null;
        this.audioSource = null;
        this.analyser = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.beatMap = [];
        this.isAnalyzed = false;
        this.onBeatDetected = null;
        
        // Beat detection parameters
        this.beatParams = {
            minBeatInterval: 500,
            energyThreshold: 240,
            dynamicRange: 1.3,
            beatDecay: 0.98,
            historySize: 30,
            minBeatIntensity: 0.70
        };
        
        this.beatHistory = [];
        this.dynamicThreshold = 0;
        
        // Initialize debug UI if needed
        if (window.location.hostname === 'localhost') {
            this.createDebugUI();
        }
    }

    async analyzeFullTrack() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    
        this.beatMap = [];
        console.log('Starting enhanced beat detection...');
        this.updateDebugStatus('Analyzing track with enhanced sensitivity...');
        
        return new Promise((resolve, reject) => {
            const analysisAudio = new Audio(this.audioUrl);
            analysisAudio.crossOrigin = "anonymous";
            const analysisDuration = this.audioElement.duration;
            
            // Create a new audio context and nodes specifically for analysis
            const analysisContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create and configure nodes
            const analysisSource = analysisContext.createMediaElementSource(analysisAudio);
            const analysisAnalyser = analysisContext.createAnalyser();
            const gainNode = analysisContext.createGain();
            
            // Configure gain (volume) - set to 0 for silent analysis
            gainNode.gain.value = 0;
            
            // Improved analyzer configuration for better beat detection
            analysisAnalyser.fftSize = 1024; // Reduced for faster response
            analysisAnalyser.smoothingTimeConstant = 0.6; // More responsive to changes
            
            // Create multi-band filters for better frequency analysis
            const lowPassFilter = analysisContext.createBiquadFilter();
            const midPassFilter = analysisContext.createBiquadFilter();
            
            // Configure low-pass filter for sub-bass
            lowPassFilter.type = 'lowpass';
            lowPassFilter.frequency.value = 150;
            lowPassFilter.Q.value = 0.5;
            
            // Configure mid-pass filter for bass
            midPassFilter.type = 'bandpass';
            midPassFilter.frequency.value = 150;
            midPassFilter.Q.value = 0.5;
            
            // Connect the audio chain with parallel filters
            analysisSource.connect(lowPassFilter);
            analysisSource.connect(midPassFilter);
            lowPassFilter.connect(analysisAnalyser);
            midPassFilter.connect(analysisAnalyser);
            analysisAnalyser.connect(gainNode);
            gainNode.connect(analysisContext.destination);
            
            const bufferLength = analysisAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            let lastBeatTime = 0;
            
            // Reset beat history with new size
            this.beatHistory = [];
            this.dynamicThreshold = 0;
    
            let lastEnergy = 0;
            let energyChange = 0;
    
            console.log('Starting enhanced analysis with new parameters...');
            
            const analyze = () => {
                if (!analysisAudio.ended && !analysisAudio.paused) {
                    // Get frequency data
                    analysisAnalyser.getByteFrequencyData(dataArray);
                    
                    // Analyze multiple frequency bands
                    const subBassRange = dataArray.slice(0, 4);  // 0-60Hz
                    const bassRange = dataArray.slice(4, 8);     // 60-120Hz
                    const lowMidRange = dataArray.slice(8, 12);  // 120-180Hz
                    
                    // Calculate energy for each band with weighting
                    const subBassEnergy = subBassRange.reduce((a, b) => a + b, 0) / subBassRange.length * 1.2;
                    const bassEnergy = bassRange.reduce((a, b) => a + b, 0) / bassRange.length;
                    const lowMidEnergy = lowMidRange.reduce((a, b) => a + b, 0) / lowMidRange.length * 0.8;
                    
                    // Combined energy with weights
                    const totalEnergy = (subBassEnergy * 0.5 + bassEnergy * 0.3 + lowMidEnergy * 0.2);
                    
                    // Calculate energy change
                    energyChange = totalEnergy - lastEnergy;
                    lastEnergy = totalEnergy;
                    
                    // Update beat history
                    this.beatHistory.push(totalEnergy);
                    if (this.beatHistory.length > this.beatParams.historySize) {
                        this.beatHistory.shift();
                    }
                    
                    // Calculate dynamic threshold
                    if (this.beatHistory.length >= Math.min(10, this.beatParams.historySize)) {
                        const averageEnergy = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
                        this.dynamicThreshold = averageEnergy * this.beatParams.dynamicRange;
                        // Decay the threshold
                        this.dynamicThreshold *= this.beatParams.beatDecay;
                    }
                    
                    const currentTime = analysisAudio.currentTime;
                    const timeSinceLastBeat = currentTime - lastBeatTime;
                    
                    // Enhanced beat detection using energy change and threshold
                    if ((totalEnergy > this.beatParams.energyThreshold || energyChange > this.beatParams.energyThreshold / 2) && 
                        timeSinceLastBeat >= (this.beatParams.minBeatInterval / 1000)) {
                        
                        // Calculate beat intensity based on both energy and change
                        const energyIntensity = Math.min(totalEnergy / 255, 1);
                        const changeIntensity = Math.min(Math.max(energyChange, 0) / 100, 1);
                        const intensity = Math.max(
                            Math.min((energyIntensity + changeIntensity) / 2, 1),
                            this.beatParams.minBeatIntensity
                        );
                        
                        if (intensity >= this.beatParams.minBeatIntensity) {
                            console.log(`Beat detected at ${currentTime}s with intensity ${intensity.toFixed(2)} (Energy: ${Math.round(totalEnergy)})`);
                            
                            this.beatMap.push({
                                time: currentTime,
                                intensity: intensity
                            });
                            
                            lastBeatTime = currentTime;
                            
                            // Update beat count in debug UI
                            this.debugDiv.querySelector('#beatCount').textContent = 
                                `Beats found: ${this.beatMap.length}`;
                        }
                    }
                    
                    // Update debug visualization
                    const progress = (currentTime / analysisDuration) * 100;
                    this.updateDebugStatus(`Analyzing: ${progress.toFixed(1)}% | Energy: ${Math.round(totalEnergy)}`);
                    this.drawFrequencyData(dataArray, totalEnergy);
                    
                    requestAnimationFrame(analyze);
                } else if (analysisAudio.ended) {
                    // Cleanup
                    [analysisSource, lowPassFilter, midPassFilter, analysisAnalyser, gainNode].forEach(node => {
                        if (node) node.disconnect();
                    });
                    analysisContext.close();
                    analysisAudio.remove();
                    
                    // Process final beat map
                    this.beatMap.sort((a, b) => a.time - b.time);
                    
                    // Filter out beats that are too close but keep stronger ones
                    this.beatMap = this.beatMap.filter((beat, index, array) => {
                        if (index === 0) return true;
                        const timeDiff = beat.time - array[index - 1].time;
                        return timeDiff >= (this.beatParams.minBeatInterval / 1000) || 
                               beat.intensity > array[index - 1].intensity * 1.2;
                    });
                    
                    console.log(`Analysis complete. Found ${this.beatMap.length} beats:`, this.beatMap);
                    this.updateDebugStatus(`Analysis complete. Found ${this.beatMap.length} beats`);
                    this.isAnalyzed = true;
                    resolve(this.beatMap);
                }
            };
    
            // Start audio and begin analysis
            analysisAudio.addEventListener('canplaythrough', () => {
                console.log('Starting analysis playback...');
                analysisAudio.play()
                    .then(() => requestAnimationFrame(analyze))
                    .catch(reject);
            });
    
            analysisAudio.addEventListener('error', reject);
            analysisAudio.load();
        });
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing audio...');
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.audioUrl) {
                await this.initializeWithFile(this.audioUrl);
            }

            this.isInitialized = true;
            console.log('Audio initialization complete');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            throw error;
        }
    }

    async initializeWithFile(url) {
        try {
            this.audioElement = new Audio();
            this.audioElement.crossOrigin = "anonymous";
            this.audioElement.src = url;

            await new Promise((resolve, reject) => {
                this.audioElement.addEventListener('canplaythrough', resolve, { once: true });
                this.audioElement.addEventListener('error', reject, { once: true });
                this.audioElement.load();
            });

            if (this.audioSource) {
                this.audioSource.disconnect();
            }

            this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
            this.analyser = this.audioContext.createAnalyser();
            
            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.6;
            
            this.audioSource.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.isInitialized = true;
            this.updateDebugStatus('✅ Connected');
        } catch (error) {
            this.updateDebugStatus('❌ Connection Failed');
            throw error;
        }
    }

    setAudioTrack(url) {
        this.audioUrl = url;
        this.isInitialized = false;
        this.isAnalyzed = false;
        this.beatMap = [];
    }

    async start(beatCallback) {
        if (!this.isInitialized) {
            await this.initialize();
        }
    
        if (!this.isAnalyzed) {
            await this.analyzeFullTrack();
        }
    
        this.onBeatDetected = beatCallback;
        
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
    
            this.audioElement.currentTime = 0;
            this.isPlaying = true;
    
            // Schedule all beats with precise timing
            this.beatMap.forEach(beat => {
                setTimeout(() => {
                    if (this.isPlaying && this.onBeatDetected) {
                        // Pass both intensity and timing information
                        this.onBeatDetected(beat.intensity, beat.time);
                    }
                }, beat.time * 1000);
            });
    
            await this.audioElement.play();
            this.updateDebugStatus('Playing');
            return true;
        } catch (error) {
            console.error('Failed to start audio:', error);
            return false;
        }
    }

    stop() {
        this.isPlaying = false;
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        this.updateDebugStatus('Stopped');
    }

    pause() {
        this.isPlaying = false;
        if (this.audioElement) {
            this.audioElement.pause();
        }
        this.updateDebugStatus('Paused');
    }

    async resume() {
        if (!this.audioElement || !this.isAnalyzed) return;

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const currentTime = this.audioElement.currentTime;
            
            this.beatMap
                .filter(beat => beat.time > currentTime)
                .forEach(beat => {
                    setTimeout(() => {
                        if (this.isPlaying && this.onBeatDetected) {
                            this.onBeatDetected(beat.intensity);
                        }
                    }, (beat.time - currentTime) * 1000);
                });

            await this.audioElement.play();
            this.isPlaying = true;
            this.updateDebugStatus('Playing');
        } catch (error) {
            console.error('Failed to resume audio:', error);
            throw error;
        }
    }

    // Debug UI Methods
    createDebugUI() {
        this.debugDiv = document.createElement('div');
        this.debugDiv.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 5px;
            color: white;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            max-width: 300px;
        `;

        this.debugDiv.innerHTML = `
            <div style="margin-bottom: 5px;">Audio Analysis Debug</div>
            <div id="connectionStatus">Not Connected</div>
            <div id="audioStatus">Status: Not initialized</div>
            <canvas id="freqCanvas" width="280" height="60" 
                    style="background: #000; margin-top: 5px;"></canvas>
            <div id="freqData" style="margin-top: 2px;"></div>
            <div id="beatCount">Beats: 0</div>
        `;

        document.body.appendChild(this.debugDiv);
        
        this.canvas = this.debugDiv.querySelector('#freqCanvas');
        this.canvasCtx = this.canvas.getContext('2d');
    }

    updateDebugStatus(message) {
        if (!this.debugDiv) return;
        
        this.debugDiv.querySelector('#audioStatus').textContent = `Status: ${message}`;
    }

    drawFrequencyData(dataArray, totalEnergy) {
        if (!this.canvasCtx) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        this.canvasCtx.fillRect(0, 0, width, height);

        const barWidth = width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i] * height / 256;
            const isBassBin = i < Math.floor(150 * dataArray.length / (this.audioContext.sampleRate / 2));
            const hue = isBassBin ? 0 : (i / dataArray.length) * 240;
            
            this.canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            this.canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }

        if (this.debugDiv) {
            this.debugDiv.querySelector('#freqData').textContent = 
                `Energy: ${Math.round(totalEnergy)}`;
        }
    }
}