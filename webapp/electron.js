const {app, BrowserWindow} = require('electron')
  const url = require("url");
  const path = require("path");

  let mainWindow

  function createWindow () {
    mainWindow = new BrowserWindow({
      // titleBarStyle: 'hidden',
      // y: 100,
      width: 1024,
      height: 800,
      webPreferences: {
        nodeIntegration: true
      }
    })

    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, `/build/index.html`),
        protocol: "file:",
        slashes: true
      })
    );

    mainWindow.on('closed', function () {
      mainWindow = null
    })
  }

  app.on('ready', createWindow)

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', function () {
    if (mainWindow === null) createWindow()
  })