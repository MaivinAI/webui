import {
    BufferGeometry,
    Color,
    FileLoader,
    Float32BufferAttribute,
    Int32BufferAttribute,
    Loader,
    Points,
    PointsMaterial,
    AdditiveBlending,
    LineBasicMaterial,
    CircleGeometry,
    LineLoop,
    Group,
    Vector3
} from './three.js';

function jetColormap(val) {
    const color = new Color();
    const t = Math.max(0, Math.min(1, val)); // Clamp between 0 and 1

    // Adjust color mapping to be more like the second image
    // More blue-cyan dominant with subtle transitions
    if (t < 0.25) {
        // Deep blue to light blue
        color.setRGB(0.2, 0.2 + 2 * t, 0.8 + 0.2 * t);
    } else if (t < 0.5) {
        // Light blue to cyan
        color.setRGB(0.2 + 2 * (t - 0.25), 0.7, 1);
    } else if (t < 0.75) {
        // Cyan to yellow
        color.setRGB(0.7, 0.7, 1 - (t - 0.5) * 2);
    } else {
        // Yellow to white
        color.setRGB(0.7 + (t - 0.75) * 1.2, 0.7 + (t - 0.75) * 1.2, 0.5 * (t - 0.75));
    }

    return color;
}

class PCDLoader extends Loader {

    constructor(manager) {

        super(manager);

        this.littleEndian = true;

    }

    load(url, onLoad, onProgress, onError) {

        const scope = this;

        const loader = new FileLoader(scope.manager);
        loader.setPath(scope.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(scope.requestHeader);
        loader.setWithCredentials(scope.withCredentials);
        loader.load(url, function (data) {

            try {

                onLoad(scope.parse(data));

            } catch (e) {

                if (onError) {

                    onError(e);

                } else {

                    console.error(e);

                }

                scope.manager.itemError(url);

            }

        }, onProgress, onError);

    }

    createRangeRings() {
        const rings = new Group();
        const material = new LineBasicMaterial({ color: 0x404040 });

        // Create rings at 1m intervals up to 5m
        for (let radius = 1; radius <= 5; radius++) {
            const geometry = new CircleGeometry(radius, 64);
            // Remove center vertex
            const points = geometry.attributes.position;
            const circleGeom = new BufferGeometry().setFromPoints(
                Array.from({ length: points.count }, (_, i) => {
                    const vertex = new Vector3().fromBufferAttribute(points, i);
                    return vertex;
                }).filter((_, i) => i > 0) // Remove center vertex
            );
            const circle = new LineLoop(circleGeom, material);
            circle.rotation.x = -Math.PI / 2; // Lay flat
            rings.add(circle);
        }
        return rings;
    }

    parse(data) {
        const dataView = new DataView(data);
        const numPoints = Math.floor(data.byteLength / 16); // Each point is 16 bytes (4 floats)

        // First pass: count valid points within angle range
        let validPointCount = 0;
        for (let i = 0; i < numPoints; i++) {
            const offset = i * 16;
            const x = dataView.getFloat32(offset, true);
            const y = dataView.getFloat32(offset + 4, true);
            const z = dataView.getFloat32(offset + 8, true);
            const intensity = dataView.getFloat32(offset + 12, true);

            // Calculate angle in degrees from x,y coordinates
            const angle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

            if (!isNaN(x) && !isNaN(y) && !isNaN(z) &&
                isFinite(x) && isFinite(y) && isFinite(z) &&
                angle >= 110 && angle <= 250) {  // Only count points within 110° to 250°
                validPointCount++;
            }
        }

        const positions = new Float32Array(validPointCount * 3);
        const colors = new Float32Array(validPointCount * 3);

        let validIndex = 0;
        for (let i = 0; i < numPoints; i++) {
            const offset = i * 16;
            const x = dataView.getFloat32(offset, true);
            const y = dataView.getFloat32(offset + 4, true);
            const z = dataView.getFloat32(offset + 8, true);
            const intensity = dataView.getFloat32(offset + 12, true);

            // Calculate angle in degrees from x,y coordinates
            const angle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

            if (!isNaN(x) && !isNaN(y) && !isNaN(z) &&
                isFinite(x) && isFinite(y) && isFinite(z) &&
                angle >= 110 && angle <= 250) {  // Only include points within 110° to 250°

                // Position - LiDAR coordinate system to Three.js coordinate system
                positions[validIndex * 3] = x;     // LiDAR X -> Three.js X (right/left)
                positions[validIndex * 3 + 1] = z; // LiDAR Z -> Three.js Y (up/down)
                positions[validIndex * 3 + 2] = y; // LiDAR Y -> Three.js Z (forward/back)

                // Color based on reflectivity/intensity
                const normalizedIntensity = Math.min(Math.max(intensity / 100, 0), 1);
                // Use a cool blue-white color scheme
                colors[validIndex * 3] = 0.4 + normalizedIntensity * 0.6;     // R
                colors[validIndex * 3 + 1] = 0.4 + normalizedIntensity * 0.6; // G
                colors[validIndex * 3 + 2] = 0.7 + normalizedIntensity * 0.3; // B

                validIndex++;
            }
        }

        // Create geometry
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

        // Create material with adjusted point size and blending
        const material = new PointsMaterial({
            size: 3,
            vertexColors: true,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.8,
            blending: AdditiveBlending
        });

        // Create points and range rings
        const group = new Group();
        const points = new Points(geometry, material);
        const rings = this.createRangeRings();

        group.add(points);
        group.add(rings);

        return group;
    }

}

export { PCDLoader };