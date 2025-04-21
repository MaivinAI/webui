import * as THREE from './three.js'
import ProjectedMaterial from './ProjectedMaterial.js'
import ProjectedMask from './ProjectedMask.js'
import segstream, { get_shape } from './mask.js'
import h264Stream from './stream.js'
import pcdStream, { preprocessPoints } from './pcd.js'
import { project_points_onto_box } from './classify.js'
import boxesstream from './boxes.js'
import Stats, { fpsUpdate } from "./Stats.js"
import droppedframes from './droppedframes.js'
import { parseNumbersInObject } from './parseNumbersInObject.js';
import { OrbitControls } from './OrbitControls.js'
import { clearThree, color_points_class, color_points_field, mask_colors } from './utils.js'
import { grid_set_radarpoints, init_grid } from './grid_render.js'
import { PCDLoader } from './PCDLoader.js'

const PI = Math.PI

const stats = new Stats();
const cameraPanel = stats.addPanel(new Stats.Panel('cameraFPS', '#fff', '#222'));
const radarPanel = stats.addPanel(new Stats.Panel('radarFPS', '#ff4', '#220'));
const modelPanel = stats.addPanel(new Stats.Panel('modelFPS', '#f4f', '#210'));
const lidarPanel = stats.addPanel(new Stats.Panel('lidarFPS', '#4ff', '#022'));
stats.showPanel([])

const playerCanvas = document.getElementById("player");
const width = window.innerWidth;
const height = window.innerHeight;

playerCanvas.width = width;
playerCanvas.height = height;

const renderer = new THREE.WebGLRenderer({
    canvas: playerCanvas,
    antialias: true,
    alpha: true
});
renderer.setSize(width, height);
renderer.domElement.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    pointer-events: auto;
`;

const boxCanvas = document.getElementById("boxes")
boxCanvas.width = width;
boxCanvas.height = height;
boxCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    pointer-events: none;
`;

const camera = new THREE.PerspectiveCamera(46.4, width / height, 0.1, 1000);
camera.position.set(0, 5, 0);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
scene.background = null;

// Create separate controls for LiDAR only
const lidarControls = new OrbitControls(camera, renderer.domElement);
lidarControls.enableDamping = true;
lidarControls.dampingFactor = 0.05;
lidarControls.screenSpacePanning = true;
lidarControls.minDistance = 1;
lidarControls.maxDistance = 10;
lidarControls.maxPolarAngle = Math.PI;
lidarControls.target.set(0, 0, 0);

// Create a fixed camera group that won't be affected by controls
const fixedCameraGroup = new THREE.Group();
scene.add(fixedCameraGroup);
fixedCameraGroup.position.set(0, 0, -12); // Set initial position for camera stream

let texture_camera, material_proj, material_mask, mask_tex;
let detect_boxes, radar_points;
let lidar_points = null;
let lidarGroup = new THREE.Group();
let radarGroup = new THREE.Group(); // Create radar group
scene.add(lidarGroup);
fixedCameraGroup.add(radarGroup); // Add radar group to fixed camera group

let CAMERA_DRAW_PCD = "disabled"
let CAMERA_PCD_LABEL = "disabled"
let DRAW_BOX = false
let DRAW_BOX_TEXT = true

let socketUrlH264 = '/rt/camera/h264/'
let socketUrlPcd = '/rt/radar/targets/'
let socketUrlLidar = '/rt/lidar/points/'
let socketUrlDetect = '/rt/detect/boxes2d/'
let socketUrlMask = '/rt/detect/mask/'
let socketUrlErrors = '/ws/dropped'
let RANGE_BIN_LIMITS = [0, 20]
let mirror = false
let show_stats = false

const quad = new THREE.PlaneGeometry(16, 9);
quad.scale(6, 6, 1);

const pcdLoader = new PCDLoader();

function makeCircularTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

function updateLidarScene(arrayBuffer) {
    try {
        lidarGroup.clear(); // Remove previous LiDAR

        const points = pcdLoader.parse(arrayBuffer);
        if (points && points.children && points.children.length > 0) {
            lidar_points = points;
            points.children.forEach(child => {
                if (child instanceof THREE.Points) {
                    const circularTexture = makeCircularTexture();
                    child.material.map = circularTexture;
                    child.material.alphaTest = 0.5;
                    child.material.transparent = true;
                    child.material.size = 0.1;
                    child.material.sizeAttenuation = true;
                    child.material.needsUpdate = true;
                }
            });
            points.position.set(0, 0, 0);
            points.rotation.set(0, Math.PI / 2, 0);
            points.scale.set(-1, 1, 1);
            lidarGroup.add(points);
        } else {
            console.warn('No valid points found in LiDAR data');
        }
    } catch (error) {
        console.error('Error updating LiDAR scene:', error);
    }
}

