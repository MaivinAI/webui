import { defineConfig } from 'vite';
import path from 'path';
import daisyui from "daisyui"

const backend_url = 'https://10.10.41.41'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
        gps: path.resolve(__dirname, 'src/gps.html'),
        imu: path.resolve(__dirname, 'src/imu.html'),
        jpeg: path.resolve(__dirname, 'src/jpeg.html'),
        combined: path.resolve(__dirname, 'src/combined.html'),
        pvr: path.resolve(__dirname, 'src/pvr.html'),
        mcap: path.resolve(__dirname, 'src/mcap.html'),
        raivin: path.resolve(__dirname, 'src/raivin.html'),
        grid: path.resolve(__dirname, 'src/grid.html'),
      }
    }
  },
  server: {
    proxy: {
      '/rt': {
        target: backend_url,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
      '/ws': {
          target: backend_url,
          changeOrigin: true,
          ws: true,
          secure: false,
      },
      '/mcap': {
        target: backend_url,
        changeOrigin: true,
        ws: true,
        secure: false,
        bypass: (req, res) => {
          // If the request method is GET, bypass the proxy
          if (req.method === 'GET') {
            return req.url;
          }
        },
      },
      '/get-upload-credentials': {
        target: backend_url,
        changeOrigin: true,
        ws: true,
        secure: false,
      }
    }
  },
  plugins: [
    daisyui,
  ],
});