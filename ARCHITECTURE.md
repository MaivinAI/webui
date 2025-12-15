# Maivin WebUI Architecture

**Version:** 1.0
**Author:** Sébastien Taylor <sebastien@au-zone.com>
**Last Updated:** 2025-12-15

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [H.264 Video Streaming](#h264-video-streaming)
6. [Sensor Data Topics](#sensor-data-topics)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend API](#backend-api)
9. [Data Serialization](#data-serialization)
10. [Key Components](#key-components)
11. [Performance Optimizations](#performance-optimizations)
12. [Deployment](#deployment)

---

## Overview

The Maivin WebUI is a browser-based real-time visualization platform for the EdgeFirst Maivin and Raivin embedded AI platforms. It provides web-based access to:

- **H.264 Camera Streams** (including tiled 4K video)
- **Radar Point Clouds**
- **Lidar Point Clouds**
- **AI Model Outputs** (detection boxes, segmentation masks)
- **GPS/IMU Sensor Data**
- **System Configuration** and service management

The architecture consists of two main components:

- **WebUI** (`/home/sebastien/Software/Maivin/webui`) - Frontend static web application
- **WebSRV** (`/home/sebastien/Software/Maivin/websrv`) - Rust-based backend server

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Browser                               │
│  (Chrome/Firefox with WebCodecs and WebGL support)              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                   HTTPS (Port 443)
                   HTTP (Port 80)
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   WebSRV (Actix-web)                             │
│                 Rust Backend Server                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Static File Serving (HTML, JS, CSS)                   │   │
│  │ • RESTful API Endpoints                                  │   │
│  │ • WebSocket Handlers (Real-time streaming)               │   │
│  │ • Configuration Management                               │   │
│  │ • Recording/Playback Control (MCAP)                      │   │
│  │ • Service Management (systemctl integration)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                        │
│                   Zenoh Client                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          Zenoh Pub/Sub (High-performance messaging)
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                  │
┌───────▼──────┐ ┌───────▼──────┐ ┌────────▼─────┐
│ Camera        │ │ Radar/Lidar  │ │ AI Models    │
│ H.264 Encoder │ │ Point Clouds │ │ Detections   │
│ Service       │ │ Publishing   │ │ Segmentation │
└───────────────┘ └──────────────┘ └──────────────┘
```

### Communication Pattern

The WebSRV backend acts as a **Zenoh-to-WebSocket bridge**:

1. Browser connects to WebSocket endpoint (e.g., `/rt/camera/h264`)
2. WebSRV creates a Zenoh subscriber for the requested topic
3. Messages from Zenoh are broadcast to all connected WebSocket clients
4. Browser receives binary CDR-serialized data for rendering

---

## Technology Stack

### Frontend (WebUI)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Rendering** | Three.js, Canvas API | 3D visualization and 2D overlays |
| **Video Codec** | WebCodecs API | Hardware-accelerated H.264 decoding |
| **Styling** | Tailwind CSS | Responsive utility-first styling |
| **Module System** | ES6 Modules | Modular JavaScript architecture |
| **Build Process** | None | Static files, no bundling required |

### Backend (WebSRV)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Web Framework** | Actix-web 4.12.1 | Async HTTP server |
| **WebSockets** | Actix-web-actors 4.3.0 | Real-time streaming |
| **Message Bus** | Zenoh 1.6.2 | Pub/sub integration with EdgeFirst |
| **Recording** | MCAP 0.23.4 | Data recording and playback |
| **TLS** | OpenSSL | HTTPS/SSL support |
| **Language** | Rust (Edition 2021) | Performance and safety |

---

## Data Flow

### WebSocket Streaming Flow

```
Browser WebSocket Connection
        ↓
   /rt/{topic/path}
        ↓
WebSRV websocket_handler() (main.rs:203-249)
        ↓
Spawns zenoh_listener thread (main.rs:320-364)
        ↓
Zenoh Subscriber → Topic Messages
        ↓
Broadcast to all WebSocket clients
        ↓
Client receives binary CDR data
        ↓
JavaScript deserializes and renders
```

### Default Zenoh Topics

- `/rt/camera/h264` - H.264 video stream
- `/rt/camera/h264/tl`, `/rt/camera/h264/tr`, `/rt/camera/h264/bl`, `/rt/camera/h264/br` - Tiled 4K video
- `/rt/detect/boxes2d` - 2D detection bounding boxes
- `/rt/detect/mask_compressed` - Segmentation masks (Zstandard compressed)
- `/rt/radar/targets` - Radar point cloud
- `/rt/fusion/radar` - Fused radar data
- `/rt/fusion/lidar` - Fused lidar data
- `/rt/gps/*` - GPS data
- `/rt/imu/*` - IMU data

### WebSocket Priority Queuing

**High Priority** (capacity=16):
- `/rt/detect/mask` - Segmentation masks (critical for visualization)

**Low Priority** (capacity=1):
- All other `/rt/*` topics - Only latest frame kept, older frames dropped

---

## H.264 Video Streaming

### Smart Tile Detection System

The `SmartVideoManager` (src/js/SmartVideoManager.js) intelligently detects and handles tiled 4K video:

**Tiled 4K Configuration:**
```
┌─────────┬─────────┐
│   TL    │   TR    │  /rt/camera/h264/tl (top-left)
│ 1920x   │ 1920x   │  /rt/camera/h264/tr (top-right)
│ 1080    │ 1080    │
├─────────┼─────────┤
│   BL    │   BR    │  /rt/camera/h264/bl (bottom-left)
│ 1920x   │ 1920x   │  /rt/camera/h264/br (bottom-right)
│ 1080    │ 1080    │
└─────────┴─────────┘
      3840 x 2160
```

**Detection Logic:**
1. Attempts to connect to all 4 tile endpoints
2. 5-second detection timeout
3. Requires minimum 2 tiles to use tile mode
4. Falls back to single `/rt/camera/h264` stream if tiles unavailable

### Tile Synchronization

**Frame Sync Requirements:**
- Minimum 15 FPS (67ms throttle)
- ALL 4 tiles must be ready before rendering
- Maximum 500ms wait for synchronized update
- Aggressive frame dropping to maintain sync

### H.264 Decoder Pipeline

```javascript
WebSocket Binary Message
        ↓
CDR Deserialization (Cdr.js)
  • header.stamp.sec (timestamp)
  • header.stamp.nsec (nanoseconds)
  • header.frame_id (string)
  • image_data (uint8Array)
        ↓
EncodedVideoChunk Creation
  • type: "key"
  • timestamp: calculated from fps
  • data: H.264 NAL units
        ↓
VideoDecoder.decode() [WebCodecs API]
  • Hardware-accelerated decoding
  • Codec: avc1.42001E (H.264 Baseline)
  • optimizeForLatency: true
        ↓
Canvas Rendering
  • ctx.drawImage(videoFrame, 0, 0)
  • videoFrame.close() [memory management]
        ↓
THREE.CanvasTexture Update
  • texture.needsUpdate = true
  • Rendered to WebGL scene
```

**Performance Features:**
- 15-second idle timeout detection
- Decoder state monitoring and recovery
- Frame counting for FPS monitoring
- Error handling with graceful degradation

---

## Sensor Data Topics

### Detection Boxes (`/rt/detect/boxes2d`)

**Data Format (CDR):**
```javascript
{
  boxes: [
    {
      center_x: float,      // Normalized 0-1
      center_y: float,      // Normalized 0-1
      width: float,         // Normalized 0-1
      height: float,        // Normalized 0-1
      label: string,        // Class name
      confidence: float,    // 0-1 confidence score
      track: {
        id: uuid,          // Persistent tracking ID
        ...
      }
    }
  ]
}
```

**Visualization (src/js/boxes.js):**
- UUID → deterministic color mapping
- Rectangle stroke overlay on video
- Label text with confidence scores
- Mirror support for horizontal flip

### Segmentation Masks (`/rt/detect/mask_compressed`)

**Data Format (CDR):**
```javascript
{
  header: { ... },
  height: uint32,
  width: uint32,
  length: uint32,
  encoding: string,      // "zstd" or "raw"
  data: uint8Array       // Compressed or raw mask
}
```

**Processing Pipeline (src/js/mask.js):**
1. Receive CDR-serialized message
2. Decompress with Zstandard (fzstd.js) if encoded
3. Create THREE.DataArrayTexture from mask data
4. Apply per-class color mapping
5. Render as ProjectedMaterial overlay on camera feed

**Priority:** HIGH (capacity=16) to prevent frame drops on critical visualization data.

### Radar Point Cloud (`/rt/radar/targets`, `/rt/fusion/radar`)

**Format:** ROS2 PointCloud2 (CDR serialized)

```javascript
{
  header: {
    stamp: { sec: uint32, nsec: uint32 },
    frame_id: string
  },
  height: uint32,
  width: uint32,
  fields: [                    // PointField array
    {
      name: string,            // e.g., "x", "y", "z", "velocity"
      offset: uint32,
      datatype: uint8,         // 1=INT8...8=FLOAT64
      count: uint32
    }
  ],
  is_bigendian: boolean,
  point_step: uint32,          // Bytes per point
  row_step: uint32,            // Bytes per row
  data: uint8Array,            // Binary point data
  is_dense: boolean
}
```

**Deserialization (src/js/pcd.js):**
- DataView-based binary reading
- Support for 8 numeric types (INT8 through FLOAT64)
- Endianness handling (little/big endian)
- Dynamic field extraction based on PointField definitions

**3D Visualization:**
- THREE.Points geometry with custom coloring
- Field-based coloring (velocity, classification, intensity)
- Range filtering (0-20m default)
- Height mapping for z-axis visualization

### GPS Data (`/rt/gps/*`)

**Visualization:** Leaflet.js map integration (src/js/leaflet.js)
- Real-time position tracking
- Map tiles from OpenStreetMap
- Marker updates on GPS position changes

### IMU Data (`/rt/imu/*`)

**Visualization:** 3D orientation display (src/js/imu.js)
- Quaternion → Euler angle conversion
- 3D mesh rotation visualization
- Roll, pitch, yaw display

---

## Frontend Architecture

### Main Visualization Pages

| Page | Purpose | Key Streams |
|------|---------|-------------|
| `index.html` | Visualization selector | Device detection |
| `camera.html` | Camera stream with overlays | H.264 + boxes |
| `combined.html` | Segmentation + Radar split | H.264 + mask + radar |
| `combined_lidar.html` | 3D multi-modal view | H.264 + mask + radar + lidar |
| `grid.html` | Occupancy grid | Grid topic |
| `segmentation.html` | Segmentation only | Mask stream |
| `gps.html` | GPS map | GPS position |
| `imu.html` | IMU orientation | IMU quaternion |
| `jpeg.html` | JPEG fallback | JPEG stream |

### Configuration Pages (`config/`)

- `camera.html` - Camera device, resolution, streaming options
- `detect.html` - Detection model configuration
- `segment.html` - Segmentation model configuration
- `fusion.html` - Fusion parameters
- `radarpub.html` - Radar sensor configuration
- `lidarpub.html` - Lidar sensor configuration
- `gpsd.html` - GPS daemon settings
- `recorder.html` - Recording management (MCAP)
- `services.html` - Service status and control
- `model.html` - Model inference settings
- `webui.html` - WebUI configuration
- `settings.html` - General settings

### Core JavaScript Modules

**Utilities:**
- `Cdr.js` - CDR serialization/deserialization reader
- `constants.js` - Application constants
- `utils.js` - THREE.js helpers, point coloring, scene management
- `helpers.js` - Common utility functions

**Streaming:**
- `streamH264.js` - Basic H.264 decoder
- `stream.js` - H.264 with THREE.js texture integration
- `SmartVideoManager.js` - Intelligent tile detection & synchronization
- `droppedframes.js` - Frame drop monitoring via `/ws/dropped`

**Visualization:**
- `boxes.js` - 2D bounding box drawing
- `boxes3d.js` - 3D bounding box rendering
- `mask.js` - Segmentation mask streaming and texture mapping
- `pcd.js` - Point cloud deserialization
- `grid_render.js` - Occupancy grid rendering
- `classify.js` - Point classification and projection
- `combined.js` - Combined visualization page controller
- `combined_lidar.js` - Lidar combined visualization

**UI:**
- `navbar.js` - Navigation header with status indicators
- `status.js` - Service status monitoring
- `serviceCache.js` - Client-side service status caching
- `raivin.js` - Device-specific logic

**Libraries:**
- `three.js` - Three.js WebGL library (r167)
- `tailwind.js` - Tailwind CSS runtime
- `OrbitControls.js` - 3D camera controls
- `ProjectedMask.js`, `ProjectedMaterial.js` - Segmentation overlay materials
- `Stats.js` - Performance monitoring
- `fzstd.js` - Zstandard decompression (WebAssembly)

---

## Backend API

### WebSocket Endpoints

```
GET /rt/{tail:.*}               Low priority streaming (capacity=1)
GET /rt/detect/mask             High priority mask streaming (capacity=16)
GET /ws/dropped                 Frame drop statistics
GET /mcap/                      MCAP file playback WebSocket
```

### Static File Serving

```
GET /                           Serves index.html
GET /{file:.*}                  Static files with .html fallback
GET /config/{service}           Configuration page HTML
GET /settings                   Settings page
```

### Configuration API

```
GET  /config/{service}/details  Get configuration JSON
POST /config/{service}          Save configuration
GET  /config/service/status     Get all service statuses
POST /config/services/update    Update service configuration
```

### Recording & Playback (MCAP)

```
POST /start                     Start recording
POST /stop                      Stop recording
POST /replay                    Start MCAP playback
POST /replay-end                Stop playback
GET  /replay-status             Check playback status
GET  /current-recording         Get active recording filename
GET  /check-storage             Check storage availability
GET  /download/{file:.*}        Download MCAP files
POST /delete                    Delete MCAP file
```

### Service Management

```
GET  /recorder-status           Check if recorder is running
POST /live-run                  Isolate system to target (systemctl)
```

### Operating Modes

**System Mode** (`--system` flag):
- Uses systemctl to manage recorder service
- System-level service integration
- Production deployment

**User Mode** (default):
- Spawns edgefirst-recorder process directly
- User-level recording
- Development/edge deployment

---

## Data Serialization

### CDR (Common Data Representation)

ROS2 standard binary serialization format for efficient network transmission.

**CdrReader API (src/js/Cdr.js):**

```javascript
const reader = new CdrReader(dataView);

// Primitive types
reader.uint8()      // Read unsigned 8-bit
reader.int8()       // Read signed 8-bit
reader.uint16()     // Read unsigned 16-bit
reader.uint32()     // Read unsigned 32-bit
reader.uint64()     // Read unsigned 64-bit
reader.float32()    // Read 32-bit float
reader.float64()    // Read 64-bit float

// Complex types
reader.string()         // Variable-length string
reader.uint8Array()     // Byte array
reader.sequenceLength() // Array length prefix
```

**Example Deserialization:**

```javascript
const reader = new CdrReader(dataView);
const header_stamp_sec = reader.uint32();
const header_stamp_nsec = reader.uint32();
const header_frame_id = reader.string();
const image_data = reader.uint8Array();
```

### ZSTD Compression

Used for segmentation masks to reduce bandwidth (50-90% reduction typical).

```javascript
import { fzstd } from './fzstd.js';

// Decompress segmentation mask
const decompressed = fzstd.decompress(compressedData);
```

---

## Key Components

### Combined Visualization (combined.html)

**Rendering Stack (layers from bottom to top):**

1. **Camera H.264 Stream** - WebGL texture background
2. **Segmentation Mask** - ProjectedMaterial overlay with transparency
3. **Detection Boxes** - Canvas 2D overlay
4. **Radar Points** - THREE.Points geometry in 3D space

**Data Streams:**

```javascript
// H.264 Video
/rt/camera/h264/ → SmartVideoManager → Canvas → WebGL Texture

// Detection Boxes
/rt/detect/boxes2d/ → boxes.js → Canvas 2D overlay

// Segmentation Mask
/rt/detect/mask_compressed/ → mask.js → DataArrayTexture → ProjectedMaterial

// Radar Points
/rt/radar/targets/ → pcd.js → THREE.Points → 3D Scene
```

**FPS Monitoring:**
- Camera FPS (video stream rate)
- Radar FPS (point cloud rate)
- Model FPS (inference rate)
- Stats.js performance tracking

### Configuration Management Flow

```
User edits config form
        ↓
POST /config/{service} with JSON
        ↓
websrv::set_config() (main.rs)
        ↓
Parse JSON and validate
        ↓
Update /etc/default/{service} or config file
        ↓
Optional: systemctl restart {service}
        ↓
Return success/error response
```

### Service Status Monitoring (navbar.js)

**Status Indicators:**

- 🟢 **Green "Live Mode"** - All critical services running
- 🟠 **Amber "Live Mode (Degraded)"** - Some services down
- 🔵 **Blue "Replay Mode"** - Playback active, sensors stopped
- 🔴 **Red "Stopped"** - All sensors stopped

**Critical Services:**
- `camera` - Camera streaming
- `radarpub` - Radar publishing (Raivin only)
- `detect` - Detection model inference
- `segment` - Segmentation model inference

---

## Performance Optimizations

### Memory Management

- **Frame Dropping:** Only most recent message processed (old messages drained)
- **Object Pooling:** Reusable buffers for repeated allocations
- **THREE.js Disposal:** Proper cleanup of geometries, materials, textures
- **WebSocket Capacity Limits:**
  - High priority (mask): 16-message queue
  - Low priority (video/points): 1-message queue

### Network Optimization

- **CDR Serialization:** Compact binary format vs JSON (50-70% smaller)
- **Zstandard Compression:** Segmentation masks compressed (50-90% reduction)
- **Priority Queues:** Critical data gets more buffering
- **Tile Detection Timeout:** 5 seconds to decide strategy

### Rendering Optimization

- **FPS Throttling:** 15fps minimum sync for tiles
- **Lazy Texture Updates:** Canvas texture marked dirty only on change
- **WebCodecs Hardware Acceleration:** GPU video decoding
- **Canvas Caching:** Reused canvas contexts across frames
- **Geometry Instancing:** Efficient point cloud rendering

### Browser Requirements

- **WebCodecs API** - Hardware-accelerated H.264 decoding
- **WebGL 2.0** - Three.js rendering
- **WebSockets** - Real-time streaming
- **ES6 Modules** - Native module support

**Recommended Browsers:**
- Chrome 94+
- Edge 94+
- Firefox 97+ (with WebCodecs flag)

---

## Deployment

### File Serving Configuration

**Default docroot:** `/usr/share/webui` (read-only, system-managed)

**Writable alternatives:**
- `/home/torizon/webui` (user home directory)
- `/usr/local/share/webui` (system location, requires sudo)

**Configuration:** `/etc/default/webui` with `DOCROOT` variable

### systemctl Services

```
webui      - WebSRV backend server (HTTPS/WebSocket)
camera     - Camera capture and H.264 encoding
detect     - Object detection inference
segment    - Segmentation inference
recorder   - MCAP recording service
replay     - MCAP playback service
radarpub   - Radar sensor publishing (Raivin)
lidarpub   - Lidar sensor publishing
fusion     - Sensor fusion pipeline
gpsd       - GPS daemon
```

### Security

**HTTPS/TLS:**
- Certificates: `server.pem` (with encrypted private key)
- Ports: 443 (HTTPS), 80 (HTTP → HTTPS redirect)
- OpenSSL with Mozilla-intermediate cipher suites
- Private key encryption with passphrase

### Directory Structure

```
webui/
├── src/
│   ├── index.html              # Main entry point
│   ├── camera.html             # Camera visualization
│   ├── combined.html           # Multi-modal visualization
│   ├── combined_lidar.html     # 3D lidar visualization
│   ├── grid.html               # Occupancy grid
│   ├── segmentation.html       # Segmentation only
│   ├── gps.html                # GPS map
│   ├── imu.html                # IMU orientation
│   ├── config/                 # Configuration pages
│   ├── js/                     # JavaScript modules
│   ├── css/                    # Stylesheets
│   └── assets/                 # Images and SVGs
└── README.md

websrv/
├── src/
│   ├── main.rs                 # Main server (1868 lines)
│   └── args.rs                 # CLI arguments
├── Cargo.toml
├── server.pem                  # SSL certificate
└── target/                     # Compiled artifacts
```

---

## Technology Rationale

| Choice | Technology | Rationale |
|--------|-----------|-----------|
| **Frontend** | Pure HTML/JS | No build step, easy deployment, static files |
| **3D Rendering** | Three.js | WebGL abstraction, extensive ecosystem |
| **2D Overlay** | Canvas API | Low-latency direct pixel manipulation |
| **Video Codec** | WebCodecs + H.264 | Hardware acceleration, low latency |
| **Backend** | Rust/Actix-web | Async performance, memory safety, concurrency |
| **Message Bus** | Zenoh | Lightweight pub/sub, ROS2 compatible |
| **Serialization** | CDR | ROS2 standard, compact, efficient |
| **Compression** | Zstandard | Fast decompression, excellent ratio |
| **Recording** | MCAP | Multi-topic recording with metadata |
| **Styling** | Tailwind CSS | Utility-first, responsive, no custom CSS |

---

## Future Considerations

### Scalability

- Multiple concurrent browser clients supported
- Bandwidth scales with number of connected clients
- Frame dropping prevents buffer overflow on slow clients

### Extensibility

- New topics easily added to Zenoh configuration
- Modular JavaScript architecture for new visualizations
- CDR reader supports arbitrary ROS2 message types

### Monitoring

- Client-side: Stats.js FPS monitoring, dropped frame counter
- Server-side: env_logger for debugging, systemctl status integration

---

## References

- **WebCodecs API:** https://www.w3.org/TR/webcodecs/
- **Three.js:** https://threejs.org/
- **Zenoh:** https://zenoh.io/
- **Actix-web:** https://actix.rs/
- **ROS2 CDR:** https://www.omg.org/spec/DDSI-RTPS/
- **MCAP:** https://mcap.dev/

---

## Changelog

### Version 1.0 (2025-12-15)
- Initial architecture documentation
- Complete system overview and data flow
- Detailed component descriptions
- Performance optimization notes
