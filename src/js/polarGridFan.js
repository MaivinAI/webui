import { LineSegments, Color, BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from "./three.js";

export class PolarGridFan extends LineSegments {

    constructor(radius_min = 0, radius_max = 10, angle_min = 0, angle_max = Math.PI * 2, sectors = 16, rings = 8, divisions = 64, color1 = 0x444444, color2 = 0x888888) {

        color1 = new Color(color1);
        color2 = new Color(color2);

        const vertices = [];
        const colors = [];

        // create the sectors
        console.log(angle_max)
        if (sectors > 1) {

            for (let i = 0; i <= sectors; i++) {

                const v = (angle_min) + (i / sectors) * (angle_max-angle_min);

                const x = Math.sin(v) * radius_max;
                const z = Math.cos(v) * radius_max;

                vertices.push(0, 0, 0);
                vertices.push(x, 0, z);

                const color = (i & 1) ? color1 : color2;

                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);

            }

        }

        // create the rings

        for (let i = 0; i <= rings; i++) {

            const color = (i & 1) ? color1 : color2;

            const r = radius_max - ((radius_max-radius_min) / rings * i);

            for (let j = 0; j < divisions; j++) {

                // first vertex

                let v = (angle_min) + (j / divisions) * (angle_max - angle_min);

                let x = Math.sin(v) * r;
                let z = Math.cos(v) * r;

                vertices.push(x, 0, z);
                colors.push(color.r, color.g, color.b);

                // second vertex
                
                v = (angle_min) + ((j + 1) / divisions) * (angle_max - angle_min);

                x = Math.sin(v) * r;
                z = Math.cos(v) * r;

                vertices.push(x, 0, z);
                colors.push(color.r, color.g, color.b);

            }

        }

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

        const material = new LineBasicMaterial({ vertexColors: true, toneMapped: false });

        super(geometry, material);

        this.type = 'PolarGridHelper';

    }

    dispose() {

        this.geometry.dispose();
        this.material.dispose();

    }

}