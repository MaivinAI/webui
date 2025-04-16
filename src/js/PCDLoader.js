import {
    BufferGeometry,
    Color,
    FileLoader,
    Float32BufferAttribute,
    Int32BufferAttribute,
    Loader,
    Points,
    PointsMaterial
} from './three.js';

function jetColormap(val) {
    const color = new Color();
    const t = Math.max(0, Math.min(1, val)); // Clamp between 0 and 1

    if (t < 0.25) {
        // Blue to Cyan
        color.setRGB(0, 4 * t, 1);
    } else if (t < 0.5) {
        // Cyan to Green
        color.setRGB(0, 1, 1 - 4 * (t - 0.25));
    } else if (t < 0.75) {
        // Green to Yellow
        color.setRGB(4 * (t - 0.5), 1, 0);
    } else {
        // Yellow to Red
        color.setRGB(1, 1 - 4 * (t - 0.75), 0);
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

    parse(data) {
        // Convert ArrayBuffer to Float32Array properly
        const dataView = new DataView(data);
        const numPoints = Math.floor(data.byteLength / 16); // Each point is 16 bytes (4 floats)

        // First pass: count valid points
        let validPointCount = 0;
        for (let i = 0; i < numPoints; i++) {
            const offset = i * 16;
            const x = dataView.getFloat32(offset, true);
            const y = dataView.getFloat32(offset + 4, true);
            const z = dataView.getFloat32(offset + 8, true);

            // Check if the point is valid (not NaN and not infinite)
            if (!isNaN(x) && !isNaN(y) && !isNaN(z) &&
                isFinite(x) && isFinite(y) && isFinite(z)) {
                validPointCount++;
            }
        }

        // Create arrays for valid points only
        const positions = new Float32Array(validPointCount * 3);
        const colors = new Float32Array(validPointCount * 3);

        // Fixed distance ranges (in meters)
        const minDist = 0;
        const maxDist = 6; // Maximum distance to consider

        // Second pass: fill arrays with valid points
        let validIndex = 0;
        for (let i = 0; i < numPoints; i++) {
            const offset = i * 16;
            const x = dataView.getFloat32(offset, true);
            const y = dataView.getFloat32(offset + 4, true);
            const z = dataView.getFloat32(offset + 8, true);

            // Only process valid points
            if (!isNaN(x) && !isNaN(y) && !isNaN(z) &&
                isFinite(x) && isFinite(y) && isFinite(z)) {

                // Position
                positions[validIndex * 3] = x;
                positions[validIndex * 3 + 1] = y;
                positions[validIndex * 3 + 2] = z;

                // Calculate absolute distance from origin
                const distance = Math.sqrt(x * x + y * y + z * z);

                // Normalize distance between 0 and 1
                const normalizedDist = Math.min(Math.max((distance - minDist) / (maxDist - minDist), 0), 1);

                // Color based on distance
                const color = jetColormap(1 - normalizedDist); // Invert so closer points are red

                colors[validIndex * 3] = color.r;
                colors[validIndex * 3 + 1] = color.g;
                colors[validIndex * 3 + 2] = color.b;

                validIndex++;
            }
        }

        // Create geometry
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

        // Create material
        const material = new PointsMaterial({
            size: 3.0,
            vertexColors: true,
            sizeAttenuation: false
        });

        // Create points
        return new Points(geometry, material);
    }

}

export { PCDLoader };