let lidarSocket = new WebSocket(socketUrlLidar);
lidarSocket.binaryType = 'arraybuffer';

lidarSocket.onmessage = function (event) {
    updateLidarScene(event.data);
    fpsUpdate(lidarPanel)();
};

lidarSocket.onerror = function (error) {
    console.error('LiDAR WebSocket error:', error);
};

lidarSocket.onclose = function () {
    console.log('LiDAR WebSocket connection closed');
    setTimeout(() => {
        lidarSocket = new WebSocket(socketUrlLidar);
        lidarSocket.binaryType = 'arraybuffer';
        lidarSocket.onmessage = this.onmessage;
        lidarSocket.onerror = this.onerror;
        lidarSocket.onclose = this.onclose;
    }, 3000);
};

droppedframes(socketUrlErrors, playerCanvas)

function drawBoxesSpeedDistance(canvas, boxes, radar_points, drawBoxSettings) {
    if (!boxes) {
        return
    }
    if (!radar_points) {
        return
    }

    project_points_onto_box(radar_points, boxes)
    const ctx = canvas.getContext("2d");
    if (ctx == null) {
        return
    }
    ctx.font = "48px monospace";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let box of boxes) {
        let text = ""
        let color_box = "white"
        let color_text = "red"

        let x = box.center_x;
        if (drawBoxSettings.mirror) {
            x = 1.0 - x
        }
        if (drawBoxSettings.drawBox) {
            ctx.beginPath();
            let y = box.center_y - 0.3;
            ctx.rect((x - box.width / 2) * canvas.width, (y - box.height / 2) * canvas.height, box.width * canvas.width, box.height * canvas.height);
            ctx.strokeStyle = color_box;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        if (drawBoxSettings.drawBoxText && box.text) {
            text = box.text
            let lines = text.split('\n');
            let lineheight = 40;
            ctx.strokeStyle = color_box
            ctx.fillStyle = color_text;
            ctx.lineWidth = 1;
            let y = box.center_y - 0.3;
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], (x - box.width / 2) * canvas.width, (y - box.height / 2) * canvas.height + (lines.length - 1 - i * lineheight));
                ctx.strokeText(lines[i], (x - box.width / 2) * canvas.width, (y - box.height / 2) * canvas.height + (lines.length - 1 - i * lineheight));
            }
        }
    }
}

