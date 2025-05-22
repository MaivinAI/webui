// Service status cache implementation
const CACHE_DURATION = 2000; // 2 seconds cache duration
const BACKGROUND_UPDATE_INTERVAL = 5000; // 5 seconds between background updates
const STORAGE_KEY = 'serviceCacheData';

// Initialize the cache object immediately
window.serviceCache = {
    deviceData: null,
    serviceStatuses: null,
    replayStatus: null,
    lastUpdate: 0,
    isInitialized: false,
    backgroundUpdateTimer: null,
    updateCallbacks: new Set(),
    // Add placeholder functions that will be replaced
    getDeviceData: async () => null,
    getServiceStatuses: async () => null,
    getReplayStatus: async () => null,
    clearCache: () => { },
    startBackgroundUpdates: () => { },
    stopBackgroundUpdates: () => { },
    registerUpdateCallback: () => { },
    unregisterUpdateCallback: () => { }
};

// Load cached data from localStorage
function loadFromStorage() {
    try {
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
            const { deviceData, serviceStatuses, replayStatus, lastUpdate } = JSON.parse(cachedData);
            window.serviceCache.deviceData = deviceData;
            window.serviceCache.serviceStatuses = serviceStatuses;
            window.serviceCache.replayStatus = replayStatus;
            window.serviceCache.lastUpdate = lastUpdate;
            return true;
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
    return false;
}

// Save cache data to localStorage
function saveToStorage() {
    try {
        const dataToStore = {
            deviceData: window.serviceCache.deviceData,
            serviceStatuses: window.serviceCache.serviceStatuses,
            replayStatus: window.serviceCache.replayStatus,
            lastUpdate: window.serviceCache.lastUpdate
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Function to perform background updates
async function performBackgroundUpdate() {
    try {
        const deviceResponse = await fetch('/config/webui/details');
        if (!deviceResponse.ok) throw new Error(`HTTP error! status: ${deviceResponse.status}`);
        const deviceData = await deviceResponse.json();

        const isRaivin = deviceData.DEVICE?.toLowerCase().includes('raivin');
        const baseServices = ["camera", "imu", "navsat", "model"];
        const raivinServices = ["radarpub", "fusion"];
        const services = isRaivin ? [...baseServices, ...raivinServices] : baseServices;

        const serviceResponse = await fetch('/config/service/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ services })
        });
        if (!serviceResponse.ok) throw new Error(`HTTP error! status: ${serviceResponse.status}`);
        const serviceStatuses = await serviceResponse.json();

        const replayResponse = await fetch('/replay-status');
        if (!replayResponse.ok) throw new Error(`HTTP error! status: ${replayResponse.status}`);
        const statusText = await replayResponse.text();
        const replayStatus = statusText.trim() === "Replay is running";

        // Only update if data has changed
        if (JSON.stringify(window.serviceCache.deviceData) !== JSON.stringify(deviceData) ||
            JSON.stringify(window.serviceCache.serviceStatuses) !== JSON.stringify(serviceStatuses) ||
            window.serviceCache.replayStatus !== replayStatus) {

            window.serviceCache.deviceData = deviceData;
            window.serviceCache.serviceStatuses = serviceStatuses;
            window.serviceCache.replayStatus = replayStatus;
            window.serviceCache.lastUpdate = Date.now();

            // Save to localStorage when data changes
            saveToStorage();

            // Notify all registered callbacks
            window.serviceCache.updateCallbacks.forEach(callback => callback());
        }
    } catch (error) {
        console.error('Error during background update:', error);
    }
}

// Function to start background updates
function startBackgroundUpdates() {
    if (!window.serviceCache.backgroundUpdateTimer) {
        // Load cached data first
        loadFromStorage();

        // Perform initial update immediately
        performBackgroundUpdate();

        // Then set up interval for subsequent updates
        window.serviceCache.backgroundUpdateTimer = setInterval(performBackgroundUpdate, BACKGROUND_UPDATE_INTERVAL);
        window.serviceCache.isInitialized = true;
    }
}

// Function to stop background updates
function stopBackgroundUpdates() {
    if (window.serviceCache.backgroundUpdateTimer) {
        clearInterval(window.serviceCache.backgroundUpdateTimer);
        window.serviceCache.backgroundUpdateTimer = null;
    }
}

// Function to register a callback for cache updates
function registerUpdateCallback(callback) {
    window.serviceCache.updateCallbacks.add(callback);
}

// Function to unregister a callback
function unregisterUpdateCallback(callback) {
    window.serviceCache.updateCallbacks.delete(callback);
}

// Function to get device data
async function getDeviceData() {
    if (!window.serviceCache.isInitialized) {
        await performBackgroundUpdate();
    }
    return window.serviceCache.deviceData;
}

// Function to get service statuses
async function getServiceStatuses(services) {
    if (!window.serviceCache.isInitialized) {
        await performBackgroundUpdate();
    }
    return window.serviceCache.serviceStatuses;
}

// Function to get replay status
async function getReplayStatus() {
    if (!window.serviceCache.isInitialized) {
        await performBackgroundUpdate();
    }
    return window.serviceCache.replayStatus;
}

// Function to clear cache and force refresh
function clearCache() {
    stopBackgroundUpdates();
    window.serviceCache = {
        deviceData: null,
        serviceStatuses: null,
        replayStatus: null,
        lastUpdate: 0,
        isInitialized: false,
        backgroundUpdateTimer: null,
        updateCallbacks: new Set()
    };
    localStorage.removeItem(STORAGE_KEY);
    startBackgroundUpdates();
}

// Update the service cache object with the actual functions
Object.assign(window.serviceCache, {
    getDeviceData,
    getServiceStatuses,
    getReplayStatus,
    clearCache,
    startBackgroundUpdates,
    stopBackgroundUpdates,
    registerUpdateCallback,
    unregisterUpdateCallback
});

// Start background updates when the page loads
window.addEventListener('load', () => {
    if (!window.serviceCache.backgroundUpdateTimer) {
        startBackgroundUpdates();
    }
});

// Stop background updates when the page unloads
window.addEventListener('beforeunload', () => {
    stopBackgroundUpdates();
}); 