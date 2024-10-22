import * as THREE from './three.js'
import segstream, { get_shape } from './mask.js'
import { OrbitControls } from './OrbitControls.js'
import Stats from './Stats.js'
import pcdStream from './pcd.js'
import classify_points, { classify_points_box } from './classify.js'
import boxesstream from './boxes.js'
import { dynamicSort } from './sort.js'
import { PolarGridFan } from './polarGridFan.js'
import SpriteText from './three-spritetext.js';
const PI = Math.PI

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);

const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);



const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', onWindowResize);
renderer.domElement.style.cssText = "display:flex; position: absolute; top: 0; left: 0;"
document.querySelector('main').appendChild(renderer.domElement);

const stats = new Stats();
var renderPanel = stats.addPanel(new Stats.Panel('renderFPS', '#4ff', '#022'));
var radarPanel = stats.addPanel(new Stats.Panel('radarFPS', '#ff4', '#220'));
var modelPanel = stats.addPanel(new Stats.Panel('modelFPS', '#f4f', '#210'));
stats.dom.style.cssText = "position: absolute; top: 0px; right: 0px; opacity: 0.9; z-index: 10000;";
stats.showPanel([3, 4, 5, 6])
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


// const geometry = new THREE.PlaneGeometry(1, 1);
// const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
// const plane = new THREE.Mesh(geometry, material);
// scene.add(plane);


// const loader = new STLLoader();
// loader.load('/models/maivin2.stl', function (geometry) {
//     const hemiLight = new THREE.HemisphereLight(0x8d7c7c, 0x494966, 9);
//     scene.add(hemiLight);
//     const material = new THREE.MeshPhongMaterial({ color: 0xFFAA00 });
//     const cameraModel = new THREE.Mesh(geometry, material);
//     cameraModel.scale.set(0.015, 0.015, 0.015); // Adjust the scale as needed
//     cameraModel.rotation.x = PI / 2;
//     cameraModel.rotation.y = PI;
//     cameraModel.position.x = 0;
//     cameraModel.position.z = 1;
//     scene.add(cameraModel);
// }, undefined, function (error) {
//     console.error('An error happened', error);
// });

camera.position.y = 30;
camera.position.z = 3.8;
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.target = new THREE.Vector3(0, 2, 4);
orbitControls.update();

let mask_tex;
let detect_boxes;
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

let socketUrlMask = '/rt/detect/mask/'
let socketUrlDetect = '/rt/detect/boxes2d/'
let socketUrlPcd = '/rt/radar/targets/';

