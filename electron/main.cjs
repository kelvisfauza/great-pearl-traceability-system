const { app, BrowserWindow, shell } = require('electron');
const SITE = 'https://greatpearlcoffeesystem.site';
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900, title: 'Great Agro Coffee',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.loadURL(SITE);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(SITE)) return { action: 'allow' };
    shell.openExternal(url); return { action: 'deny' };
  });
  win.webContents.on('did-fail-load', () => {
    win.loadURL('data:text/html,<body style="font-family:sans-serif;text-align:center;padding-top:20vh;background:%23064e3b;color:%23f5f0e0"><h2>No internet connection</h2><p>Connect to the internet, then press Ctrl+R to retry.</p></body>');
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
