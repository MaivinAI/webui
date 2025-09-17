import * as THREE from './three.js';
import h264Stream from './stream.js';

/**
 * SmartVideoManager - Automatically detects and streams tiles or falls back to H.264
 * No debug panels, no complex UI - just video streaming
 */
class SmartVideoManager {
    constructor() {
        this.tileUrls = [
            '/rt/camera/h264/tl',
            '/rt/camera/h264/tr',
            '/rt/camera/h264/bl',
            '/rt/camera/h264/br'
        ];
        this.fallbackUrl = '/rt/camera/h264';

        this.mode = null; // 'tiles' or 'fallback'
        this.currentTexture = null;
        this.tileCanvases = {};
        this.mergedCanvas = null;
        this.mergedContext = null;

        this.detectionTimeout = 5000; // 5 seconds to detect tiles

        // Aggressive frame synchronization system (15fps, requires ALL tiles)
        this.syncEnabled = true;
        this.frameReadyMap = new Map(); // Track when each tile has a frame ready
        this.lastUpdateTime = 0;
        this.updateThrottle = 67; // Update at most every 67ms (15fps)
        this.maxWaitForSync = 500; // Maximum 500ms wait for ALL tiles (much longer)
        this.pendingUpdate = false;
        this.requiredTiles = 4; // MUST have all 4 tiles
    }

    /**
     * Initialize video streaming - tries tiles first, falls back to H.264
     * @param {Function} onFrameUpdate - Callback when frames are received
     * @param {Function} h264StreamFunc - h264Stream function (optional, for explicit passing)
     * @returns {Promise<THREE.Texture>} The video texture
     */
    async init(onFrameUpdate, h264StreamFunc = null) {
        // Use passed function or imported one
        this.h264StreamFunc = h264StreamFunc || h264Stream;
        console.log('SmartVideoManager: Starting video detection...');

        try {
            // Try tiles first
            const tilesAvailable = await this.detectTiles();

            if (tilesAvailable) {
                console.log('✅ Tiles detected - initializing 4K tile streaming');
                try {
                    return await this.initTileMode(onFrameUpdate);
                } catch (tileError) {
                    console.error('❌ Tile initialization failed:', tileError);
                    console.log('🔄 Falling back to H.264 due to tile init failure');
                    return await this.initFallbackMode(onFrameUpdate);
                }
            } else {
                console.log('⚠️ Tiles not available - falling back to single H.264 stream');
                return await this.initFallbackMode(onFrameUpdate);
            }
        } catch (error) {
            console.log('❌ Tile detection failed - using H.264 fallback');
            console.error('Detection error:', error);
            return await this.initFallbackMode(onFrameUpdate);
        }
    }

