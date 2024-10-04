import pako from './pako.js';
import * as THREE from './three.js';
import { CdrReader } from './Cdr.js';

export async function get_shape(socketUrl, fn) {
    const socket = new WebSocket(socketUrl);
    socket.binaryType = "arraybuffer";
    socket.onopen = function (event) {
        console.log('WebSocket connection opened to ' + socketUrl);
    };
    let firstMsg = true;
    socket.onmessage = (event) => {
        if (!firstMsg) {
            socket.close();
            return;
        }
        const arrayBuffer = event.data;
        const dataView = new DataView(arrayBuffer);
        const reader = new CdrReader(dataView);
        let mask;
        try {
            const height = reader.uint32();
            const width = reader.uint32();
            const length = reader.uint32();
            const encoding = reader.string();
            if (encoding == "zlib") {
                const compressedData = reader.uint8Array();
                mask = pako.inflate(compressedData);
            } else {
                mask = reader.uint8Array();
            }

            console.log("Using %dx%dx%d = %d", height, width, Math.round(mask.length / height / width), mask.length);
            fn(height, width, length, mask);
            firstMsg = false;
        } catch (error) {
            console.error("Failed to deserialize image data:", error);
            return;
        }
        socket.close();
    };

    socket.onerror = function (error) {
        console.error(`WebSocket ${socketUrl} error: ${error}`);
    };

    socket.onclose = function (event) {
        console.log(`WebSocket ${socketUrl} connection closed`);
    };
}

export default async function segstream(socketUrl, height, width, classes, onMessage) {
    const socket = new WebSocket(socketUrl);
    socket.binaryType = "arraybuffer";
    let framesProcessed = 0;

    socket.onopen = function (event) {
        console.log('WebSocket connection opened to ' + socketUrl);
    };
    let new_arr = new Uint8Array(height * width * Math.ceil(classes / 4) * 4);
    const texture_mask = new THREE.DataArrayTexture(new_arr, width, height, Math.ceil(classes / 4));
    texture_mask.magFilter = THREE.LinearFilter;
    texture_mask.minFilter = THREE.NearestFilter;
    texture_mask.format = THREE.RGBAFormat;

    const timing = {};
    let start = performance.now();
    socket.onmessage = (event) => {
        start = performance.now();
        const arrayBuffer = event.data;
        const dataView = new DataView(arrayBuffer);
        const reader = new CdrReader(dataView);
        let mask;
        try {
            const height = reader.uint32();
            const width = reader.uint32();
            const length = reader.uint32();
            const encoding = reader.string();
            if (encoding == "zlib") {
                const compressedData = reader.uint8Array();
                mask = pako.inflate(compressedData);
            } else {
                mask = reader.uint8Array();
            }
        } catch (error) {
            console.error("Failed to deserialize image data:", error);
            return;
        }
        let n_layer_stride = height * width * 4;
        let n_row_stride = width * 4;
        let n_col_stride = 4;
        let row_stride = width * classes;
        let col_stride = classes;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                for (let k = 0; k < Math.ceil(classes / 4) * 4; k++) {
                    if (k >= classes) {
                        new_arr[n_layer_stride * Math.floor(k / 4) + i * n_row_stride + j * n_col_stride + k % 4] = 0;
                    } else {
                        new_arr[n_layer_stride * Math.floor(k / 4) + (height - i) * n_row_stride + j * n_col_stride + k % 4] = mask[i * row_stride + j * col_stride + k];
                    }
                }
            }
        }

        texture_mask.needsUpdate = true;
        if (onMessage) {
            timing.decode_time = performance.now() - start;
            onMessage(timing);
        }
    };

    socket.onerror = function (error) {
        console.error(`WebSocket ${socketUrl} error: ${error}`);
    };

    socket.onclose = function (event) {
        console.log(`WebSocket ${socketUrl} connection closed`);
    };

    return texture_mask;
}

