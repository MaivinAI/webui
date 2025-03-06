import * as fzstd from './fzstd.js';
import * as THREE from './three.js';
import { CdrReader } from './Cdr.js';

function deserialize_time(reader) {
    const time = {}
    time.sec = reader.int32()
    time.nanosec = reader.uint32()
    return time
}

function deserialize_header(reader) {
    const header = {};
    header.header_time = deserialize_time(reader)
    header.header_frame = reader.string()
    return header
}

function deserialize_detect_track(reader) {
    const detectTrack = {};
    detectTrack.id = reader.string()
    detectTrack.lifetime = reader.int32()
    detectTrack.created = deserialize_time(reader)
    return detectTrack
}

function deserialize_detect_boxes2D(reader) {
    const detectBox2D = {};
    detectBox2D.center_x = reader.float32()
    detectBox2D.center_y = reader.float32()
    detectBox2D.width = reader.float32()
    detectBox2D.height = reader.float32()
    detectBox2D.label = reader.string()
    detectBox2D.score = reader.float32()
    detectBox2D.distance = reader.float32()
    detectBox2D.speed = reader.float32()
    detectBox2D.track = deserialize_detect_track(reader)
    return detectBox2D
}

// This will also uncompressed zstd compressed masks
function deserialize_mask(reader) {
    const mask = {};
    mask.height = reader.uint32(); // Read height
    mask.width = reader.uint32(); // Read width
    mask.length = reader.uint32(); // Read length
    mask.encoding = reader.string(); // Read encoding
    mask.mask = reader.uint8Array();
    mask.boxed = reader.int8() > 0
    return mask
}

function deserialize_duration(reader) {
    const dur = {};
    dur.sec = reader.int32()
    dur.nanosec = reader.uint32()
    return dur
}

function deserialize_model(reader) {
    const data = {};
    data.header = deserialize_header(reader)
    data.input_time = deserialize_duration(reader)
    data.model_time = deserialize_duration(reader)
    data.output_time = deserialize_duration(reader)
    data.decode_time = deserialize_duration(reader)
    const arrlen = reader.sequenceLength()
    data.boxes = []
    for (let i = 0; i < arrlen; i++) {
        data.boxes.push(deserialize_detect_boxes2D(reader))
    }

    const arrlen2 = reader.sequenceLength()
    data.masks = []
    for (let i = 0; i < arrlen2; i++) {
        data.masks.push(deserialize_mask(reader))
    }
    return data
}

export default async function segstream(socketUrl, onMessage) {

    const socket = new WebSocket(socketUrl);
    socket.binaryType = "arraybuffer";

    socket.onopen = function () {
        console.log('WebSocket connection opened to ' + socketUrl);
    };

    const textures = {
        tex: [],
        arr: [],
    }
    const timing = {}
    let start = performance.now()
    socket.onmessage = (event) => {
        start = performance.now()
        const arrayBuffer = event.data;
        const dataView = new DataView(arrayBuffer);
        const reader = new CdrReader(dataView);
        let model;
        try {
            model = deserialize_model(reader)
        } catch (error) {
            console.error("Failed to deserialize model data:", error);
            return;
        }
        process_masks(model, textures)
        // let start = performance.now();
        // let elapsed = performance.now() - start;
        // console.log("Array reshaping took ", elapsed, " ms");

        if (onMessage) {
            timing.decode_time = performance.now() - start
            onMessage(model, textures.tex, timing)
        }
    };
    socket.onerror = function (error) {
        console.error(`WebSocket ${socketUrl} error: ${error}`);
    };

    socket.onclose = function () {
        console.log(`WebSocket ${socketUrl} connection closed`);
    };
}

function process_masks(model, textures) {
    while (textures.tex.length < model.masks.length) {
        let new_arr = new Uint8Array(10 * 10 * 4);
        let texture_mask = new THREE.DataArrayTexture(new_arr, 10, 10, 1);
        texture_mask.magFilter = THREE.LinearFilter;
        texture_mask.minFilter = THREE.NearestFilter;
        texture_mask.format = THREE.RGBAFormat;
        textures.tex.push(texture_mask)
        textures.arr.push(new_arr)
    }
    for (let i = 0; i < model.masks.length; i++) {
        process_mask(model.masks, textures, i)
    }
}

function process_mask(masks, textures, i) {
    const mask = masks[i]
    const tex = textures.tex[i]
    if (mask.encoding == "zstd") {
        mask.mask = fzstd.decompress(mask.mask);
    }
    if (mask.length == 0) {
        return
    }
    const classes = mask.mask.length / mask.width / mask.height
    if (mask.height != tex.image.height || mask.width != tex.image.width || Math.ceil(classes / 4) != tex.image.depth) {
        textures.arr[i] = new Uint8Array(mask.height * mask.width * Math.ceil(classes / 4) * 4);
        textures.tex[i] = new THREE.DataArrayTexture(textures.arr[i], mask.width, mask.height, Math.ceil(classes / 4));
        textures.tex[i].magFilter = THREE.LinearFilter;
        textures.tex[i].minFilter = THREE.NearestFilter;
        textures.tex[i].format = THREE.RGBAFormat;
    }
    transpose_mask(textures.arr[i], mask.mask, mask.width, mask.height, classes)
    textures.tex[i].needsUpdate = true
}

function transpose_mask(new_arr, mask, width, height, classes) {
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
}