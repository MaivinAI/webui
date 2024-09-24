import { CdrReader } from '@foxglove/cdr';

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

function parseTime(reader) {
    let time = {}
    time.sec = reader.int32()
    time.nanosec = reader.uint32()
    return time
}

function parseHeader(reader) {
    let header = {};
    header.header_time = parseTime(reader)
    header.header_frame = reader.string()
    return header
}

function parseDetectTrack(reader) {
    let detectTrack = {};
    detectTrack.id = reader.string()
    detectTrack.lifetime = reader.int32()
    detectTrack.created = parseTime(reader)
    return detectTrack
}

function parseDetectBoxes2D(reader) {
    let detectBox2D ={};
    detectBox2D.center_x = reader.float32()
    detectBox2D.center_y = reader.float32()
    detectBox2D.width = reader.float32()
    detectBox2D.height = reader.float32()
    detectBox2D.label = reader.string()
    detectBox2D.score = reader.float32()
    detectBox2D.distance = reader.float32()
    detectBox2D.speed = reader.float32()
    detectBox2D.track = parseDetectTrack(reader)
    return detectBox2D
}

export default async function boxesstream(socketUrl, onMessage) {
    const boxes = {}
    boxes.msg = {}
    boxes.msg.boxes = []
    boxes.needsUpdate = false
    const socket = new WebSocket(socketUrl);
    socket.binaryType = "arraybuffer";

    socket.onopen = function (event) {
        console.log('WebSocket connection opened to ' + socketUrl);
    };

    socket.onmessage = (event) => {
        const arrayBuffer = event.data;
        const dataView = new DataView(arrayBuffer);
        const reader = new CdrReader(dataView);
        let boxmsg = {};
        try {
            boxmsg.header = parseHeader(reader)
            boxmsg.input_timestamp = parseTime(reader)
            boxmsg.model_time = parseTime(reader)
            boxmsg.output_time = parseTime(reader)
            const arrlen = reader.sequenceLength()
            boxmsg.boxes = []
            for (let i = 0; i < arrlen; i++) {
                boxmsg.boxes.push(parseDetectBoxes2D(reader))
            }
            boxes.msg = boxmsg
            boxes.needsUpdate = true
        } catch (error) {
            console.error("Failed to deserialize image data:", error);
            return;
        }
        if (onMessage) {
            onMessage()
        }
    };

    socket.onerror = function (error) {
        console.error(`WebSocket ${socketUrl} error: ${error}`);
    };

    socket.onclose = function (event) {
        console.log(`WebSocket ${socketUrl} connection closed`);
    };
    return boxes;
}

