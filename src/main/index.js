import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import os from 'os'

// Ruta temporal para guardar sketches
const TEMP_SKETCH_DIR = join(os.tmpdir(), 'MarkRobotSketch')
if (!existsSync(TEMP_SKETCH_DIR)) {
  mkdirSync(TEMP_SKETCH_DIR)
}

// Configuración Arduino CLI
const isWindows = process.platform === 'win32';
const cliName = isWindows ? 'arduino-cli.exe' : 'arduino-cli';
let ARDUINO_PATH = null;

// Lógica de detección de ruta simplificada y robusta
const possiblePaths = [
  join(process.resourcesPath, 'bin', cliName), // Producción
  join(app.getAppPath(), '..', '..', 'bin', cliName), // Desarrollo (electron-vite)
  join(process.cwd(), 'bin', cliName) // Desarrollo (alternativo)
];

const foundPath = possiblePaths.find(p => existsSync(p));

if (foundPath) {
  // NO usamos comillas aquí para spawn, spawn maneja espacios automáticamente en el primer argumento
  ARDUINO_PATH = foundPath; 
  console.log(`✅ Arduino CLI encontrado en: ${ARDUINO_PATH}`);
} else {
  // Fallback a variable de entorno global
  ARDUINO_PATH = cliName;
  console.log("⚠️ Arduino CLI local no encontrado. Intentando usar versión global del sistema.");
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => { mainWindow.show() })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Helper Run Arduino (Spawn)
const runArduinoSpawn = (args, event) => {
  return new Promise((resolve) => {
    console.log(`Ejecutando: "${ARDUINO_PATH}" ${args.join(' ')}`);
    
    // Spawn maneja los espacios en la ruta del ejecutable automáticamente si se pasa como primer argumento
    const child = spawn(ARDUINO_PATH, args);

    child.stdout.on('data', (data) => {
      if (event) event.sender.send('arduino:log-stream', data.toString());
      console.log(`stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
      if (event) event.sender.send('arduino:log-stream', data.toString());
      console.error(`stderr: ${data}`);
    });

    child.on('close', (code) => { resolve({ success: code === 0, code }); });
    child.on('error', (err) => {
       const msg = `Error al iniciar proceso: ${err.message}`;
       if (event) event.sender.send('arduino:log-stream', msg + '\n');
       console.error(msg);
       resolve({ success: false, error: err });
    });
  });
};

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.roboticminds.ide')

  app.on('browser-window-created', (_, window) => { optimizer.watchWindowShortcuts(window) })

  createWindow()

  // 1. LIST BOARDS
  ipcMain.handle('arduino:listBoards', async () => {
    return new Promise((resolve) => {
        // Usamos JSON format para parsing seguro
        const child = spawn(ARDUINO_PATH, ['board', 'list', '--format', 'json']);
        
        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (d) => output += d);
        child.stderr.on('data', (d) => errorOutput += d);
        
        child.on('close', (code) => {
            if (code !== 0) {
                console.error("Error al listar placas:", errorOutput);
                resolve([]);
                return;
            }
            try {
                // arduino-cli devuelve un array JSON
                const json = JSON.parse(output);
                resolve(json || []);
            } catch (e) {
                console.error("Error parseando JSON de placas:", e);
                // Si falla el parseo, devolvemos array vacío
                resolve([]);
            }
        });
        
        child.on('error', (err) => {
            console.error("Error spawn listBoards:", err);
            resolve([]);
        });
    });
  });

  ipcMain.handle('arduino:listAllBoards', async () => {
    return new Promise((resolve) => {
        const child = spawn(ARDUINO_PATH, ['board', 'listall', '--format', 'json']);
        let output = '';
        child.stdout.on('data', (d) => output += d);
        child.on('close', () => {
            try { 
                const json = JSON.parse(output);
                resolve(json || { boards: [] }); 
            } catch(e) { resolve({ boards: [] }); }
        });
    });
  });

  // COMPILE
  ipcMain.handle('arduino:compile', async (event, { code, fqbn }) => {
    const sketchPath = join(TEMP_SKETCH_DIR, 'MarkRobotSketch.ino');
    try { await fs.writeFile(sketchPath, code, 'utf-8'); } 
    catch (e) { return { success: false, log: `Error escritura: ${e.message}` }; }

    event.sender.send('arduino:log-stream', `Iniciando compilación para ${fqbn}...\n`);
    const args = ['compile', '--fqbn', fqbn, TEMP_SKETCH_DIR, '--verbose'];
    const result = await runArduinoSpawn(args, event);
    return { success: result.success };
  });

  // UPLOAD
  ipcMain.handle('arduino:upload', async (event, { port, fqbn }) => {
    event.sender.send('arduino:log-stream', `Iniciando subida al puerto ${port}...\n`);
    const args = ['upload', '-p', port, '--fqbn', fqbn, TEMP_SKETCH_DIR];
    const result = await runArduinoSpawn(args, event);
    return { success: result.success };
  });

  // INSTALL CORE
  ipcMain.handle('arduino:installCore', async (event, coreName) => {
      event.sender.send('arduino:log-stream', `Instalando núcleo ${coreName}...\n`);
      const result = await runArduinoSpawn(['core', 'install', coreName], event);
      return { success: result.success };
  });

  // SAVE FILE
  ipcMain.handle('dialog:saveFile', async (_, data) => {
    let contentToSave = typeof data === 'object' ? data.content : data;
    let defaultPath = (typeof data === 'object' && data.defaultName) ? (data.defaultName.endsWith('.json') ? data.defaultName : data.defaultName + '.json') : 'sketch.json';

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath,
      filters: [{ name: 'Blockly Project', extensions: ['json'] }]
    })
    
    if (canceled) return { success: false, canceled: true }
    try {
      await fs.writeFile(filePath, contentToSave, 'utf-8')
      return { success: true, filePath }
    } catch (e) { return { success: false, error: e.message } }
  })

  // OPEN FILE
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Blockly Project', extensions: ['json'] }]
    })
    if (canceled) return { canceled: true }
    try {
      const content = await fs.readFile(filePaths[0], 'utf-8')
      return { canceled: false, content, fileName: filePaths[0] }
    } catch (e) { return { canceled: false, error: e.message } }
  })

  // OPEN IDE
  ipcMain.handle('arduino:openIde', async (event, code) => {
    const sketchPath = join(TEMP_SKETCH_DIR, 'MarkRobotSketch.ino')
    try {
      await fs.writeFile(sketchPath, code, 'utf-8')
      await shell.openPath(sketchPath)
      return { success: true }
    } catch (e) { return { success: false, error: e.message } }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})