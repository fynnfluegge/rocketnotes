const { app, dialog, Menu, BrowserWindow } = require("electron");
// const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const url = require("url");
const path = require("path");

const isMac = process.platform === "darwin";

// autoUpdater.logger = log;
// autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

let template = [];
if (isMac) {
  // OS X
  const name = app.getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: "About " + name,
        role: "about",
      },
      { type: "separator" },
      {
        label: "Check for updates",
        enabled: true,
        click() {
          // autoUpdater.checkForUpdatesAndNotify();
        },
      },
      { type: "separator" },
      {
        role: "quit",
        label: "Quit",
        accelerator: "Command+Q",
      },
    ],
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    // titleBarStyle: 'hidden',
    width: 1024,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // mainWindow.webContents.openDevTools();

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/build/index.html`),
      protocol: "file:",
      slashes: true,
    }),
  );

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", () => {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  createWindow();
});

// app.on('ready', () => {
//   // autoUpdater.checkForUpdatesAndNotify()
// });

// app.on('window-all-closed', function () {
//   if (process.platform !== 'darwin') app.quit()
// })

// app.on('activate', function () {
//   if (mainWindow === null) createWindow()
// })

// autoUpdater.on('checking-for-update', () => {
//   sendStatusToWindow('Checking for update...');
// });

// autoUpdater.on('update-available', (info) => {
//   sendStatusToWindow('Update available.');
// });

// autoUpdater.on('update-not-available', (info) => {
//   sendStatusToWindow('Update not available.');
// });

// autoUpdater.on('error', (err) => {
//   sendStatusToWindow('Error in auto-updater. ' + err);
// });

// autoUpdater.on('download-progress', (progressObj) => {
//   let log_message = "Download speed: " + progressObj.bytesPerSecond;
//   log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
//   log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
//   sendStatusToWindow(log_message);
// });

// autoUpdater.on('update-downloaded', (info) => {
//   sendStatusToWindow('Update downloaded');
// });

// const sendStatusToWindow = function(text) {
//   mainWindow.webContents.send('message', text);
// }