function parseNumbersInObject(obj) {
    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = parseNumbersInObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
            if (!isNaN(obj[key]) && obj[key].trim() !== '') {
                if (obj[key].includes('.')) {
                    obj[key] = parseFloat(obj[key]);
                } else {
                    obj[key] = parseInt(obj[key], 10);
                }
            }
        }
    }
    return obj;
}

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


        alloc_bins()

        const gridHelper = new PolarGridFan(RANGE_BIN_LIMITS[0], RANGE_BIN_LIMITS[1],
            -ANGLE_BIN_LIMITS[0] * Math.PI / 180, -ANGLE_BIN_LIMITS[1] * Math.PI / 180,
            360 / ANGLE_BIN_WIDTH,
            Math.floor(RANGE_BIN_LIMITS[1] / RANGE_BIN_WIDTH),
            64,
            0x000,
            0x000
        );
        gridHelper.position.z = 0.002;
        scene.add(gridHelper);

        for (let i = RANGE_BIN_LIMITS[0]; i <= RANGE_BIN_LIMITS[1]; i += RANGE_BIN_WIDTH * 2) {
            const myText = new SpriteText(i.toFixed(2) + "m", 0.20, "0x888888")
            // myText.material.sizeAttenuation = false
            myText.position.x = 0
            myText.position.z = i
            scene.add(myText)
        }

        const modelFPSUpdate = fpsUpdate(modelPanel)
        if (USE_BOX) {
            const modelMSPanel = stats.addPanel(new Stats.Panel('model inference ms', '#A2A', '#420'));
            boxesstream(socketUrlDetect,
                (timing) => {
                    modelFPSUpdate();
                    modelMSPanel.update(detect_boxes.msg.model_time.sec * 1e3 + detect_boxes.msg.model_time.nanosec * 1e-6, 33)
                }).then((boxmsg) => {
                    detect_boxes = boxmsg
                })
        } else {
            const maskMSPanel = stats.addPanel(new Stats.Panel('mask decode ms', '#A2A', '#420'));
            get_shape(socketUrlMask, (height, width, length, mask) => {
                const classes = Math.round(mask.length / height / width)
                segstream(socketUrlMask, height, width, classes, (timing) => { modelFPSUpdate(); maskMSPanel.update(timing.decode_time, 33) }).then((texture_mask) => {
                    mask_tex = texture_mask
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
    console.log("i am here")
    bins.length = 0
    const RANGE_BIN_COUNT = RANGE_BIN_LIMITS[1] / RANGE_BIN_WIDTH - RANGE_BIN_LIMITS[0] / RANGE_BIN_WIDTH + 1
    console.log("RANGE_BIN_WIDTH:", RANGE_BIN_WIDTH, "Type:", typeof RANGE_BIN_WIDTH);
    console.log("ANGLE_BIN_WIDTH:", ANGLE_BIN_WIDTH, "Type:", typeof ANGLE_BIN_WIDTH);
    for (let i = ANGLE_BIN_LIMITS[0]; i <= ANGLE_BIN_LIMITS[1]; i += ANGLE_BIN_WIDTH) {
        console.log("in loop 1")
        let n = Array(RANGE_BIN_COUNT)
        for (let j = 0; j < RANGE_BIN_COUNT; j++) {
            console.log("in loop 2")
            n[j] = Array(WINDOW_LENGTH).fill([])
        }
        bins.push(n)
        console.log("in loop 3")
    }
    console.log("after loop")
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

const mask_colors = [
    new THREE.Color(1.0, 1.0, 1.0),
    new THREE.Color(0., 1., 0.),
    new THREE.Color(0.50980392, 0.50980392, 0.72941176),
    new THREE.Color(0.00784314, 0.18823529, 0.29411765)
]

function newRingGeo(angle, range, class_) {
    const geometry = new THREE.RingGeometry(range, range + RANGE_BIN_WIDTH, 4, 1, angle / 180 * PI + PI / 2, ANGLE_BIN_WIDTH / 180 * PI);
    const color = mask_colors[class_]
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = PI / 2
    // mesh.rotation.z = PI / 2
    return mesh
}

renderer.setAnimationLoop(animate);
// scene.add(newRingGeo(-10, 0.5))

const occupied = []
const rendered_points = []


function color_points_field(points, field) {
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
        sphere.position.y = 0
        rendered_points.push(sphere)
        scene.add(sphere)
        // const clone = sphere.clone()
        // clone.position.y = point.z
        // scene.add(clone)
        // rendered_points.push(clone)
    })
}

function color_points_class(points) {
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
        sphere.position.y = 0
        rendered_points.push(sphere)
        scene.add(sphere)
    })
}


const animationUpdate = fpsUpdate(renderPanel, 100)
function animate() {
    animationUpdate()
    if ((typeof mask_tex !== "undefined" || typeof detect_boxes !== "undefined") && typeof radar_points !== "undefined" && radar_points.needsUpdate && bins.length > 0) {
        clear_bins()
        rendered_points.forEach((cell) => {
            clearThree(cell)
        })
        rendered_points.length = 0
        let points_cpy = typeof mask_tex !== "undefined" ? classify_points(radar_points.points, mask_tex) : classify_points_box(radar_points.points, detect_boxes.msg.boxes)
        if (DRAW_PCD != "disabled" && radar_points.points.length > 0) {
            if (DRAW_PCD == "class") {
                color_points_class(points_cpy)
            } else {
                color_points_field(points_cpy, DRAW_PCD)
            }
        }

        for (let p of points_cpy) {
            if (p.class > 0) {
                increment_bin(-p.angle * 180 / PI, p.range, p)
            }
        }
        occupied.forEach((cell) => {
            clearThree(cell)
            scene.remove(cell)
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
                    scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH, class_)
                    occupied.push(cell)
                    scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 + sum2 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1, val2))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH * 2, class_)
                    occupied.push(cell)
                    scene.add(cell)
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
                    scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH, class_)
                    occupied.push(cell)
                    scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
                if (sum0 + sum1 + sum2 >= BIN_THRESHOLD) {
                    const [class_, _] = getClassInList(val0.concat(val1, val2))
                    const cell = newRingGeo(i, j - RANGE_BIN_WIDTH * 2, class_)
                    occupied.push(cell)
                    scene.add(cell)
                    foundOccupied[currInd] = true
                    if (currInd > 0) { foundOccupied[currInd - 1] = true }
                    if (currInd < bins.length - 1) { foundOccupied[currInd + 1] = true }
                    continue
                }
            }
        }

        radar_points.needsUpdate = false
    }
    renderer.render(scene, camera);
    stats.update();
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}