const loader = new THREE.FileLoader();
loader.load(
    '/config/webui/details',
    function (data) {
        const config = parseNumbersInObject(JSON.parse(data));
        console.log("Parsed config:", config);
        init_config(config);


        if (config.LIDAR_TOPIC && config.LIDAR_TOPIC !== socketUrlLidar) {
            socketUrlLidar = config.LIDAR_TOPIC;
            if (lidarSocket) lidarSocket.close();
            lidarSocket = new WebSocket(socketUrlLidar);
            lidarSocket.binaryType = 'arraybuffer';
            lidarSocket.onmessage = (event) => {
                updateLidarScene(event.data);
                fpsUpdate(lidarPanel)();
            };
            lidarSocket.onerror = (error) => {
                console.error('LiDAR WebSocket error:', error);
            };
            lidarSocket.onclose = function () {
                console.log('LiDAR WebSocket closed');
                setTimeout(() => {
                    lidarSocket = new WebSocket(socketUrlLidar);
                    lidarSocket.binaryType = 'arraybuffer';
                    lidarSocket.onmessage = this.onmessage;
                    lidarSocket.onerror = this.onerror;
                    lidarSocket.onclose = this.onclose;
                }, 3000);
            };
        }

        if (show_stats) stats.showPanel([3]);

        init_grid(scene, renderer, camera, config);

        h264Stream(socketUrlH264, 1920, 1080, 30, () => {
            fpsUpdate(cameraPanel)();
        }).then((texture) => {
            texture_camera = texture;
            material_proj = new ProjectedMaterial({
                camera: camera,
                texture: texture_camera,
                transparent: true,
                flip: mirror,
                opacity: 0.8
            });
            const mesh = new THREE.Mesh(quad, material_proj);
            mesh.position.set(0, 0, 0);
            mesh.needsUpdate = true;
            fixedCameraGroup.add(mesh);
        });

        get_shape(socketUrlMask, (height, width, length, mask) => {
            const classes = Math.round(mask.length / height / width)
            segstream(socketUrlMask, height, width, classes, () => {
                fpsUpdate(modelPanel)();
            }).then((texture_mask) => {
                material_mask = new ProjectedMask({
                    camera: camera,
                    texture: texture_mask,
                    transparent: true,
                    flip: mirror,
                    colors: mask_colors,
                    opacity: 0.5
                })
                const mesh_mask = new THREE.Mesh(quad, material_mask);
                mesh_mask.needsUpdate = true;
                mask_tex = texture_mask;
                fixedCameraGroup.add(mesh_mask);
            })
        });

        let boxes;
        let drawBoxSettings = {
            drawBox: DRAW_BOX,
            drawBoxText: DRAW_BOX_TEXT,
            mirror: mirror,
        }
        boxesstream(socketUrlDetect, null, () => {
            if (boxes && radar_points) {
                drawBoxesSpeedDistance(boxCanvas, boxes.msg.boxes, radar_points.points, drawBoxSettings)
            }
        }).then((b) => {
            boxes = b
        });

        let radarFpsFn = fpsUpdate(radarPanel);
        pcdStream(socketUrlPcd, () => {
            radarFpsFn();
            radar_points.points = preprocessPoints(RANGE_BIN_LIMITS[0], RANGE_BIN_LIMITS[1], mirror, radar_points.points);

            // Update radar visualization
            if (CAMERA_DRAW_PCD != "disabled" && radar_points.points.length > 0) {
                let points = radar_points.points;
                radarGroup.clear(); // Clear previous points

                // Create geometry for radar points
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(points.length * 3);
                const colors = new Float32Array(points.length * 3);

                points.forEach((point, i) => {
                    // Transform points to match camera perspective
                    positions[i * 3] = -point.y;     // Right (negated to match camera)
                    positions[i * 3 + 1] = point.z;  // Up
                    positions[i * 3 + 2] = point.x;  // Forward

                    // Color based on range
                    const range = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
                    const normalizedRange = Math.min(range / 20.0, 1.0);
                    colors[i * 3] = 1 - normalizedRange; // Red
                    colors[i * 3 + 1] = normalizedRange;  // Green
                    colors[i * 3 + 2] = 0.2;              // Blue
                });

                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                const material = new THREE.PointsMaterial({
                    size: 0.15,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.8,
                    sizeAttenuation: true
                });

                const pointCloud = new THREE.Points(geometry, material);
                // Set the point cloud position to match the camera's view
                pointCloud.position.set(0, 0, 50);
                radarGroup.add(pointCloud);
            }
        }).then((pcd) => {
            radar_points = pcd;
            grid_set_radarpoints(radar_points);
        });
    },
    function () { },
    function (err) {
        console.error('An error happened', err);
    }
);

function init_config(config) {
    if (config.RANGE_BIN_LIMITS_MIN) {
        RANGE_BIN_LIMITS[0] = config.RANGE_BIN_LIMITS_MIN
    }
    if (config.RANGE_BIN_LIMITS_MAX) {
        RANGE_BIN_LIMITS[1] = config.RANGE_BIN_LIMITS_MAX
    }

    if (config.MASK_TOPIC) {
        socketUrlMask = config.MASK_TOPIC
    }

    if (config.DETECT_TOPIC) {
        socketUrlDetect = config.DETECT_TOPIC
    }

    if (config.PCD_TOPIC) {
        socketUrlPcd = config.PCD_TOPIC
    }

    if (config.H264_TOPIC) {
        socketUrlH264 = config.H264_TOPIC
    }

    if (config.COMBINED_CAMERA_DRAW_PCD) {
        CAMERA_DRAW_PCD = config.COMBINED_CAMERA_DRAW_PCD
    }
    if (config.COMBINED_CAMERA_PCD_LABEL) {
        CAMERA_PCD_LABEL = config.COMBINED_CAMERA_PCD_LABEL
    }

    if (typeof config.DRAW_BOX == "boolean") {
        DRAW_BOX = config.DRAW_BOX
    }

    if (typeof config.DRAW_BOX_TEXT == "boolean") {
        DRAW_BOX_TEXT = config.DRAW_BOX_TEXT
    }

    if (typeof config.MIRROR == "boolean") {
        mirror = config.MIRROR
    }

    if (typeof config.SHOW_STATS == "boolean") {
        show_stats = config.SHOW_STATS
    }

}

function animate() {
    requestAnimationFrame(animate);
    lidarControls.update();

    // Update fixed camera group to stay in view
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    cameraDirection.multiplyScalar(12);
    fixedCameraGroup.position.copy(camera.position).add(cameraDirection);
    fixedCameraGroup.quaternion.copy(camera.quaternion);

    if (material_proj) {
        material_proj.update(camera);
    }
    if (material_mask) {
        material_mask.update(camera);
    }

    renderer.render(scene, camera);
}

animate();