    /**
     * Detect if tile streams are available and streaming data
     * @returns {Promise<boolean>} True if tiles are available
     */
    async detectTiles() {
        console.log('SmartVideoManager: Testing tile connections...');

        return new Promise((resolve) => {
            let connectCount = 0;
            let dataReceived = false;
            const connections = [];
            const connectionStatus = {};

            const timeout = setTimeout(() => {
                console.log(`SmartVideoManager: Detection timeout after ${this.detectionTimeout}ms`);
                console.log('SmartVideoManager: Connection status:', connectionStatus);
                console.log(`SmartVideoManager: Connected: ${connectCount}/${this.tileUrls.length}, Data received: ${dataReceived}`);

                // Clean up connections
                connections.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                });

                // For now, let's try tiles if at least some connections work
                // This is more permissive than waiting for data
                resolve(connectCount >= 2); // At least 2 tiles must connect
            }, this.detectionTimeout);

            this.tileUrls.forEach((url, index) => {
                const ws = new WebSocket(url);
                ws.binaryType = 'arraybuffer';
                connections.push(ws);
                connectionStatus[url] = 'connecting';

                ws.onopen = () => {
                    connectCount++;
                    connectionStatus[url] = 'connected';
                    console.log(`SmartVideoManager: ${url} connected (${connectCount}/${this.tileUrls.length})`);
                };

                ws.onmessage = (event) => {
                    connectionStatus[url] = 'streaming';
                    if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
                        if (!dataReceived) {
                            console.log(`SmartVideoManager: First data received from ${url} (${event.data.byteLength} bytes)`);
                            dataReceived = true;
                            clearTimeout(timeout);
                            // Clean up connections
                            connections.forEach(socket => {
                                if (socket.readyState === WebSocket.OPEN) {
                                    socket.close();
                                }
                            });
                            resolve(true);
                        }
                    }
                };

                ws.onerror = (error) => {
                    connectionStatus[url] = 'error';
                    console.log(`SmartVideoManager: ${url} connection error`);
                };

                ws.onclose = () => {
                    if (connectionStatus[url] === 'connecting') {
                        connectionStatus[url] = 'failed';
                    }
                };
            });
        });
    }

    /**
     * Initialize 4K tile streaming mode
     * @param {Function} onFrameUpdate - Frame callback
     * @returns {Promise<THREE.Texture>} 4K merged texture
     */
    async initTileMode(onFrameUpdate) {
        this.mode = 'tiles';

        console.log('SmartVideoManager: Starting 4K tile mode initialization...');
        console.log('SmartVideoManager: h264StreamFunc available:', !!this.h264StreamFunc);

        if (!this.h264StreamFunc) {
            throw new Error('h264StreamFunc is not available');
        }

        // Create 4K merged canvas
        this.mergedCanvas = document.createElement('canvas');
        this.mergedCanvas.width = 3840;
        this.mergedCanvas.height = 2160;
        this.mergedContext = this.mergedCanvas.getContext('2d', {
            alpha: false,
            willReadFrequently: false
        });

        // Create merged texture
        this.currentTexture = new THREE.CanvasTexture(this.mergedCanvas);
        this.currentTexture.generateMipmaps = false;
        this.currentTexture.minFilter = THREE.LinearFilter;
        this.currentTexture.magFilter = THREE.LinearFilter;

        // Initialize tile streams
        console.log('SmartVideoManager: Initializing tile streams...');
        const tilePromises = this.tileUrls.map(async (url, index) => {
            const tileName = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'][index];
            const position = [
                { x: 0, y: 0 },     // topLeft
                { x: 1920, y: 0 },  // topRight  
                { x: 0, y: 1080 },  // bottomLeft
                { x: 1920, y: 1080 } // bottomRight
            ][index];

            try {
                console.log(`SmartVideoManager: Initializing tile ${tileName} at ${url}`);
                const texture = await this.h264StreamFunc(url, 1920, 1080, 30, (timing) => {
                    // Store frame timing for synchronization
                    this.onTileFrame(tileName, timing);

                    if (onFrameUpdate) {
                        onFrameUpdate({ ...timing, tileName, mode: 'tiles' });
                    }
                });

                console.log(`SmartVideoManager: ✅ Tile ${tileName} initialized successfully`);
                this.tileCanvases[tileName] = {
                    texture,
                    canvas: texture.image,
                    position
                };

                return texture;
            } catch (error) {
                console.error(`SmartVideoManager: ❌ Failed to initialize tile ${tileName}:`, error);
                return null;
            }
        });

        const results = await Promise.allSettled(tilePromises);
        const successfulTiles = results.filter(result => result.status === 'fulfilled' && result.value !== null).length;
        const failures = results.filter(result => result.status === 'rejected');

        console.log(`SmartVideoManager: ${successfulTiles}/${this.tileUrls.length} tiles initialized successfully`);

        if (failures.length > 0) {
            console.log('SmartVideoManager: Tile initialization failures:');
            failures.forEach((failure, index) => {
                console.error(`SmartVideoManager: Tile ${index} failed:`, failure.reason);
            });
        }

        if (successfulTiles === 0) {
            throw new Error('No tiles could be initialized successfully');
        }

        console.log('SmartVideoManager: ✅ Tile mode initialization complete');

        // Initialize frame tracking
        this.frameReadyMap.clear();

        // Start merge updates
        this.updateMergedCanvas();

        return this.currentTexture;
    }

    /**
     * Initialize single H.264 fallback mode
     * @param {Function} onFrameUpdate - Frame callback
     * @returns {Promise<THREE.Texture>} H.264 texture
     */
    async initFallbackMode(onFrameUpdate) {
        this.mode = 'fallback';

        try {
            this.currentTexture = await this.h264StreamFunc(
                this.fallbackUrl,
                1920, 1080, 30,
                (timing) => {
                    if (onFrameUpdate) {
                        onFrameUpdate({ ...timing, mode: 'fallback' });
                    }
                }
            );

            return this.currentTexture;
        } catch (error) {
            console.error('Failed to initialize fallback stream:', error);
            throw error;
        }
    }

    /**
 * Handle incoming frame from a tile (simplified sync)
 * @param {string} tileName - Name of the tile  
 * @param {Object} timing - Frame timing data
 */
    onTileFrame(tileName, timing) {
        const now = performance.now();

        if (!this.syncEnabled) {
            this.updateMergedCanvas();
            return;
        }

        // Mark this tile as having a fresh frame
        this.frameReadyMap.set(tileName, now);

        // Debug: Show tile arrival
        const readyTiles = Array.from(this.frameReadyMap.keys());
        console.log(`📡 Tile ${tileName} arrived. Ready tiles: [${readyTiles.join(', ')}] (${readyTiles.length}/4)`);

        // Try to trigger synchronized update
        this.tryUpdateWithSync();
    }

    /**
     * Try to update canvas with synchronization
     */
    tryUpdateWithSync() {
        if (this.pendingUpdate) return; // Already waiting for sync

        const now = performance.now();
        const connectedTileNames = Object.keys(this.tileCanvases);

        if (connectedTileNames.length === 0) return;

        // Check how many tiles have fresh frames
        const tilesWithFreshFrames = connectedTileNames.filter(tileName => {
            const lastFrameTime = this.frameReadyMap.get(tileName);
            return lastFrameTime && (now - lastFrameTime) < this.maxWaitForSync;
        });

        // Throttle updates to 15fps max for stability
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        if (timeSinceLastUpdate < this.updateThrottle) {
            // Too soon for next update - wait
            if (!this.pendingUpdate) {
                this.pendingUpdate = true;
                const remainingTime = this.updateThrottle - timeSinceLastUpdate;
                setTimeout(() => {
                    this.pendingUpdate = false;
                    this.tryUpdateWithSync();
                }, remainingTime);
            }
            return;
        }

        // ONLY update if we have ALL 4 tiles ready (strict requirement)
        if (tilesWithFreshFrames.length >= this.requiredTiles) {
            this.updateMergedCanvas();
            this.lastUpdateTime = now;

            // Clear frame ready flags for tiles that were used
            tilesWithFreshFrames.forEach(tileName => {
                this.frameReadyMap.delete(tileName);
            });

            console.log(`🎯 PERFECT SYNC: ${tilesWithFreshFrames.length}/${connectedTileNames.length} tiles - ALL TILES READY!`);
        } else if (tilesWithFreshFrames.length > 0 && timeSinceLastUpdate > this.maxWaitForSync) {
            // Emergency fallback - only if we've waited too long
            console.warn(`⚠️ TIMEOUT: Only ${tilesWithFreshFrames.length}/${this.requiredTiles} tiles ready after ${this.maxWaitForSync}ms - forcing update`);
            this.updateMergedCanvas();
            this.lastUpdateTime = now;

            // Clear frame ready flags for tiles that were used
            tilesWithFreshFrames.forEach(tileName => {
                this.frameReadyMap.delete(tileName);
            });
        } else {
            // Wait for more tiles - be patient for ALL 4 tiles
            if (!this.pendingUpdate) {
                this.pendingUpdate = true;
                const waitTime = tilesWithFreshFrames.length > 0 ? 50 : 16; // Wait longer if we have some tiles
                setTimeout(() => {
                    this.pendingUpdate = false;
                    this.tryUpdateWithSync();
                }, waitTime);
            }
        }
    }

    /**
     * Update the merged 4K canvas with all tile data
     */
    updateMergedCanvas() {
        if (!this.mergedContext || this.mode !== 'tiles') return;

        // Clear canvas
        this.mergedContext.clearRect(0, 0, 3840, 2160);

        // Draw each tile
        Object.values(this.tileCanvases).forEach(tile => {
            if (tile.canvas) {
                this.mergedContext.drawImage(
                    tile.canvas,
                    tile.position.x, tile.position.y,
                    1920, 1080
                );
            }
        });

        // Update texture
        if (this.currentTexture) {
            this.currentTexture.needsUpdate = true;
        }
    }

    /**
     * Get current video texture
     * @returns {THREE.Texture} Current video texture
     */
    getTexture() {
        return this.currentTexture;
    }

    /**
     * Get current streaming mode
     * @returns {string} 'tiles' or 'fallback'
     */
    getMode() {
        return this.mode;
    }



    /**
 * Dispose of all resources
 */
    dispose() {

        if (this.currentTexture) {
            this.currentTexture.dispose();
        }

        Object.values(this.tileCanvases).forEach(tile => {
            if (tile.texture) {
                tile.texture.dispose();
            }
        });

        this.tileCanvases = {};
        this.currentTexture = null;
        this.frameReadyMap.clear();

        console.log('SmartVideoManager: Disposed of all resources');
    }
}

export default SmartVideoManager;

