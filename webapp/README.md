# Webapp

### Run Devmode
```
ng serve
```

### Run Electron App
```
npm start
```

### Production Build
```
ng build --configuration production
```

## electron-packager
### Package Electron App
```
./node_modules/.bin/electron-packager . --overwrite --platform=darwin --arch=x64 --icon=./src/assets/icons/mac/icon.icns --prune=true --out=release-builds --ignore="node_modules*|src*" rocketnotes
```

### Create Installer
```
./node_modules/.bin/electron-installer-dmg ./release-builds/rocketnotes-darwin-x64/rocketnotes.app rocketnotes
```
## electron-builder
### electron builder build and publish
```
./node_modules/.bin/electron-builder --publish always
```