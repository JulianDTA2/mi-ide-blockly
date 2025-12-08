import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { exec } from 'child_process'
import os from 'os'

// Ruta temporal para guardar sketches
const TEMP_SKETCH_DIR = join(os.tmpdir(), 'MarkRobotSketch')
if (!existsSync(TEMP_SKETCH_DIR)) {
  mkdirSync(TEMP_SKETCH_DIR)
}

// ==========================================================
// CONFIGURACIÓN DE RUTAS DE ARDUINO CLI
// ==========================================================
const isWindows = process.platform === 'win32';
const cliName = isWindows ? 'arduino-cli.exe' : 'arduino-cli';

// Buscamos el ejecutable en varios lugares:
// 1. En 'resources/bin' (Cuando la app ya está instalada/compilada)
// 2. En una carpeta 'bin' en la raíz del proyecto (Modo desarrollo)
// 3. Usamos 'arduino-cli' globalmente como último recurso.
let ARDUINO_PATH = cliName; 

const possiblePaths = [
  join(process.resourcesPath, 'bin', cliName),
  join(app.getAppPath(), '..', '..', 'bin', cliName), // A veces necesario en dev
  join(process.cwd(), 'bin', cliName)
];

const foundPath = possiblePaths.find(p => existsSync(p));

if (foundPath) {
  // Si encontramos el archivo local, usamos comillas para evitar errores con espacios
  ARDUINO_PATH = `"${foundPath}"`;
  console.log(`✅ Arduino CLI local encontrado en: ${foundPath}`);
} else {
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

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

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

// Helper para ejecutar comandos y manejar errores de "no encontrado"
const runArduino = (commandArgs) => {
  return new Promise((resolve) => {
    const fullCmd = `${ARDUINO_PATH} ${commandArgs}`;
    console.log(`Ejecutando: ${fullCmd}`);

    exec(fullCmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Arduino Error:", error.message);
        // Detectar si el error es porque falta el programa
        if (error.message.includes('not recognized') || error.code === 'ENOENT' || error.code === 127) {
            resolve({ 
                success: false, 
                log: "❌ ERROR CRÍTICO: No se encontró 'arduino-cli'.\n\nPor favor descarga 'arduino-cli', crea una carpeta llamada 'bin' en la raíz de tu proyecto y coloca el archivo allí."
            });
        } else {
            resolve({ success: false, log: stderr || stdout || error.message });
        }
      } else {
        resolve({ success: true, log: stdout });
      }
    });
  });
};

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.roboticminds.ide')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // 1. GUARDAR/ABRIR
  ipcMain.handle('dialog:saveFile', async (_, content) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      filters: [{ name: 'Blockly Project', extensions: ['json'] }]
    })
    if (canceled) return { success: false }
    try {
      await fs.writeFile(filePath, content, 'utf-8')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Blockly Project', extensions: ['json'] }]
    })
    if (canceled) return { canceled: true }
    try {
      const content = await fs.readFile(filePaths[0], 'utf-8')
      return { canceled: false, content }
    } catch (e) {
      return { canceled: false, error: e.message }
    }
  })

  // 2. LISTAR PLACAS
  ipcMain.handle('arduino:listBoards', async () => {
    // Usamos --format json para parsear
    const result = await runArduino('board list --format json');
    if (!result.success) {
        console.warn("Fallo al listar placas:", result.log);
        return [];
    }
    try {
        return JSON.parse(result.log);
    } catch (e) {
        return [];
    }
  });

  ipcMain.handle('arduino:listAllBoards', async () => {
    const result = await runArduino('board listall --format json');
    if (!result.success) return { boards: [] };
    try {
        return JSON.parse(result.log);
    } catch (e) {
        return { boards: [] };
    }
  });

  // 3. COMPILAR
  ipcMain.handle('arduino:compile', async (event, { code, fqbn }) => {
    const sketchPath = join(TEMP_SKETCH_DIR, 'MarkRobotSketch.ino')
    try {
      await fs.writeFile(sketchPath, code, 'utf-8')
    } catch (e) {
      return { success: false, log: `Error escribiendo archivo: ${e.message}` }
    }

    const result = await runArduino(`compile --fqbn ${fqbn} "${TEMP_SKETCH_DIR}" --format json`);
    
    // El CLI devuelve JSON en stdout incluso si falla la compilación (errores de sintaxis)
    // Pero si falla el proceso (ej. falta core), viene en stderr/error.
    try {
        const json = JSON.parse(result.log);
        const output = json.compiler_out + json.compiler_err;
        if (json.success) {
            return { success: true, log: "Compilación Exitosa.\n" + output };
        } else {
            return { success: false, log: "Error de Compilación:\n" + output };
        }
    } catch (e) {
        // Si no es JSON, probablemente es un error del sistema o del CLI crudo
        return result; 
    }
  })

  // 4. SUBIR
  ipcMain.handle('arduino:upload', async (event, { port, fqbn }) => {
    // Nota: Upload no siempre soporta --format json bien en todas las versiones, usamos salida raw
    // Asumimos que ya se compiló
    const result = await runArduino(`upload -p ${port} --fqbn ${fqbn} "${TEMP_SKETCH_DIR}"`);
    if(result.success) {
        return { success: true, log: result.log + "\nSubida completada." };
    } else {
        return { success: false, log: result.log + "\nFallo en la subida." };
    }
  })

  // 5. ABRIR EN IDE
  ipcMain.handle('arduino:openIde', async (event, code) => {
    const sketchPath = join(TEMP_SKETCH_DIR, 'MarkRobotSketch.ino')
    try {
      await fs.writeFile(sketchPath, code, 'utf-8')
      await shell.openPath(sketchPath)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // 6. INSTALAR CORE
  ipcMain.handle('arduino:installCore', async (event, coreName) => {
      return await runArduino(`core install ${coreName}`);
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})