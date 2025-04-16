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

const renderer = new THREE.WebGLRenderer({ canvas: playerCanvas, antialias: true });
renderer.setSize(width, height);
renderer.domElement.style.cssText = ""

const boxCanvas = document.getElementById("boxes")
boxCanvas.width = width;
boxCanvas.height = height;

const camera = new THREE.PerspectiveCamera(46.4, width / height, 0.1, 1000);
camera.position.set(0, 5, 10); // Set initial camera position
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);

// Add OrbitControls with better settings for LiDAR viewing
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;  // Changed to true for better panning
controls.minDistance = 1;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI;    // Allow full rotation
controls.target.set(0, 0, 0);        // Set orbit target to center

// Add a grid helper for better orientation
const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);

// Add axes helper to show coordinate system
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

let texture_camera;
let material_proj;
let material_mask;
let mask_tex;
let detect_boxes;
let radar_points;
let lidar_points = null;

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

// Create a quad for the camera view
const quad = new THREE.PlaneGeometry(16, 9); // Using 16:9 aspect ratio
quad.scale(4, 4, 1); // Scale up to make it much larger

// Create a group for the camera feed
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

// Position the camera group
cameraGroup.position.set(0, 0, -15); // Move further back
cameraGroup.rotation.x = 0; // Make it completely vertical

// Initialize the PCD loader
const pcdLoader = new PCDLoader();

// Function to update LiDAR points
function updateLidarScene(arrayBuffer) {
    try {
        // Remove the old point cloud if it exists
        if (lidar_points) {
            scene.remove(lidar_points);
            if (lidar_points.geometry) {
                lidar_points.geometry.dispose();
            }
            if (lidar_points.material) {
                if (Array.isArray(lidar_points.material)) {
                    lidar_points.material.forEach(m => m.dispose());
                } else {
                    lidar_points.material.dispose();
                }
            }
        }

        // Parse and add the new point cloud
        const points = pcdLoader.parse(arrayBuffer);
        if (points && points.children && points.children.length > 0) {
            // The PCDLoader returns a group with points and rings
            lidar_points = points;

            // Find the Points object in the group's children
            points.children.forEach(child => {
                if (child instanceof THREE.Points) {
                    child.material.size = 3;
                    child.material.sizeAttenuation = false;
                }
            });

            // Position the point cloud group appropriately
            points.position.set(0, 0, 0);  // Center the points
            points.rotation.set(0, 0, 0);  // Reset rotation

            scene.add(points);
        } else {
            console.warn('No valid points found in LiDAR data');
        }
    } catch (error) {
        console.error('Error updating LiDAR scene:', error);
    }
}

// Initialize LiDAR WebSocket
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

// Initialize dropped frames monitoring
droppedframes(socketUrlErrors, playerCanvas)

// Load configuration and initialize visualization
const loader = new THREE.FileLoader();
loader.load(
    '/config/webui/details',
    function (data) {
        const config = parseNumbersInObject(JSON.parse(data));
        console.log("Parsed config:", config);

        // Update WebSocket URLs from config
        if (config.LIDAR_TOPIC && config.LIDAR_TOPIC !== socketUrlLidar) {
            socketUrlLidar = config.LIDAR_TOPIC;
            // Reconnect LiDAR WebSocket with new URL
            if (lidarSocket) {
                lidarSocket.close();
            }
            lidarSocket = new WebSocket(socketUrlLidar);
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
        }

        if (show_stats) {
            stats.showPanel([3])
        }

        init_grid(scene, renderer, camera, config)

        // Initialize camera stream
        h264Stream(socketUrlH264, 1920, 1080, 30, () => {
            fpsUpdate(cameraPanel)();
        }).then((texture) => {
            texture_camera = texture;
            material_proj = new ProjectedMaterial({
                camera: camera,
                texture: texture_camera,
                transparent: true,
                flip: mirror,
                opacity: 0.8 // Make it slightly transparent to see points through it
            })
            const mesh = new THREE.Mesh(quad, material_proj);
            mesh.needsUpdate = true;
            cameraGroup.add(mesh); // Add to camera group instead of scene directly
        })

        // Initialize mask stream
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
                    opacity: 0.5 // Make mask more transparent
                })
                const mesh_mask = new THREE.Mesh(quad, material_mask);
                mesh_mask.needsUpdate = true;
                mask_tex = texture_mask;
                cameraGroup.add(mesh_mask); // Add to camera group
            })
        })

        // Initialize detection boxes
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
        })

        // Initialize radar points
        let radarFpsFn = fpsUpdate(radarPanel);
        pcdStream(socketUrlPcd, () => {
            radarFpsFn();
            radar_points.points = preprocessPoints(RANGE_BIN_LIMITS[0], RANGE_BIN_LIMITS[1], mirror, radar_points.points)
        }).then((pcd) => {
            radar_points = pcd;
            grid_set_radarpoints(radar_points)
        })
    },
    function () { },
    function (err) {
        console.error('An error happened', err);
    }
);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update controls first
    controls.update();

    if ((typeof mask_tex !== "undefined" || typeof detect_boxes !== "undefined") && typeof radar_points !== "undefined") {
        if (CAMERA_DRAW_PCD != "disabled" && radar_points.points.length > 0) {
            let points = radar_points.points;
            rendered.forEach((cell) => {
                clearThree(cell);
            });
            if (CAMERA_DRAW_PCD.endsWith("class")) {
                color_points_class(points, CAMERA_DRAW_PCD, scene, rendered, true, CAMERA_PCD_LABEL);
            } else {
                color_points_field(points, CAMERA_DRAW_PCD, scene, rendered, true, CAMERA_PCD_LABEL);
            }
        }
    }

    renderer.render(scene, camera);
}

animate() 