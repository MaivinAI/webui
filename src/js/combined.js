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
const PI = Math.PI


const stats = new Stats();
const cameraPanel = stats.addPanel(new Stats.Panel('cameraFPS', '#fff', '#222'));
// const cameraMSPanel = stats.addPanel(new Stats.Panel('h264 decode ms', '#AAA', '#111'));
// const renderPanel = stats.addPanel(new Stats.Panel('renderFPS', '#4ff', '#022'));
const radarPanel = stats.addPanel(new Stats.Panel('radarFPS', '#ff4', '#220'));
const modelPanel = stats.addPanel(new Stats.Panel('modelFPS', '#f4f', '#210'));
stats.dom.style.cssText = "position: absolute; top: 0px; right: 0px; opacity: 0.9; z-index: 10000;";
stats.showPanel([3, 4, 5])
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
const mask_colors = [
    new THREE.Color(1.0, 1.0, 1.0),
    new THREE.Color(0., 1., 0.),
    new THREE.Color(0.50980392, 0.50980392, 0.72941176),
    new THREE.Color(0.00784314, 0.18823529, 0.29411765)
]

const mask_class_names = ["background",
    "person",
    "car", "truck"
]

const grid_scene = new THREE.Scene()
grid_scene.background = new THREE.Color(0xa0a0a0)
const gridCanvas = document.getElementById("grid")


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


// createLegend(mask_colors);
let texture_camera;
let material_proj;
let material_mask;


let mask_tex;
let detect_boxes;
let radar_points;


// const MAX_TRIANGLE_COUNT = 1000
// const instancedMeshHelper = new THREE.Object3D();
// let triangles

const MAX_TRIANGLES = 100
// const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
const shape = new THREE.Shape();
const x = 0;
const y = 1;
shape.moveTo(x - 18, y);
shape.lineTo(x + 18, y);
shape.lineTo(x, y - 10);



let ANGLE_BIN_WIDTH = 10
let ANGLE_BIN_LIMITS = [-65, 65]
let RANGE_BIN_WIDTH = 0.5
let RANGE_BIN_LIMITS = [0, 20]
let WINDOW_LENGTH = 5
let BIN_THRESHOLD = 3
let USE_BOX = false
let GRID_DRAW_PCD = "disabled"
let CAMERA_DRAW_PCD = "disabled"
let CAMERA_PCD_LABEL = false

let socketUrlH264 = '/rt/camera/h264/'
let socketUrlPcd = '/rt/radar/targets/'
let socketUrlDetect = '/rt/detect/boxes2d/'
let socketUrlMask = '/rt/detect/mask/'
let socketUrlErrors = '/ws/dropped'
droppedframes(socketUrlErrors, playerCanvas)

