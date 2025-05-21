async function checkReplayStatus() {
    try {
        const deviceData = await window.serviceCache.getDeviceData();
        const serviceStatuses = await window.serviceCache.getServiceStatuses();
        const isRaivin = deviceData.DEVICE?.toLowerCase().includes('raivin');

        // Check critical services
        const statusMap = serviceStatuses.reduce((acc, { service, status }) => {
            acc[service] = status;
            return acc;
        }, {});

        const isReplay = await window.serviceCache.getReplayStatus();

        const modeIndicator = document.getElementById('modeIndicator');
        const modeText = document.getElementById('modeText');
        const loadingSpinner = modeIndicator.querySelector('svg.animate-spin');
        if (loadingSpinner) {
            loadingSpinner.remove();
        }
        const allSensorsInactive = Object.values(statusMap).every(status => status !== 'running');
        const allSensorActive = Object.values(statusMap).every(status => status === 'running');
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
            const isradarpubDown = !statusMap['radarpub'] || statusMap['radarpub'] !== 'running';
            const isCameraDown = !statusMap['camera'] || statusMap['camera'] !== 'running';
            const isDegraded = (isRaivin && isradarpubDown) || isCameraDown;

            if (!allSensorActive) {
                modeText.textContent = "Live Mode (Degraded)";
                modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 flex items-center gap-2";
            } else {
                modeText.textContent = "Live Mode";
                modeIndicator.className = "px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 flex items-center gap-2";
            }
        }
    } catch (error) {
        console.error('Error checking replay status:', error);
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
        if (typeof window.updateRecordingUI === 'function') {
            window.updateRecordingUI(isRecording);
        }
    } catch (error) {
        if (typeof window.updateRecordingUI === 'function') {
            window.updateRecordingUI(false);
        }
    }
}

window.showServiceStatus = async function () {
    let dialog = document.getElementById('serviceStatusDialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'serviceStatusDialog';
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-box">
                <h3 class="font-bold text-lg mb-4">Service Status</h3>
                <div id="serviceStatusContent" class="space-y-2">
                    <div class="flex items-center justify-center">
                        <span class="loading loading-spinner loading-md"></span>
                    </div>
                </div>
                <div class="modal-action">
                    <button class="btn" onclick="hideServiceStatus()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    dialog.showModal();

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
        const content = document.getElementById('serviceStatusContent');
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
        const content = document.getElementById('serviceStatusContent');
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
    if (dialog) {
        dialog.close();
    }

    // Close WebSocket connection when dialog is closed
    if (mcapSocket) {
        mcapSocket.close();
        mcapSocket = null;
        window.mcapSocket = null;
    }
};

async function updateQuickStatus() {
    try {
        const serviceStatuses = await window.serviceCache.getServiceStatuses();
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
                <div class="flex items-center justify-center text-red-600 mb-2">
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
    }
}

let mcapSocket = null;
window.mcapSocket = mcapSocket;

window.showMcapDialog = async function () {
    const dialog = document.getElementById('serviceStatusDialog');
    if (!dialog) {
        // Create the dialog if it doesn't exist
        const newDialog = document.createElement('dialog');
        newDialog.id = 'serviceStatusDialog';
        newDialog.className = 'modal';
        newDialog.innerHTML = `
            <div class="modal-box" style="padding: 0; min-width: 350px; max-width: 400px;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem 0.5rem 1.5rem; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="font-bold text-lg">MCAP Files</span>
                    </div>
                    <button onclick="hideServiceStatus()" style="background: none; border: none; cursor: pointer; padding: 0.25rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.5rem; height: 1.5rem; color: #888;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div id="serviceStatusContent" class="space-y-2" style="padding: 1rem 1.5rem 1.5rem 1.5rem;"></div>
            </div>
        `;
        document.body.appendChild(newDialog);
    }

    // Show the dialog
    const dialogElement = document.getElementById('serviceStatusDialog');
    const content = document.getElementById('serviceStatusContent');

    // Close existing socket if any
    if (mcapSocket) {
        mcapSocket.close();
        mcapSocket = null;
        window.mcapSocket = null;
    }

    try {
        // Create WebSocket connection
        mcapSocket = new WebSocket('/mcap/');
        window.mcapSocket = mcapSocket;

        mcapSocket.onopen = () => {
            mcapSocket.send(JSON.stringify({ action: 'list_files' }));
        };

        mcapSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.error) {
                    content.innerHTML = `<div class="text-red-600">Error: ${data.error}</div>`;
                    return;
                }
                const files = data.files || [];
                if (files.length === 0) {
                    content.innerHTML = `<div class="text-gray-600 text-center py-4">No MCAP files found</div>`;
                    return;
                }
                files.sort((a, b) => new Date(b.created) - new Date(a.created));
                content.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        ${files.map(file => `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                <button class="mcap-btn mcap-btn-gray" style="margin-right: 0.75rem;" title="Play" onclick="playMcap('${file.name}')">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;"><path d="M8 5v14l11-7z"/></svg>
                                </button>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 600; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
                                    <div style="font-size: 0.95em; color: #888;">${file.size} MB &bull; ${file.average_video_length ? file.average_video_length.toFixed(2) : '--'}s</div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="mcap-btn mcap-btn-blue" title="Info" onclick='showModal(${JSON.stringify(file.topics)})'>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.15rem; height: 1.15rem;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                    </button>
                                    <a class="mcap-btn mcap-btn-green" href="/download/${data.dir_name || ''}/${file.name}" title="Download">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                    </a>
                                    <button class="mcap-btn mcap-btn-red" title="Delete" onclick="deleteFile('${file.name}', '${data.dir_name || ''}')">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (error) {
                content.innerHTML = `<div class="text-red-600">Error parsing server response</div>`;
            }
        };
        mcapSocket.onerror = () => {
            content.innerHTML = `<div class="text-red-600">Error connecting to server</div>`;
        };
        mcapSocket.onclose = () => { mcapSocket = null; window.mcapSocket = null; };
        dialogElement.showModal();
    } catch (error) {
        content.innerHTML = `<div class="text-red-600">Error connecting to server</div>`;
    }
};

// Add styles for the MCAP dialog buttons
(function () {
    const style = document.createElement('style');
    style.innerHTML = `
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
        .mcap-btn-gray {
            background: #f3f4f6;
            color: #888;
        }
        .mcap-btn-gray:hover {
            background: #e5e7eb;
        }
        .mcap-btn-green {
            background: #34a853;
            color: #fff;
        }
        .mcap-btn-green:hover {
            background: #2d9248;
        }
        .mcap-btn-red {
            background: #dc3545;
            color: #fff;
        }
        .mcap-btn-red:hover {
            background: #b52a37;
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
})();

window.playMcap = function (fileName) {
    // Implement MCAP playback functionality
    console.log('Playing MCAP file:', fileName);
    // Add your MCAP playback logic here
};

function deleteFile(fileName, directory) {
    console.log('deleteFile called', fileName, directory); // Debug log
    if (fileName === window.currentRecordingFile) {
        alert('Cannot delete file while it is being recorded');
        return;
    }
    const confirmDelete = confirm(`Are you sure you want to delete: ${fileName}?`);
    const params = {
        directory: directory,
        file: fileName
    }
    if (confirmDelete) {
        fetch('/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        }).then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error ${response.status}: ${text}`);
                });
            }
            return response.text();
        }).then(text => {
            console.log('File deleted:', text);
            if (window.mcapSocket && window.mcapSocket.readyState === WebSocket.OPEN) {
                window.mcapSocket.send(JSON.stringify({ action: 'list_files' }));
            }
            if (typeof startPolling === 'function') startPolling();
            if (typeof listMcapFiles === 'function') listMcapFiles();
        }).catch(error => {
            console.error('Error deleting file:', error);
            alert(`Error deleting file: ${error.message}`);
        });
    }
}
window.deleteFile = deleteFile;

