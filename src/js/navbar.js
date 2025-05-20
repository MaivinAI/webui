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
                    <!-- Recorder Indicator -->
                    <div id="recorderIndicator" class="hidden">
                        <div class="relative group">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <div class="absolute bottom-full right-0 mb-2 w-48 p-2 bg-white rounded-lg shadow-lg text-sm hidden group-hover:block">
                                Recording in progress
                            </div>
                        </div>
                    </div>

                    <!-- Status Container -->
                    <div class="flex items-center gap-2">
                        <div id="modeIndicator" class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 flex items-center gap-2">
                            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span id="modeText">Checking Status...</span>
                        </div>

                        <!-- Service Status Button -->
                        <div class="relative group">
                            <button onclick="showServiceStatus()" class="p-2 text-white hover:text-gray-200 rounded-full hover:bg-[#3a1bb4] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                                    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <circle cx="12" cy="8" r="1" fill="currentColor"/>
                                </svg>
                            </button>
                            <div class="absolute top-full right-0 mt-2 w-64 p-4 bg-white rounded-lg shadow-lg text-sm hidden group-hover:block">
                                <div id="quickStatusContent" class="text-center">
                                    <div class="animate-pulse flex items-center justify-center gap-2">
                                        <div class="h-2 w-2 bg-gray-400 rounded-full"></div>
                                        <div class="h-2 w-2 bg-gray-400 rounded-full"></div>
                                        <div class="h-2 w-2 bg-gray-400 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Settings Button -->
                        <a href="/settings" class="p-2 text-white hover:text-gray-200 rounded-full hover:bg-[#3a1bb4] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    `;

    // Add service status dialog
    const dialog = document.createElement('div');
    dialog.id = 'serviceStatusDialog';
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900">Service Status</h3>
                <button onclick="hideServiceStatus()" class="text-gray-400 hover:text-gray-500">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div id="serviceStatusContent" class="p-4 max-h-[60vh] overflow-y-auto">
                <div class="animate-pulse space-y-3">
                    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div class="h-4 bg-gray-200 rounded"></div>
                    <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
            </div>
        </div>
    `;

    document.body.insertBefore(navbar, document.body.firstChild);
    document.body.appendChild(dialog);
}

// Function to initialize the navbar
function initNavbar(pageTitle) {
    // Create the navbar
    createNavbar(pageTitle);

    // Initialize status checks
    checkReplayStatus();
    checkRecorderStatus();

    // Set up interval for status checks
    const statusCheckInterval = setInterval(() => {
        checkReplayStatus();
        checkRecorderStatus();
    }, 5000);

    // Clean up interval when page is unloaded
    window.addEventListener('beforeunload', () => {
        clearInterval(statusCheckInterval);
    });
} 