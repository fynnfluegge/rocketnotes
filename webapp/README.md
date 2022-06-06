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

### Package Electron App
```
npm exec electron-packager . takeniftynotes --platform=darwin --arch=x64
```
```
./node_modules/.bin/electron-packager . --overwrite --platform=darwin --arch=x64 --icon=./src/assets/icons/mac/icon.icns --prune=true --out=release-builds --ignore="node_modules*|build*"
```

### Create Installer
```
npm exec electron-installer-dmg ./webapp-darwin-x64/webapp.app takeniftynotes
```

```
./node_modules/.bin/electron-installer-dmg ./release-builds/webapp-darwin-x64/webapp.app rocketnotes
```