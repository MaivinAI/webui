import { CdrReader } from './Cdr.js';

function parseTime(reader) {
    let time = {}
    time.sec = reader.int32()
    time.nanosec = reader.uint32()
    return time
}

function parseHeader(reader) {
    let header = {};
    header.stamp = parseTime(reader)
    header.frame_id = reader.string()
    return header
}

function parseDetectTrack(reader) {
    let detectTrack = {};
    detectTrack.id = reader.string()
    detectTrack.lifetime = reader.int32()
    detectTrack.stamp = parseTime(reader)
    return detectTrack
}

function parseDetectBoxes3D(reader) {
    let detectBox3D = {};
    try {
        detectBox3D.center_x = reader.float32()
        detectBox3D.center_y = reader.float32()
        detectBox3D.width = reader.float32()
        detectBox3D.height = reader.float32()
        detectBox3D.label = reader.string()
        detectBox3D.score = reader.float32()
        detectBox3D.distance = reader.float32()
        detectBox3D.speed = reader.float32()
        detectBox3D.track = parseDetectTrack(reader)

        return detectBox3D;
    } catch (error) {
        console.error('Error parsing box at offset:', reader.offset);
        console.error('Error details:', error);
        throw error;
    }
}

export default async function boxes3dstream(socketUrl, onMessage) {
    const boxes = {}
    boxes.msg = {}
    boxes.msg.boxes = []
    boxes.needsUpdate = false
    const socket = new WebSocket(socketUrl);
    socket.binaryType = "arraybuffer";

    socket.onopen = function () {
        console.log('WebSocket connection opened to ' + socketUrl);
    };

    socket.onmessage = (event) => {
        const arrayBuffer = event.data;
        const firstBytes = new Uint8Array(arrayBuffer.slice(0, 16));

        const dataView = new DataView(arrayBuffer);
        const reader = new CdrReader(dataView);
        let boxmsg = {};
        try {
            boxmsg.header = parseHeader(reader);
            boxmsg.input_timestamp = parseTime(reader);
            boxmsg.model_time = parseTime(reader);
            boxmsg.output_time = parseTime(reader);
            const arrlen = reader.sequenceLength();

            boxmsg.boxes = [];
            for (let i = 0; i < arrlen; i++) {
                const box = parseDetectBoxes3D(reader);
                boxmsg.boxes.push(box);
            }
            boxes.msg = boxmsg;
        } catch (error) {
            console.error("Failed to deserialize box data:", error);
            console.error("Error occurred at position:", reader.offset);
            const errorBytes = new Uint8Array(arrayBuffer.slice(Math.max(0, reader.offset - 8), reader.offset + 8));
            console.error("Bytes around error:", Array.from(errorBytes));
            return;
        }
        if (onMessage) {
            onMessage(boxes.msg);
        }
        boxes.needsUpdate = true;
    };

    socket.onerror = function (error) {
        console.error(`WebSocket ${socketUrl} error: ${error}`);
    };

    socket.onclose = function () {
        console.log(`WebSocket ${socketUrl} connection closed`);
    };
    return boxes;
} 