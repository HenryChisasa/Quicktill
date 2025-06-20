require('dotenv').config();
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
const {app, BrowserWindow, ipcMain, screen} = require('electron');
const path = require('path')

// Retrieve the app version
const appVersion = app.getVersion();

// Set the feed URL for updates
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'Ayuen-madyt',
  repo: 'Quicktill',
  token: process.env.GITHUB_TOKEN,
  url: `https://github.com/Ayuen-madyt/Quicktill/releases/tag/v${appVersion}`,
});

autoUpdater.checkForUpdatesAndNotify();

const setupEvents = require('./installers/setupEvents')
 if (setupEvents.handleSquirrelEvent()) {
    return;
 }

// Set the log file location
log.transports.file.file = `${app.getPath('userData')}/quicktill.log`;

// Set the log level (optional)
log.transports.file.level = 'info'; // or 'debug', 'warn', 'error', etc.

// Configure other options (optional)
log.transports.file.format = '{h}:{i}:{s} {level} {text}';

// Add logging to console (optional)
log.transports.console.level = false; // Disable console logging

// Initialize the logger
log.catchErrors();

// Usage example
log.info('App started');

const contextMenu = require('electron-context-menu');

let mainWindow

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    frame: false,
    minWidth: 1200,
    minHeight: 750,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    },
  });

  mainWindow.show();

  mainWindow.loadURL(
    `file://${path.join(__dirname, 'index.html')}`
  )

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}


app.on("ready", ()=>{
  process.env.APPDATA = path.join(app.getPath('home'),app.name);
  require('./server');
  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})



ipcMain.on('app-quit', (evt, arg) => {
  app.quit()
})


ipcMain.on('app-reload', (event, arg) => {
  mainWindow.reload();
});



contextMenu({
  prepend: (params, browserWindow) => [
     
      {label: 'DevTools',
       click(item, focusedWindow){
        focusedWindow.toggleDevTools();
      }
    },
     { 
      label: "Reload", 
        click() {
          mainWindow.reload();
      } 
    // },
    // {  label: 'Quit',  click:  function(){
    //    mainWindow.destroy();
    //     mainWindow.quit();
    // } 
  }  
  ],

});

 

 