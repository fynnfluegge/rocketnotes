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

### Create Installer
```
npm exec electron-installer-dmg ./webapp-darwin-x64/webapp.app takeniftynotes
```