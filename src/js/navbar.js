function createNavbar(pageTitle) {
    const navbar = document.createElement('header');
    navbar.className = 'bg-[#24088E]'; // Purple background
    navbar.innerHTML = `
        <nav class="navbar" style="background: #24088E;">
            <div class="navbar-start">
                <a href="/" class="flex items-center gap-2">
                    <img src="../assets/auzoneLogo.svg" alt="AuZone Logo" class="h-12 w-auto">
                </a>
            </div>
            <div class="navbar-center">
                <h1 class="text-xl font-semibold text-white">${pageTitle}</h1>
            </div>
            <div class="navbar-end">
                <div class="flex items-center gap-4">
                    <!-- Minimalist recording button with tooltip -->
                    <button id="recordingButton" class="rec-btn flex items-center gap-2 px-4 py-1 rounded-full bg-gray-200 text-red-600 font-semibold transition-colors duration-200 focus:outline-none" aria-pressed="false" aria-label="Start Recording">
                        <span class="rec-dot inline-block w-3 h-3 rounded-full bg-red-600"></span>
                        <span class="rec-text">REC</span>
                        <span class="rec-tooltip absolute left-1/2 -translate-x-1/2 top-110% mt-2 px-2 py-1 rounded bg-gray-900 text-white text-xs opacity-0 pointer-events-none transition-opacity">Start Recording</span>
                    </button>
                    <!-- Add MCAP Files button -->
                    <div class="relative">
                        <button class="btn btn-ghost btn-circle" onclick="showMcapDialog()" id="mcapDialogBtn">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </button>
                    </div>
                    <!-- Mode Indicator with Tooltip -->
                    <div id="modeIndicator" class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 flex items-center gap-2">
                        <span id="modeText">Loading...</span>
                    </div>
                    <!-- Quick Status Container -->
                    <div id="statusContainer" class="relative flex items-center gap-2">
                        <div class="service-info-btn-wrapper relative">
                            <!-- Info Button for Service Status (moved before gear) -->
                            <button class="btn btn-ghost btn-circle service-info-btn" title="Service Info" onclick="showServiceStatus()">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.15rem; height: 1.15rem;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                            </button>
                            <!-- Quick Status Tooltip -->
                            <div id="serviceStatusTooltip" class="hidden absolute" style="">
                                <div id="quickStatusContent" class="text-sm">
                                    Loading status...
                                </div>
                            </div>
                        </div>
                        <!-- Settings Gear Button (outside .relative) -->
                        <button class="btn btn-ghost btn-circle" onclick="window.location.href='/settings'">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `;

    // Add styles for recording button
    const style = document.createElement('style');
    style.textContent = `
        .rec-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            font-weight: 600;
            background: #e5e7eb;
            color: #111;
            border: none;
            border-radius: 9999px;
            padding: 0.25rem 1.1rem;
            cursor: pointer;
            transition: background 0.2s, color 0.2s;
            position: relative;
            outline: none;
            box-shadow: none;
        }
        .rec-btn.recording {
            background: #dc2626;
            color: white;
        }
        .rec-btn .rec-dot {
            background: #111;
            width: 0.75rem;
            height: 0.75rem;
            border-radius: 9999px;
            transition: background 0.2s;
        }
        .rec-btn.recording .rec-dot {
            background: white;
            animation: rec-pulse-minimal 1s infinite;
        }
        @keyframes rec-pulse-minimal {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
        .rec-btn .rec-tooltip {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            top: 110%;
            margin-top: 0.5rem;
            background: #111827;
            color: #fff;
            padding: 0.25rem 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.75rem;
            opacity: 0;
            pointer-events: none;
            white-space: nowrap;
            z-index: 10;
            transition: opacity 0.2s;
        }
        .rec-btn:hover .rec-tooltip,
        .rec-btn:focus .rec-tooltip {
            opacity: 1;
        }
        .rec-btn .rec-text {
            font-size: 1.1rem;
            font-weight: bold;
            transition: opacity 0.3s;
        }
        .rec-btn .rec-icon {
            color: inherit;
        }

        #modeIndicator {
            transition: all 0.3s ease;
            white-space: nowrap;
        }

        .navbar-end .btn-circle svg {
            width: 24px;
            height: 24px;
            color: white;
        }

        .navbar-end .btn-circle:hover svg {
            color: #e2e8f0;
        }

        .navbar-end .menu {
            display: flex;
            align-items: center;
        }

        .navbar-end .btn-circle.btn-lg {
            width: 3rem;
            height: 3rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .navbar-end .btn-circle.btn-lg svg {
            margin-top: -5px;
            width: 25px;
            height: 25px;
            color: white;
        }

        .navbar-end .btn-circle.btn-lg:hover svg {
            color: #e2e8f0;
        }

        #serviceStatusTooltip {
            position: absolute;
            top: 100%;
            right: 0;
            left: auto;
            transform: none;
            margin-top: 0.75rem;
            width: 16rem;
            max-width: 90vw;
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
            padding: 1rem;
            z-index: 50;
            display: none;
            transition: all 0.2s ease;
            pointer-events: none;
        }
        #serviceStatusTooltip * {
            pointer-events: auto;
        }
        .service-info-btn:hover + #serviceStatusTooltip,
        .service-info-btn:focus + #serviceStatusTooltip {
            display: block;
        }

        .mcap-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.25rem;
            height: 2.25rem;
            border-radius: 9999px;
            border: none;
            outline: none;
            cursor: pointer;
            transition: background 0.15s;
            font-size: 1rem;
            padding: 0;
        }
        .mcap-btn-blue {
            background: #4285f4;
            color: #fff;
        }
        .mcap-btn-blue:hover {
            background: #1a73e8;
        }
    `;
    document.head.appendChild(style);

    return navbar;
}