function ensureFileDetailsModal() {
    if (!document.getElementById('myModal')) {
        const dialog = document.createElement('dialog');
        dialog.id = 'myModal';
        dialog.className = 'bg-white rounded-lg shadow-lg p-6 w-[600px]';
        dialog.innerHTML = '<div id="modalDetails"></div>';
        document.body.appendChild(dialog);
    }
}

function showModal(topics) {
    ensureFileDetailsModal();
    console.log('showModal called', topics); // Debug log
    const modal = document.getElementById('myModal');
    const modalDetails = document.getElementById('modalDetails');

    if (!modal || !modalDetails) {
        console.error('Modal elements not found');
        return;
    }

    modalDetails.innerHTML = `
        <div class="mb-4">
            <h3 class="text-xl font-semibold text-gray-800">File Details</h3>
        </div>
        <div class="grid grid-cols-2 gap-4">
            ${Object.entries(topics).map(([topic, details]) => `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="font-medium text-gray-800 mb-2">${topic}</div>
                    <div class="grid grid-cols-[80px,1fr] gap-y-2">
                        <span class="text-gray-600">FPS:</span>
                        <span class="text-gray-800">${details.average_fps !== undefined ? details.average_fps.toFixed(2) : '--'}</span>
                        <span class="text-gray-600">Frames:</span>
                        <span class="text-gray-800">${details.message_count !== undefined ? details.message_count : '--'}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="flex justify-end mt-6">
            <button onclick="closeModal()" 
                class="bg-[#4285f4] text-white px-4 py-2 rounded hover:bg-blue-600">
                CLOSE
            </button>
        </div>
    `;

    modal.showModal(); // Ensure the modal is shown
}
window.showModal = showModal;

function closeModal() {
    const modal = document.getElementById('myModal');
    if (modal) modal.close();
}
window.closeModal = closeModal;

// Register callbacks for cache updates
if (window.serviceCache) {
    window.serviceCache.registerUpdateCallback(checkReplayStatus);
    window.serviceCache.registerUpdateCallback(updateQuickStatus);

    // Clean up callbacks when page is unloaded
    window.addEventListener('beforeunload', () => {
        window.serviceCache.unregisterUpdateCallback(checkReplayStatus);
        window.serviceCache.unregisterUpdateCallback(updateQuickStatus);
    });
} else {
    console.warn('Service cache not initialized yet');
    // Try to register callbacks when service cache becomes available
    const checkServiceCache = setInterval(() => {
        if (window.serviceCache) {
            window.serviceCache.registerUpdateCallback(checkReplayStatus);
            window.serviceCache.registerUpdateCallback(updateQuickStatus);
            clearInterval(checkServiceCache);
        }
    }, 100);
} 