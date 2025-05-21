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
    let dialog = document.getElementById('mcapDialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'mcapDialog';
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-box" style="padding: 0; min-width: 60vw; max-width: 90vw; width: 100%;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem 0.5rem 1.5rem; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="font-bold text-lg">MCAP Files</span>
                    </div>
                    <button onclick="hideMcapDialog()" style="background: none; border: none; cursor: pointer; padding: 0.25rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.5rem; height: 1.5rem; color: #888;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div id="mcapDialogContent" class="space-y-2" style="padding: 1rem 1.5rem 1.5rem 1.5rem; max-height: 70vh; overflow-y: auto;"></div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    dialog.showModal();
    const content = document.getElementById('mcapDialogContent');

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
                const dirName = data.dir_name || '';
                content.innerHTML = `
                    <div style="overflow-x:auto; width:100%;">
                        <table style="width:100%; border-collapse:separate; border-spacing:0 0.5rem; font-size:1.05rem;">
                            <thead>
                                <tr style="text-align:left; color:#fff; background:#23272f;">
                                    <th style="padding:0.5rem 0.5rem;">Play</th>
                                    <th style="padding:0.5rem 0.5rem;">File Name</th>
                                    <th style="padding:0.5rem 0.5rem;">Size</th>
                                    <th style="padding:0.5rem 0.5rem;">Date/Time</th>
                                    <th style="padding:0.5rem 0.5rem; text-align:center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${files.map(file => {
                    const date = file.created ? new Date(file.created) : null;
                    const dateStr = date ? date.toLocaleDateString() : '--';
                    const timeStr = date ? date.toLocaleTimeString() : '';
                    return `
                                    <tr style="background:#23272f; border-radius:0.5rem;">
                                        <td style="padding:0.5rem 0.5rem; text-align:center;">
                                            <button class="mcap-btn mcap-btn-gray" title="Play" onclick="playMcap('${file.name}')">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;"><path d="M8 5v14l11-7z"/></svg>
                                            </button>
                                        </td>
                                        <td style="padding:0.5rem 0.5rem; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#fff; font-weight:600;">${file.name}</td>
                                        <td style="padding:0.5rem 0.5rem; color:#b0b0b0;">${file.size} MB</td>
                                        <td style="padding:0.5rem 0.5rem; color:#b0b0b0;">${dateStr} <span style='color:#888;'>${timeStr}</span></td>
                                        <td style="padding:0.5rem 0.5rem; text-align:center;">
                                            <div style="display:flex; gap:0.5rem; justify-content:center; align-items:center;">
                                                <button class="mcap-btn mcap-btn-blue" title="Info" onclick='showModal(${JSON.stringify(file.topics)})'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.15rem; height: 1.15rem;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                                </button>
                                                <a class="mcap-btn mcap-btn-green" href="/download/${dirName}/${file.name}" title="Download">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                                </a>
                                                <button class="mcap-btn mcap-btn-red" title="Delete" onclick="deleteFile('${file.name}', '${dirName}')">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                }).join('')}
                            </tbody>
                        </table>
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
    } catch (error) {
        content.innerHTML = `<div class="text-red-600">Error connecting to server</div>`;
    }
};

window.hideMcapDialog = function () {
    const dialog = document.getElementById('mcapDialog');
    if (dialog) {
        dialog.close();
    }
    if (mcapSocket) {
        mcapSocket.close();
        mcapSocket = null;
        window.mcapSocket = null;
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

    // Responsive grid: 2 columns on desktop, 1 on mobile
    modalDetails.innerHTML = `
        <style>
            @media (min-width: 640px) {
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
            }
            @media (max-width: 639px) {
                .details-grid { display: flex; flex-direction: column; gap: 1.5rem; }
            }
            .details-card { background: #f7fafc; border-radius: 0.75rem; padding: 1.25rem 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
            .details-topic { font-weight: 600; color: #222; margin-bottom: 0.75rem; font-size: 1.08rem; }
            .details-table { width: 100%; font-size: 1.05rem; color: #222; }
            .details-table td { padding: 0.15rem 0.5rem 0.15rem 0; }
            .details-key { color: #555; font-weight: 500; }
            .details-value { color: #222; text-align: right; }
        </style>
        <div class="mb-4">
            <h3 class="text-xl font-semibold text-gray-800">File Details</h3>
        </div>
        <div class="details-grid">
            ${Object.entries(topics).map(([topic, details]) => {
        // Prepare filtered details: rename 'Message Count' to 'Frames', remove 'Video Length' and 'video_length'
        const filtered = Object.entries(details)
            .filter(([key]) => key.toLowerCase() !== 'video length' && key.toLowerCase() !== 'video_length')
            .map(([key, value]) => {
                let displayKey = key;
                if (key.toLowerCase() === 'message count' || key.toLowerCase() === 'message_count') displayKey = 'Frames';
                return [displayKey, value];
            });
        return `
                    <div class="details-card">
                        <div class="details-topic">${topic}</div>
                        <table class="details-table">
                            <tbody>
                                ${filtered.map(([key, value]) => `
                                    <tr>
                                        <td class="details-key">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                                        <td class="details-value">${typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : value}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
    }).join('')}
        </div>
        <div class="flex justify-end mt-6">
            <button id="closeModalBtn" class="bg-[#4285f4] text-white px-4 py-2 rounded hover:bg-blue-600">
                CLOSE
            </button>
        </div>
    `;

    // Make the close button work
    setTimeout(() => {
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.onclick = () => { modal.close(); };
        }
    }, 0);

    modal.showModal(); // Ensure the modal is shown
}
