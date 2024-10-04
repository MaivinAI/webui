import { CdrReader } from './Cdr.js';

let timeoutId;

function resetTimeout() {
    clearTimeout(timeoutId);
    document.getElementById('timeout').innerText = '';
    timeoutId = setTimeout(() => {
        document.getElementById('timeout').innerText = 'Timeout: Verify if camera service is running';
    }, 15000);
}

function drawBoxes(pCanvas, message) {
    if (!boundingBoxEnabled || !message || !message.boxes || !Array.isArray(message.boxes)) {
        return;
    }

    var canvas = document.getElementById("boxes");

    var ctx = canvas.getContext("2d");
    if (ctx == null) {
        return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < message.boxes.length; i++) {
        const box = message.boxes[i];
        ctx.beginPath();
        ctx.rect((box.center_x - box.width / 2) * 1920, (box.center_y - box.height / 2) * 1080, box.width * 1920, box.height * 1080);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

export default async function h264stream(socketUrl, width, height, canvas) {
    canvas.width = width;
    canvas.height = height;
    canvas.hidden = false;
    const ctx = canvas.getContext("2d");

    const socket = new WebSocket(socketUrl);
    socket.binaryType = "arraybuffer";

    socket.onopen = function (event) {
        console.log('WebSocket connection opened to ' + socketUrl);
    };

    socket.onmessage = function (event) {
        if (event.data instanceof Blob) {
            const fileReader = new FileReader();
            fileReader.onload = function () {
                const arrayBuffer = fileReader.result;
                const reader = new CdrReader(new DataView(arrayBuffer));

                try {
                    const header_stamp_sec = reader.uint32();
                    const header_stamp_nsec = reader.uint32();
                    const header_frame_id = reader.string();

                    const input_stamp_sec = reader.uint32();
                    const input_stamp_nsec = reader.uint32();
                    const model_stamp_sec = reader.uint32();
                    const model_stamp_nsec = reader.uint32();
                    const output_stamp_sec = reader.uint32();
                    const output_stamp_nsec = reader.uint32();

                    const boxesCount = reader.uint32();
                    const boxes = [];
                    for (let i = 0; i < boxesCount; i++) {
                        const center_x = reader.float32();
                        const center_y = reader.float32();
                        const width = reader.float32();
                        const height = reader.float32();
                        const label = reader.string();
                        const score = reader.float32();
                        const distance = reader.float32();
                        const speed = reader.float32();
                        const track_id = reader.string();
                        const lifetime = reader.int32();
                        const created_sec = reader.uint32();
                        const created_nsec = reader.uint32();
                        const track = {
                            id: track_id,
                            lifetime: lifetime,
                            created: {
                                sec: created_sec,
                                nsec: created_nsec
                            }
                        };
                        const box = {
                            center_x: center_x,
                            center_y: center_y,
                            width: width,
                            height: height,
                            label: label,
                            score: score,
                            distance: distance,
                            speed: speed,
                            track: track
                        };
                        boxes.push(box);
                    }

                    drawBoxes(document.getElementById("boxes"), { boxes: boxes });

                    resetTimeout();
                } catch (error) {
                    console.error('Failed to process object detection data:', error);
                }
            };
            fileReader.readAsArrayBuffer(event.data);
        }
    };

    socket.onerror = function (error) {
        console.error(`WebSocket ${socketUrl} error: ${error}`);
    };

    socket.onclose = function (event) {
        console.log(`WebSocket ${socketUrl} connection closed`);
    };
    return ctx;
}

