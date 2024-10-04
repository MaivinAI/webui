Recommended reading: https://threejs.org/docs/#manual/en/introduction/Installation

Development should occur in the `raivin-ui` folder.

```
npm install --save three
npm i @foxglove/cdr
npm install @oneidentity/zstd-js
```

Run `npx vite` to develop locally. You may need to change the dev_hostname or dev_port

Maivin UI websocket server must be running on a device for streaming.

To deploy:
run "npm run build"
once build is complete scp the dist folder on to the board 
then to run the maivin-ui "sudo ./maivin-ui -d dist/"