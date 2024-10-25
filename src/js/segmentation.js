import * as THREE from './three.js'
import ProjectedMaterial from './ProjectedMaterial.js'
import ProjectedMask from './ProjectedMask.js'
import segstream, { get_shape } from './mask.js'
import h264Stream from './stream.js'
import pcdStream from './pcd.js'
import SpriteText from './three-spritetext.js';
import classify_points, { classify_points_box } from './classify.js'
import boxesstream from './boxes.js'
import { Line2 } from './Line2.js';
import { LineMaterial } from './LineMaterial.js';
import { LineGeometry } from './LineGeometry.js';
import Stats from "./Stats.js"
import droppedframes from './droppedframes.js'
import { dynamicSort } from './sort.js'
import { mask_colors } from './utils.js'
const PI = Math.PI


const stats = new Stats();
const cameraPanel = stats.addPanel(new Stats.Panel('cameraFPS', '#fff', '#222'));
const modelPanel = stats.addPanel(new Stats.Panel('modelFPS', '#f4f', '#210'));
stats.dom.style.cssText = "position: absolute; top: 0px; right: 0px; opacity: 0.9; z-index: 10000;";
stats.showPanel([3, 4])
document.querySelector('main').appendChild(stats.dom);

function fpsUpdate(panel, max) {
    if (!max) {
        max = 40
    }
    let fpsInd = 0
    let timeBetweenUpdates = []
    let lastUpdateTime = 0
    let stablized = false
    let firstUpdate = 0
    return () => {
        if (!lastUpdateTime) {
            lastUpdateTime = performance.now()
            firstUpdate = lastUpdateTime
            return
        }
        const curr = performance.now()
        if (timeBetweenUpdates.length < 10) {
            timeBetweenUpdates.push(curr - lastUpdateTime)
            lastUpdateTime = curr
            return
        }
        timeBetweenUpdates[fpsInd] = curr - lastUpdateTime
        fpsInd = (fpsInd + 1) % timeBetweenUpdates.length
        if (stablized) {
            const avg_fps = 1000 / timeBetweenUpdates.reduce((a, b) => a + b, 0) * timeBetweenUpdates.length
            panel.update(avg_fps, max)
        } else if (curr - firstUpdate > 2000) {
            // has been 2s since first update
            stablized = true
        }
        lastUpdateTime = curr
    }
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xa0a0a0)
const playerCanvas = document.getElementById("player")
const width = 1920;
const height = 1080;
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: playerCanvas });
renderer.setSize(width, height)
renderer.domElement.style.cssText = ""
// const camera_proj = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -1, 1000);
const camera = new THREE.PerspectiveCamera(46.4, width / height, 0.1, 1000);
camera.rotation.z = PI
camera.rotation.x = PI

let texture_camera;
let material_proj;
let material_mask;


let mask_tex;
let detect_boxes;


let socketUrlH264 = '/rt/camera/h264/'
let socketUrlDetect = '/rt/detect/boxes2d/'
let socketUrlMask = '/rt/detect/mask/'
let socketUrlErrors = '/ws/dropped'

droppedframes(socketUrlErrors, playerCanvas)

function parseInts(obj) {
    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = parseInts(obj[key]);
        } else if (typeof obj[key] === 'string' && !isNaN(obj[key])) {
            obj[key] = parseInt(obj[key], 10);
        }
    }
    return obj;
}

const loader = new THREE.FileLoader();
loader.load(
    '/config/webui/details',
    function (data) {
        const config = parseInts(JSON.parse(data));
        console.log(config);

        if (config.MASK_TOPIC) {
            socketUrlMask = config.MASK_TOPIC;
        }

        if (config.DETECT_TOPIC) {
            socketUrlDetect = config.DETECT_TOPIC;
        }

        if (config.H264_TOPIC) {
            socketUrlH264 = config.H264_TOPIC;
        }

        const quad = new THREE.PlaneGeometry(width / height * 500, 500);
        const cameraUpdate = fpsUpdate(cameraPanel)
        h264Stream(socketUrlH264, 1920, 1080, 30, (timing) => {
            cameraUpdate(), resetTimeout()
            // cameraMSPanel.update(timing.decode_time, 33) 
        }).then((tex) => {
            texture_camera = tex;
            material_proj = new ProjectedMaterial({
                camera: camera, // the camera that acts as a projector
                texture: texture_camera, // the texture being projected
                color: '#000', // the color of the object if it's not projected on
                transparent: true,
            })
            const mesh_cam = new THREE.Mesh(quad, material_proj);
            mesh_cam.needsUpdate = true;
            mesh_cam.position.z = 50;
            mesh_cam.rotation.x = PI;
            scene.add(mesh_cam);
        })


        const modelFPSUpdate = fpsUpdate(modelPanel)

        get_shape(socketUrlMask, (height, width, length, mask) => {
            const classes = Math.round(mask.length / height / width)
            segstream(socketUrlMask, height, width, classes, (timing) => {
                modelFPSUpdate();
                // maskMSPanel.update(timing.decode_time, 33) 
            }).then((texture_mask) => {
                material_mask = new ProjectedMask({
                    camera: camera, // the camera that acts as a projector
                    texture: texture_mask, // the texture being projected
                    transparent: true,
                    colors: mask_colors,
                })
                const mesh_mask = new THREE.Mesh(quad, material_mask);
                mesh_mask.needsUpdate = true;
                mesh_mask.position.z = 50;
                mesh_mask.rotation.x = PI;
                mask_tex = texture_mask
                scene.add(mesh_mask);
            })
        })

    },
    function (xhr) {
        // Progress callback if needed
    },
    function (err) {
        console.error('An error happened', err);
    }
);
THREE.Cache.enabled = true;


renderer.setAnimationLoop(animate);

function animate() {
    // camera.rotation.y += 0.02
    if (texture_camera) {
        texture_camera.needsUpdate = true;
    }

    renderer.render(scene, camera);

}

let timeoutId;
function resetTimeout() {
    clearTimeout(timeoutId);
    document.getElementById('timeout').innerText = '';
    timeoutId = setTimeout(() => {
        document.getElementById('timeout').innerText = 'Timeout: Verify if camera service is running';
    }, 15000);
}