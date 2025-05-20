async function checkReplayStatus() {
    try {
        const deviceResponse = await fetch('/config/webui/details');
        if (!deviceResponse.ok) throw new Error(`HTTP error! status: ${deviceResponse.status}`);
        const deviceData = await deviceResponse.json();
        const isRaivin = deviceData.DEVICE?.toLowerCase().includes('raivin');
        console.log(isRaivin);
        // Check services status
        const services = isRaivin ?
            ["camera", "imu", "navsat", "radarpub"] :
            ["camera", "imu", "navsat"];
        const serviceResponse = await fetch('/config/service/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ services })
        });

        if (!serviceResponse.ok) throw new Error(`HTTP error! status: ${serviceResponse.status}`);
        const serviceStatuses = await serviceResponse.json();

        // Check critical services
        const statusMap = serviceStatuses.reduce((acc, { service, status }) => {
            acc[service] = status;
            return acc;
        }, {});

        // Check replay status
        const replayResponse = await fetch('/replay-status');
        if (!replayResponse.ok) throw new Error(`HTTP error! status: ${replayResponse.status}`);
        const statusText = await replayResponse.text();
        const isReplay = statusText.trim() === "Replay is running";

        const modeIndicator = document.getElementById('modeIndicator');
        const modeText = document.getElementById('modeText');
        const loadingSpinner = modeIndicator.querySelector('svg.animate-spin');
        if (loadingSpinner) {
            loadingSpinner.remove();
        }
        const allSensorsInactive = services.every(service => statusMap[service] !== 'running');
        const allSensorActive = services.every(service => statusMap[service] === 'running');
        if (allSensorsInactive && !isReplay) {
            modeText.textContent = "Stopped";
            modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-2";
        }
        else if (isReplay) {
            if (!allSensorsInactive) {
                modeText.textContent = "Replay Mode (Degraded)";
                modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-2";
            } else {
                modeText.textContent = "Replay Mode";
                modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 flex items-center gap-2";
            }
        } else {
            const isCameraDown = !statusMap['camera'] || statusMap['camera'] !== 'running';
            const isradarpubDown = !statusMap['radarpub'] || statusMap['radarpub'] !== 'running';
            const isDegraded = (isRaivin && isradarpubDown) || isCameraDown;

            if (!allSensorActive) {
                modeText.textContent = "Live Mode (Degraded)";
                modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 flex items-center gap-2";
            } else {
                modeText.textContent = "Live Mode";
                modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 flex items-center gap-2";
            }
        }

        // Update quick status
        await updateQuickStatus();
    } catch (error) {
        console.error('Error checking replay status:', error);
        const modeIndicator = document.getElementById('modeIndicator');
        const modeText = document.getElementById('modeText');
        const loadingSpinner = modeIndicator.querySelector('svg.animate-spin');
        if (loadingSpinner) loadingSpinner.remove();
        modeText.textContent = "Status Unknown";
        modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 flex items-center gap-2";
    }
}

async function checkRecorderStatus() {
    try {
        const response = await fetch('/recorder-status');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const statusText = await response.text();
        const isRecording = statusText.trim() === "Recorder is running";

        const recorderIndicator = document.getElementById('recorderIndicator');

        if (isRecording) {
            recorderIndicator.classList.remove('hidden');
            recorderIndicator.className = "text-red-600 animate-pulse relative group";
        } else {
            recorderIndicator.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking recorder status:', error);
        const recorderIndicator = document.getElementById('recorderIndicator');
        recorderIndicator.classList.add('hidden');
    }
}

window.showServiceStatus = async function () {
    const dialog = document.getElementById('serviceStatusDialog');
    const content = document.getElementById('serviceStatusContent');

    // Show dialog
    dialog.classList.remove('hidden');

    try {
        // First get device type
        const deviceResponse = await fetch('/config/webui/details');
        if (!deviceResponse.ok) throw new Error(`HTTP error! status: ${deviceResponse.status}`);
        const deviceData = await deviceResponse.json();
        const isRaivin = deviceData.DEVICE?.toLowerCase().includes('raivin');
        const baseServices = ["camera", "imu", "navsat", "model"];
        const raivinServices = ["radarpub", "fusion"];
        const services = isRaivin ? [...baseServices, ...raivinServices] : baseServices;

        const response = await fetch('/config/service/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ services })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const serviceStatuses = await response.json();
        content.innerHTML = '';

        serviceStatuses.forEach(({ service, status, enabled }) => {
            const isRunning = status === 'running';
            const isEnabled = enabled === 'enabled';

            const statusColor = isRunning ? 'bg-green-500' : 'bg-red-500';
            const enabledColor = isEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600';

            const serviceName = service
                .replace('.service', '')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            content.innerHTML += `
                <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="flex flex-col gap-1">
                        <span class="text-sm font-medium text-gray-900">${serviceName}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full ${enabledColor} inline-flex items-center w-fit">
                            ${isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium ${isRunning ? 'text-green-600' : 'text-red-600'}">
                            ${isRunning ? 'Running' : 'Stopped'}
                        </span>
                        <div class="w-2 h-2 rounded-full ${statusColor}"></div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error fetching service status:', error);
        content.innerHTML = `
            <div class="flex items-center gap-2 p-3 text-red-800 bg-red-50 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="text-sm font-medium">Error loading service status</span>
            </div>
        `;
    }
}

window.hideServiceStatus = function () {
    const dialog = document.getElementById('serviceStatusDialog');
    dialog.classList.add('hidden');
}

async function updateQuickStatus() {
    try {
        const deviceResponse = await fetch('/config/webui/details');
        if (!deviceResponse.ok) throw new Error(`HTTP error! status: ${deviceResponse.status}`);
        const deviceData = await deviceResponse.json();
        const isRaivin = deviceData.DEVICE?.toLowerCase().includes('raivin');

        const baseServices = ["camera", "imu", "navsat", "model"];
        const raivinServices = ["radarpub", "fusion"];
        const services = isRaivin ? [...baseServices, ...raivinServices] : baseServices;

        const response = await fetch('/config/service/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ services })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const serviceStatuses = await response.json();
        const quickStatusContent = document.getElementById('quickStatusContent');
        const nonRunningServices = serviceStatuses.filter(({ status }) => status !== 'running');

        if (nonRunningServices.length === 0) {
            quickStatusContent.innerHTML = `
                <div class="flex items-center justify-center text-green-600">
                    <span class="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    All Services Running
                </div>
            `;
        } else {
            quickStatusContent.innerHTML = `
                <div class="text-red-600 mb-2">
                    <span class="h-2 w-2 rounded-full bg-red-500 mr-2 inline-block"></span>
                    Inactive Services:
                </div>
            `;

            nonRunningServices.forEach(({ service }) => {
                const serviceName = service
                    .replace('.service', '')
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                quickStatusContent.innerHTML += `
                    <div class="flex items-center justify-between text-gray-600">
                        <span>${serviceName}</span>
                        <span class="text-red-500">Inactive</span>
                    </div>
                `;
            });
        }

        quickStatusContent.innerHTML += `
            <button onclick="showServiceStatus()" class="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1">
                <span>Click for more details</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        `;
    } catch (error) {
        console.error('Error updating quick status:', error);
        const quickStatusContent = document.getElementById('quickStatusContent');
        quickStatusContent.innerHTML = `
            <div class="text-red-600">
                Error checking service status
            </div>
        `;
    }
} 