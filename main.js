
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 3000;

// Minimaler statischer File-Server
// Erlaubt sauberes Laden von Modulen und umgeht file:// Einschränkungen
const server = http.createServer((req, res) => {
  // Sicherheitscheck: Pfad darf nicht ausserhalb liegen
  const safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);
  
  // Default zu index.html bei Root oder SPA-Routing
  if (req.url === '/' || req.url.split('?')[0] === '/') {
    filePath = path.join(__dirname, 'index.html');
  }

  const extname = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tsx': 'text/javascript',
    '.ts': 'text/javascript' 
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Wenn Datei nicht gefunden, aber es eine .js/.css Anfrage war -> 404
        if (extname !== '.html' && extname !== '') {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        
        // Fallback zu index.html für React Routing
        fs.readFile(path.join(__dirname, 'index.html'), (err2, content2) => {
             if (err2) {
                 res.writeHead(500);
                 res.end('Error loading index.html');
             } else {
                 res.writeHead(200, { 'Content-Type': 'text/html' });
                 res.end(content2, 'utf-8');
             }
         });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    title: "Kleinanzeigen Genius AI",
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Für lokale Entwicklung/CORS manchmal nötig
      allowRunningInsecureContent: true
    }
  });

  win.setMenuBarVisibility(false);

  // App über localhost laden
  win.loadURL(`http://localhost:${PORT}`);

  // Externe Links im Standard-Browser öffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  // Erst Server starten, dann Fenster öffnen
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Local server running at http://localhost:${PORT}`);
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  server.close(); // Server sauber beenden
});
