import * as THREE from './three.js'
import { OrbitControls } from './OrbitControls.js'
import Stats from './Stats.js'
import pcdStream from './pcd.js'
import { parseNumbersInObject } from './parseNumbersInObject.js';
import { grid_set_radarpoints, init_grid } from './grid_render.js'

const PI = Math.PI

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);
const HFOV = 82
let aspect = window.innerWidth / window.innerHeight
let fov = Math.atan(Math.tan(HFOV * Math.PI / 360) / aspect) * 360 / Math.PI
const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);



const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', onWindowResize);
renderer.domElement.style.cssText = "display:flex; position: absolute; top: 0; left: 0;"
document.querySelector('main').appendChild(renderer.domElement);

const stats = new Stats();
const radarPanel = stats.addPanel(new Stats.Panel('radarFPS', '#ff4', '#220'));
stats.dom.style.cssText = "position: absolute; top: 0px; right: 0px; opacity: 0.9; z-index: 10000;";
stats.showPanel([3])
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




let radar_points;





const loader = new THREE.FileLoader();

let ANGLE_BIN_WIDTH = 10
let ANGLE_BIN_LIMITS = [-65, 65]
let RANGE_BIN_WIDTH = 0.5
let RANGE_BIN_LIMITS = [0, 20]
let WINDOW_LENGTH = 5
let BIN_THRESHOLD = 3
let DRAW_PCD = false
let USE_BOX = false
let DRAW_UNKNOWN_CELLS = false

let socketUrlMask = '/rt/detect/mask/'
let socketUrlDetect = '/rt/detect/boxes2d/'
let socketUrlPcd = '/rt/radar/targets/';


loader.load(
    // resource URL
    '/config/webui/details',
    function (data) {
        const config = parseNumbersInObject(JSON.parse(data));
        console.log("Parsed config:", config);

        // Now you can use config.ANGLE_BIN_WIDTH, config.RANGE_BIN_WIDTH, etc.
        // They will be numbers, not strings

        if (config.ANGLE_BIN_WIDTH) { ANGLE_BIN_WIDTH = config.ANGLE_BIN_WIDTH }
        if (config.ANGLE_BIN_LIMITS_MIN) {
            ANGLE_BIN_LIMITS[0] = config.ANGLE_BIN_LIMITS_MIN
        }
        if (config.ANGLE_BIN_LIMITS_MAX) {
            ANGLE_BIN_LIMITS[1] = config.ANGLE_BIN_LIMITS_MAX
        }
        if (config.RANGE_BIN_WIDTH) { RANGE_BIN_WIDTH = config.RANGE_BIN_WIDTH }
        if (config.RANGE_BIN_LIMITS_MIN) {
            RANGE_BIN_LIMITS[0] = config.RANGE_BIN_LIMITS_MIN
        }
        if (config.RANGE_BIN_LIMITS_MAX) {
            RANGE_BIN_LIMITS[1] = config.RANGE_BIN_LIMITS_MAX
        }
        if (config.WINDOW_LENGTH) {
            WINDOW_LENGTH = config.WINDOW_LENGTH
        }
        if (config.BIN_THRESHOLD) {
            BIN_THRESHOLD = config.BIN_THRESHOLD
        }
        if (config.GRID_DRAW_PCD) {
            DRAW_PCD = config.GRID_DRAW_PCD
        }
        if (config.USE_BOX) {
            USE_BOX = config.USE_BOX.toLowerCase() === 'true';
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
        if (typeof config.DRAW_UNKNOWN_CELLS == "boolean") {
            DRAW_UNKNOWN_CELLS = config.DRAW_UNKNOWN_CELLS
        }
        init_grid(scene, renderer, camera, config)

        pcdStream(socketUrlPcd, fpsUpdate(radarPanel)).then((pcd) => {
            radar_points = pcd;
            grid_set_radarpoints(radar_points)
        })

        camera.position.y = 15;
        camera.position.z = RANGE_BIN_LIMITS[1] / 2 - 0.01;
        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.target = new THREE.Vector3(0, 0, RANGE_BIN_LIMITS[1]/2);
        orbitControls.update();

    },
    function (xhr) {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (err) {
        console.error('An error happened', err);
    }
);
THREE.Cache.enabled = true;

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = Math.atan(Math.tan(HFOV * Math.PI / 360) / camera.aspect) * 360 / Math.PI
    camera.rotation.x = -Math.atan2(camera.position.y, camera.position.z - 0.5) - camera.fov * 0.5 * PI / 180;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}