# Webapp

### Run dev mode on localhost
```
npm run start
```

### Run Electron App
```
npm run electron
```
> **_NOTE:_**  Electron has the be build with `npm run build-electron` in order to run.

### Production Build
```
npm run build
```

### Electron build
```
npm run build-electron
```

### electron-packager
#### Package Electron App
```
./node_modules/.bin/electron-packager . --overwrite --platform=darwin --arch=x64 --icon=./src/assets/icons/mac/icon.icns --prune=true --out=release-builds --ignore="node_modules*|src*" rocketnotes
```

#### Create Installer
```
./node_modules/.bin/electron-installer-dmg ./release-builds/rocketnotes-darwin-x64/rocketnotes.app rocketnotes
```
### electron-builder
#### electron builder build and publish
```
./node_modules/.bin/electron-builder --publish always
```