// Function to initialize the navbar
function initNavbar(pageTitle) {
    // Create the navbar
    const navbar = createNavbar(pageTitle);

    // Insert the navbar at the beginning of the body
    document.body.insertBefore(navbar, document.body.firstChild);

    // Add recording button logic
    setTimeout(() => {
        const recordingButton = document.getElementById('recordingButton');
        if (recordingButton) {
            // Tooltip logic
            recordingButton.addEventListener('mouseenter', function () {
                const tooltip = recordingButton.querySelector('.rec-tooltip');
                if (tooltip) tooltip.style.opacity = 1;
            });
            recordingButton.addEventListener('mouseleave', function () {
                const tooltip = recordingButton.querySelector('.rec-tooltip');
                if (tooltip) tooltip.style.opacity = 0;
            });
            // Click event
            recordingButton.addEventListener('click', function () {
                if (recordingButton.classList.contains('recording')) {
                    stopRecording();
                } else {
                    startRecording();
                }
            });
        }

        // --- NEW: Set UI from localStorage cache immediately ---
        const cachedStatus = localStorage.getItem('recordingStatus');
        if (cachedStatus === 'recording') {
            updateRecordingUI(true);
        } else if (cachedStatus === 'not-recording') {
            updateRecordingUI(false);
        }

        // Listen for storage events to sync across tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'recordingStatus') {
                if (event.newValue === 'recording') {
                    updateRecordingUI(true);
                } else if (event.newValue === 'not-recording') {
                    updateRecordingUI(false);
                }
            }
        });

        // Initialize service cache if not already initialized
        if (window.serviceCache && !window.serviceCache.isInitialized) {
            window.serviceCache.startBackgroundUpdates();
        } else if (!window.serviceCache) {
            console.warn('Service cache not initialized yet');
            // Try to initialize when service cache becomes available
            const checkServiceCache = setInterval(() => {
                if (window.serviceCache) {
                    window.serviceCache.startBackgroundUpdates();
                    clearInterval(checkServiceCache);
                }
            }, 100);
        }

        // Initial status check using cached data
        const updateUIFromCache = () => {
            if (!window.serviceCache) return;

            const serviceStatuses = window.serviceCache.serviceStatuses;
            const replayStatus = window.serviceCache.replayStatus;

            // Update UI with cached data immediately
            if (serviceStatuses) {
                updateQuickStatus();
            }
            if (replayStatus !== null) {
                checkReplayStatus();
            }
            checkRecordingStatus();
        };

        // Update UI immediately with cached data
        updateUIFromCache();

        // Register for updates when new data arrives
        if (window.serviceCache) {
            window.serviceCache.registerUpdateCallback(updateUIFromCache);
        }
    }, 0);
}