const loader = new THREE.FileLoader();
loader.load(
    // resource URL
    '/config/webui/details',
    function (data) {
        const config = JSON.parse(data)
        console.log(config)
        if (config.ANGLE_BIN_WIDTH) { ANGLE_BIN_WIDTH = config.ANGLE_BIN_WIDTH }
        if (config.ANGLE_BIN_LIMITS) {
            ANGLE_BIN_LIMITS[0] = config.ANGLE_BIN_LIMITS[0]
            ANGLE_BIN_LIMITS[1] = config.ANGLE_BIN_LIMITS[1]
        }
        if (config.RANGE_BIN_WIDTH) { RANGE_BIN_WIDTH = config.RANGE_BIN_WIDTH }
        if (config.RANGE_BIN_LIMITS) {
            RANGE_BIN_LIMITS[0] = config.RANGE_BIN_LIMITS[0]
            RANGE_BIN_LIMITS[1] = config.RANGE_BIN_LIMITS[1]
        }
        if (config.WINDOW_LENGTH) {
            WINDOW_LENGTH = config.WINDOW_LENGTH
        }
        if (config.BIN_THRESHOLD) {
            BIN_THRESHOLD = config.BIN_THRESHOLD
        }

        if (config.USE_BOX) {
            USE_BOX = config.USE_BOX
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

        if (config.COMBINED_GRID_DRAW_PCD) {
            GRID_DRAW_PCD = config.COMBINED_GRID_DRAW_PCD
        }

        if (config.COMBINED_CAMERA_DRAW_PCD) {
            CAMERA_DRAW_PCD = config.COMBINED_CAMERA_DRAW_PCD
        }
        if (config.COMBINED_CAMERA_PCD_LABEL) {
            CAMERA_PCD_LABEL = config.COMBINED_CAMERA_PCD_LABEL
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

        alloc_bins()
        const gridHelper = new THREE.PolarGridHelper(RANGE_BIN_LIMITS[1], 360 / ANGLE_BIN_WIDTH, Math.floor(RANGE_BIN_LIMITS[1] / RANGE_BIN_WIDTH), 64, 0x000, 0x000);
        gridHelper.rotation.y = ANGLE_BIN_LIMITS[0] / 180 * PI;
        gridHelper.position.z = 0.002;
        grid_scene.add(gridHelper);

        for (let i = RANGE_BIN_LIMITS[0]; i < RANGE_BIN_LIMITS[1]; i += RANGE_BIN_WIDTH * 2) {
            const myText = new SpriteText(i.toFixed(2) + "m", 0.20, "0x888888")
            // myText.material.sizeAttenuation = false
            myText.position.x = 0
            myText.position.z = i
            grid_scene.add(myText)
        }

        const modelFPSUpdate = fpsUpdate(modelPanel)
        if (USE_BOX) {
            // const modelMSPanel = stats.addPanel(new Stats.Panel('model inference ms', '#A2A', '#420'));
            boxesstream(socketUrlDetect,
                (timing) => {
                    modelFPSUpdate();
                    // modelMSPanel.update(detect_boxes.msg.model_time.sec * 1e3 + detect_boxes.msg.model_time.nanosec * 1e-6, 33)
                }).then((boxmsg) => {
                    detect_boxes = boxmsg
                })
        } else {
            // const maskMSPanel = stats.addPanel(new Stats.Panel('mask decode ms', '#A2A', '#420'));
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
        }

        pcdStream(socketUrlPcd, fpsUpdate(radarPanel)).then((pcd) => {
            radar_points = pcd;
        })
    },
    function (xhr) {
        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (err) {
        console.error('An error happened', err);
    }
);
THREE.Cache.enabled = true;

const bins = []
var window_index = 0
function alloc_bins() {
    bins.length = 0
    const RANGE_BIN_COUNT = RANGE_BIN_LIMITS[1] / RANGE_BIN_WIDTH - RANGE_BIN_LIMITS[0] / RANGE_BIN_WIDTH + 1
    for (let i = ANGLE_BIN_LIMITS[0]; i <= ANGLE_BIN_LIMITS[1]; i += ANGLE_BIN_WIDTH) {
        let n = Array(RANGE_BIN_COUNT)
        for (let j = 0; j < RANGE_BIN_COUNT; j++) {
            n[j] = Array(WINDOW_LENGTH).fill([])
        }
        bins.push(n)
    }
    return bins
}


function clear_bins() {
    window_index = (window_index + 1) % WINDOW_LENGTH
    for (let i = 0; i < bins.length; i++) {
        for (let j = 0; j < bins[i].length; j++) {
            bins[i][j][window_index] = []
        }
    }
}

function get_bin(angle, range) {
    if (angle < ANGLE_BIN_LIMITS[0]) {
        angle = ANGLE_BIN_LIMITS[0]
    }
    if (angle > ANGLE_BIN_LIMITS[1]) {
        angle = ANGLE_BIN_LIMITS[1]
    }
    if (range < RANGE_BIN_LIMITS[0]) {
        range = RANGE_BIN_LIMITS[0]
    }
    if (range > RANGE_BIN_LIMITS[1]) {
        range = RANGE_BIN_LIMITS[1]
    }
    const i = Math.floor((angle - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH)
    const j = Math.floor((range - RANGE_BIN_LIMITS[0]) / RANGE_BIN_WIDTH)
    return bins[i][j][window_index]

}

function increment_bin(angle, range, value) {
    if (angle < ANGLE_BIN_LIMITS[0]) {
        angle = ANGLE_BIN_LIMITS[0]
    }
    if (angle > ANGLE_BIN_LIMITS[1]) {
        angle = ANGLE_BIN_LIMITS[1]
    }
    if (range < RANGE_BIN_LIMITS[0]) {
        range = RANGE_BIN_LIMITS[0]
    }
    if (range > RANGE_BIN_LIMITS[1]) {
        range = RANGE_BIN_LIMITS[1]
    }
    const i = Math.floor((angle - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH)
    const j = Math.floor((range - RANGE_BIN_LIMITS[0]) / RANGE_BIN_WIDTH)
    bins[i][j][window_index].push(value)
}

function getValsInBin(angle, range, angleBinOffset, rangeBinOffset) {
    let angleBin = Math.floor((angle - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH) + angleBinOffset
    let rangeBin = Math.floor((range - RANGE_BIN_LIMITS[0]) / RANGE_BIN_WIDTH) + rangeBinOffset
    angleBin = (angleBin + bins.length) % bins.length
    if (rangeBin < 0) {
        // rangeBin = 0
        return []
    }
    if (rangeBin >= bins[angleBin].length) {
        // rangeBin = bins[angleBin].length - 1
        return []
    }
    let sum = bins[angleBin][rangeBin].reduce((a, b) => a.concat(b), [])
    return sum
}

function getCountInBin(angle, range, angleBinOffset, rangeBinOffset) {
    let angleBin = Math.floor((angle - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH) + angleBinOffset
    let rangeBin = Math.floor((range - RANGE_BIN_LIMITS[0]) / RANGE_BIN_WIDTH) + rangeBinOffset
    angleBin = (angleBin + bins.length) % bins.length
    if (rangeBin < 0) {
        // rangeBin = 0
        return 0
    }
    if (rangeBin >= bins[angleBin].length) {
        // rangeBin = bins[angleBin].length - 1
        return 0
    }
    let sum = bins[angleBin][rangeBin].reduce((a, b) => a + b.length, 0)
    return sum
}

function getClassInList(l) {
    const classes = {}
    l.forEach((point) => {
        if (isFinite(classes[point.class])) {
            classes[point.class] += 1
        } else {
            classes[point.class] = 1
        }
    })
    let max_class = 0
    let max_class_val = -1
    for (var cl in classes) {
        if (max_class_val < classes[cl]) {
            max_class = cl
            max_class_val = classes[cl]
        }
    }
    return [max_class, max_class_val]
}


function clearThree(obj) {
    while (obj.children.length > 0) {
        clearThree(obj.children[0]);
    }
    if (obj.geometry) obj.geometry.dispose();

    if (obj.material) {
        //in case of map, bumpMap, normalMap, envMap ...
        Object.keys(obj.material).forEach(prop => {
            if (!obj.material[prop])
                return;
            if (obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function')
                obj.material[prop].dispose();
        })
        obj.material.dispose();
    }
    obj.parent.remove(obj);
    obj.removeFromParent()
}


const rendered_boxes = []

renderer.setAnimationLoop(animate);

// const animationUpdate = fpsUpdate(renderPanel, 100)

let points_cpy;
function animate() {
    // animationUpdate()

    if (typeof detect_boxes !== "undefined" && detect_boxes.needsUpdate) {
        rendered_boxes.forEach((cell) => {
            clearThree(cell)
        })
        rendered_boxes.length = 1
        detect_boxes.msg.boxes.forEach((box) => {
            // console.log(box)
            const scale = 10
            const pos = []
            pos.push(box.width * scale * width / height / 2, box.height * scale / 2, 0);
            pos.push(-box.width * scale * width / height / 2, box.height * scale / 2, 0);
            pos.push(-box.width * scale * width / height / 2, -box.height * scale / 2, 0);
            pos.push(box.width * scale * width / height / 2, -box.height * scale / 2, 0);
            pos.push(box.width * scale * width / height / 2, box.height * scale / 2, 0);
            const geometry = new LineGeometry();
            geometry.setPositions(pos);
            const rendered_box = new Line2(geometry, new LineMaterial({ color: 0x00ff00, linewidth: 10 }));
            rendered_box.rotation.x = PI / 2;
            rendered_box.position.x = (box.center_x - 0.5) * scale * width / height
            rendered_box.position.z = (0.5 - box.center_y) * scale
            rendered_box.position.y = scale / Math.tan(46.4 / 2 / 180 * PI) / 2
            rendered_boxes.push(rendered_box)
            scene.add(rendered_box)
        })
    }

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



const renderer_grid = new THREE.WebGLRenderer({ antialias: true, canvas: gridCanvas });
// canvas.width = canvas.offsetWidth;
// canvas.height = canvas.offsetHeight;
// renderer_grid.setSize(540, 1080)
// renderer.domElement.style.cssText = ""
let gridCanvasWidth = gridCanvas.parentElement.offsetWidth
let gridCanvasHeight = gridCanvas.parentElement.offsetHeight
renderer_grid.setSize(gridCanvasWidth, gridCanvasHeight)
function newRingGeo(angle, range, class_) {
    const geometry = new THREE.RingGeometry(range, range + RANGE_BIN_WIDTH, 4, 1, angle / 180 * PI + PI / 2, ANGLE_BIN_WIDTH / 180 * PI);
    const color = mask_colors[class_]
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = PI / 2
    // mesh.rotation.z = PI / 2
    return mesh
}
import { OrbitControls } from './OrbitControls.js'


const HFOV = 82
let aspect = gridCanvasWidth / gridCanvasHeight
let fov = Math.atan(Math.tan(HFOV * Math.PI / 360) / aspect) * 360 / Math.PI
// let fov = 20

const camera_grid = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
camera_grid.position.y = 2;
camera_grid.position.z = -5;

const orbitControls = new OrbitControls(camera_grid, gridCanvas);
orbitControls.target = new THREE.Vector3(0, 0, 3);
orbitControls.update();

renderer_grid.setAnimationLoop(animate_grid);

const occupied = []
const rendered_points = []

function color_points_field(points, field, scene, height = false, label = false) {
    points.sort(dynamicSort(field))
    let min_val = points[0][field]
    let max_val = points[points.length - 1][field]
    let avg_val = points[Math.floor(points.length / 2)][field]

    let maxDelta = Math.max(avg_val - min_val, max_val - min_val)
    min_val = avg_val - maxDelta
    max_val = avg_val + maxDelta
    points.forEach((point) => {
        const geometry = new THREE.SphereGeometry(0.1)
        let color = new THREE.Color(0xFFFFFF)
        if (max_val - min_val > 0) {
            if (point[field] < avg_val) {
                let l = (point[field] - avg_val) / (min_val - avg_val)
                l = (2 - l) / 2 * 100
                color = new THREE.Color("hsl(240, 100%, " + l + "%)")
            } else if (point[field] > avg_val) {
                let l = (point[field] - avg_val) / (max_val - avg_val)
                l = (2 - l) / 2 * 100
                color = new THREE.Color("hsl(0, 100%, " + l + "%)")
            }
        }
        const material = new THREE.MeshBasicMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.x = point.y
        sphere.position.z = point.x
        if (height) {
            sphere.position.y = point.z
        }
        rendered_points.push(sphere)
        scene.add(sphere)

        if (label) {
            const myText = new SpriteText(point[field].toFixed(2), 0.025, "0x888888")
            myText.material.sizeAttenuation = false
            const factor = 1 - 0.12 / Math.sqrt(point.y * point.y + point.x * point.x)
            myText.position.x = point.y * factor
            myText.position.z = point.x * factor
            if (height) {
                myText.position.y = point.z
            }
            myText.position.y += 0.12
            scene.add(myText)
            rendered_points.push(myText)
        }
    })
}

function color_points_class(points, scene, height = false, label = false) {
    points.forEach((point) => {
        const geometry = new THREE.SphereGeometry(0.1)
        let color = new THREE.Color(0xFFFFFF)
        if (point.class > 0) {
            color = mask_colors[point.class]
        }
        const material = new THREE.MeshBasicMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.x = point.y
        sphere.position.z = point.x
        if (height) {
            sphere.position.y = point.z
        }
        rendered_points.push(sphere)
        scene.add(sphere)

        if (label) {
            const myText = new SpriteText(point.class, 0.025, "0x888888")
            myText.material.sizeAttenuation = false
            const factor = 1 - 0.12 / Math.sqrt(point.y * point.y + point.x * point.x)
            myText.position.x = point.y * factor
            myText.position.z = point.x * factor
            if (height) {
                myText.position.y = point.z
            }
            myText.position.y += 0.12
            scene.add(myText)
            rendered_points.push(myText)
        }
    })
}

function animate_grid() {
    if ((typeof mask_tex !== "undefined" || typeof detect_boxes !== "undefined") && typeof radar_points !== "undefined" && radar_points.needsUpdate && bins.length > 0) {
        clear_bins()
        rendered_points.forEach((cell) => {
            clearThree(cell)
            grid_scene.remove(cell)
            scene.remove(cell)
        })
        rendered_points.length = 0
        let points_cpy = typeof mask_tex !== "undefined" ? classify_points(radar_points.points, mask_tex) : classify_points_box(radar_points.points, detect_boxes.msg.boxes)
        // let points_cpy = radar_points.points
        if (GRID_DRAW_PCD != "disabled" && radar_points.points.length > 0) {
            if (GRID_DRAW_PCD == "class") {
                color_points_class(points_cpy, grid_scene)
            } else {
                color_points_field(points_cpy, GRID_DRAW_PCD, grid_scene)
            }
        }

        if (CAMERA_DRAW_PCD != "disabled" && radar_points.points.length > 0) {
            if (CAMERA_DRAW_PCD == "class") {
                color_points_class(points_cpy, scene, true, CAMERA_PCD_LABEL)
            } else {
                color_points_field(points_cpy, CAMERA_DRAW_PCD, scene, true, CAMERA_PCD_LABEL)
            }
        }

        for (let p of points_cpy) {
            if (p.class > 0) {
                p.range = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
                p.angle = Math.atan2(p.y, p.x)
                increment_bin(-p.angle * 180 / PI, p.range, p)
            }
        }
        occupied.forEach((cell) => {
            clearThree(cell)
            grid_scene.remove(cell)
        })
        occupied.length = 0
        let foundOccupied = new Array(bins.length).fill(false)
        for (let j = RANGE_BIN_LIMITS[0]; j <= RANGE_BIN_LIMITS[1]; j += RANGE_BIN_WIDTH) {
            for (let i = ANGLE_BIN_LIMITS[0] + ANGLE_BIN_WIDTH; i <= ANGLE_BIN_LIMITS[1] - ANGLE_BIN_WIDTH; i += ANGLE_BIN_WIDTH) {
                let currInd = (i - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH
                if (foundOccupied[currInd]) {
                    continue;
                }
                let val0 = getValsInBin(i, j, 0, 0)
                let val1 = getValsInBin(i, j, 0, -1)
                let val2 = getValsInBin(i, j, 0, -2)
                let sum0 = val0.length
                let sum1 = val1.length
                let sum2 = val2.length
                if (sum0 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0)
                    const cell = newRingGeo(i, j, class_)
                    occupied.push(cell)
                    grid_scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH, class_)
                    occupied.push(cell)
                    grid_scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 + sum2 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1, val2))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH * 2, class_)
                    occupied.push(cell)
                    grid_scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
            }
        }

        for (let j = RANGE_BIN_LIMITS[0]; j <= RANGE_BIN_LIMITS[1]; j += RANGE_BIN_WIDTH) {
            for (let i = ANGLE_BIN_LIMITS[0] + ANGLE_BIN_WIDTH; i <= ANGLE_BIN_LIMITS[1] - ANGLE_BIN_WIDTH; i += ANGLE_BIN_WIDTH) {
                let angle = i + ANGLE_BIN_WIDTH / 2
                let currInd = (i - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH
                if (foundOccupied[currInd]) {
                    continue;
                }
                let val0 = getValsInBin(i, j, 0, 0)
                let val1 = getValsInBin(i, j, 0, -1)
                let val2 = getValsInBin(i, j, 0, -2)

                if (!foundOccupied[(i - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH + 1]) {
                    val0 = val0.concat(getValsInBin(i, j, 1, 0))
                    val1 = val1.concat(getValsInBin(i, j, 1, -1))
                    val2 = val2.concat(getValsInBin(i, j, 1, -2))
                }
                if (!foundOccupied[((i - ANGLE_BIN_LIMITS[0]) / ANGLE_BIN_WIDTH - 1 + bins.length) % bins.length]) {
                    val0 = val0.concat(getValsInBin(i, j, -1, 0))
                    val1 = val1.concat(getValsInBin(i, j, -1, -1))
                    val2 = val2.concat(getValsInBin(i, j, -1, -2))
                }
                let sum0 = val0.length
                let sum1 = val1.length
                let sum2 = val2.length
                if (sum0 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0)
                    const cell = newRingGeo(i, j, class_)
                    occupied.push(cell)
                    grid_scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH, class_)
                    occupied.push(cell)
                    grid_scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 + sum2 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1, val2))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH * 2, class_)
                    occupied.push(cell)
                    grid_scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
            }
        }

        radar_points.needsUpdate = false
    }
    renderer_grid.render(grid_scene, camera_grid);
}

window.addEventListener('resize', onWindowResize);
function onWindowResize() {

    let gridCanvasWidth = gridCanvas.parentElement.offsetWidth
    let gridCanvasHeight = gridCanvas.parentElement.offsetHeight

    camera_grid.aspect = gridCanvasWidth / gridCanvasHeight
    camera_grid.fov = Math.atan(Math.tan(HFOV * Math.PI / 360) / camera_grid.aspect) * 360 / Math.PI
    // camera_grid.rotation.x = -Math.atan2(camera_grid.position.y, camera_grid.position.z-0.5) - camera_grid.fov * 0.5 * PI / 180;
    camera_grid.updateProjectionMatrix();
    renderer_grid.setSize(gridCanvasWidth, gridCanvasHeight)
}