let navbarRecordingFile = null;

function checkRecordingStatus() {
    fetch('/recorder-status')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.text();
        })
        .then(statusText => {
            const isRecording = statusText.trim() === "Recorder is running";
            if (isRecording) {
                return fetch('/current-recording')
                    .then(response => response.json())
                    .then(data => {
                        navbarRecordingFile = data.status === "recording" ? data.filename : null;
                        updateRecordingUI(isRecording);
                    });
            } else {
                navbarRecordingFile = null;
                updateRecordingUI(false);
            }
        })
        .catch(error => {
            console.error('Error checking recording status:', error);
            navbarRecordingFile = null;
            updateRecordingUI(false);
        });
}

function updateRecordingUI(isRecording) {
    const recordingButton = document.getElementById('recordingButton');
    if (recordingButton) {
        const recText = recordingButton.querySelector('.rec-text');
        const recDot = recordingButton.querySelector('.rec-dot');
        const tooltip = recordingButton.querySelector('.rec-tooltip');
        if (isRecording) {
            recordingButton.classList.add('recording');
            recordingButton.setAttribute('aria-pressed', 'true');
            recordingButton.setAttribute('aria-label', 'Stop Recording');
            if (recText) recText.textContent = 'REC';
            if (tooltip) tooltip.textContent = 'Stop Recording';
            if (recDot) recDot.style.background = 'white';
            localStorage.setItem('recordingStatus', 'recording');
        } else {
            recordingButton.classList.remove('recording');
            recordingButton.setAttribute('aria-pressed', 'false');
            recordingButton.setAttribute('aria-label', 'Start Recording');
            if (recText) recText.textContent = 'REC';
            if (tooltip) tooltip.textContent = 'Start Recording';
            if (recDot) recDot.style.background = '#111';
            localStorage.setItem('recordingStatus', 'not-recording');
        }
    }
}

function showRecCheckmark() {
    const recordingButton = document.getElementById('recordingButton');
    if (recordingButton) {
        const recCheck = recordingButton.querySelector('.rec-check');
        if (recCheck) {
            recCheck.classList.remove('hidden');
            setTimeout(() => {
                recCheck.classList.add('hidden');
            }, 900);
        }
    }
}

function startRecording() {
    console.log("startRecording called");
    fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
        .then(response => {
            console.log("/start response status:", response.status);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('Recording started:', text);
            navbarRecordingFile = null;
            updateRecordingUI(true);
            showRecCheckmark();
        })
        .catch(error => {
            console.error('Error starting recording:', error);
            alert(`Error starting recording: ${error.message}`);
            updateRecordingUI(false);
        });
}

function stopRecording() {
    console.log("stopRecording called");
    fetch('/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
        .then(response => {
            console.log("/stop response status:", response.status);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return response.text();
        })
        .then(text => {
            console.log('Recording stopped:', text);
            navbarRecordingFile = null;
            updateRecordingUI(false);
            showRecCheckmark();
        })
        .catch(error => {
            console.error('Error stopping recording:', error);
            alert(`Error stopping recording: ${error.message}`);
            updateRecordingUI(true);
        });
}

function ensureFileDetailsModal() {
    if (!document.getElementById('myModal')) {
        const dialog = document.createElement('dialog');
        dialog.id = 'myModal';
        dialog.className = 'bg-white rounded-lg shadow-lg p-6 w-[600px]';
        dialog.innerHTML = '<div id="modalDetails"></div>';
        document.body.appendChild(dialog);
    }
} 