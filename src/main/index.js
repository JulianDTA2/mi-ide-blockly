import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

// [SEGURIDAD] Función para limpiar inputs de comandos
const sanitizeCmd = (str) => {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9_\-.:]/g, '');
}

const getArduinoCliPath = () => {
  const ext = process.platform === 'win32' ? '.exe' : '';
  let cliPath = '';
  if (app.isPackaged) {
    cliPath = path.join(process.resourcesPath, 'bin', `arduino-cli${ext}`)
  } else {
    const devBinPath = process.platform === 'win32' 
        ? '../../bin/win/arduino-cli.exe' 
        : '../../bin/mac/arduino-cli';
        
    cliPath = path.join(__dirname, devBinPath)
  }
  
  if (!fs.existsSync(cliPath)) {
    console.error(`❌ CRÍTICO: No se encontró arduino-cli en: ${cliPath}`);
  }
  return cliPath;
}

const createTempSketch = async (code, sketchName) => {
  const safeName = (sketchName || 'Sketch').replace(/[^a-zA-Z0-9_-]/g, '_');
  const tmpDir = os.tmpdir()
  const projectDir = path.join(tmpDir, safeName)
  const filePath = path.join(projectDir, `${safeName}.ino`)
  
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }
  
  fs.writeFileSync(filePath, code)
  return { projectDir, filePath, safeName }
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.markrobot.ide')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ==========================================
  //     API HANDLERS (BACKEND CORREGIDO)
  // ==========================================

  // 1. Listar puertos (CON FILTRO DE LIMPIEZA)
  ipcMain.handle('arduino:list-boards', async () => {
    const cliPath = getArduinoCliPath()
    return new Promise((resolve) => {
      // Ejecutamos el comando
      exec(`"${cliPath}" board list --format json`, (error, stdout, stderr) => {
        // Ignoramos 'error' si stdout tiene datos útiles, ya que a veces CLI da warnings como error
        
        try {
          // [CORRECCIÓN CRÍTICA]
          // Arduino CLI a veces imprime logs tipo "discovery-log INFO..." junto al JSON.
          // Buscamos dónde empieza '[' y dónde termina ']' para extraer SOLO el JSON.
          const jsonStart = stdout.indexOf('[');
          const jsonEnd = stdout.lastIndexOf(']');

          if (jsonStart === -1 || jsonEnd === -1) {
            console.warn("⚠️ Respuesta vacía o inválida del CLI:", stdout);
            resolve([]); // Si no hay corchetes, no hay lista
            return;
          }

          // Extraemos solo la parte válida: [...]
          const cleanJson = stdout.substring(jsonStart, jsonEnd + 1);
          const data = JSON.parse(cleanJson);
          
          resolve(Array.isArray(data) ? data : []);
          
        } catch (e) {
          console.error("❌ Error parseando lista de puertos:", e);
          // Si falla, devolvemos array vacío para no romper el frontend
          resolve([]);
        }
      })
    })
  })

  // 2. Listar TODAS las placas
  ipcMain.handle('arduino:list-all-boards', async () => {
    const cliPath = getArduinoCliPath()
    return new Promise((resolve) => {
      exec(`"${cliPath}" board listall --format json`, (error, stdout) => {
        try {
            // Aplicamos la misma lógica de limpieza por seguridad
            const jsonStart = stdout.indexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const cleanJson = stdout.substring(jsonStart, jsonEnd + 1);
                const data = JSON.parse(cleanJson);
                resolve(data || { boards: [] });
            } else {
                resolve({ boards: [] });
            }
        } catch (e) {
          resolve({ boards: [] });
        }
      })
    })
  })

  // 3. Compilar
  ipcMain.handle('arduino:compile', async (event, { code, fqbn, sketchName }) => {
    const cliPath = getArduinoCliPath()
    const safeFqbn = sanitizeCmd(fqbn);

    try {
      const { projectDir } = await createTempSketch(code, sketchName)
      console.log(`Compilando ${safeFqbn}...`);
      
      return new Promise((resolve) => {
        const cmd = `"${cliPath}" compile --fqbn ${safeFqbn} "${projectDir}"`
        exec(cmd, (error, stdout, stderr) => {
          resolve({
            success: !error,
            log: error ? (stderr || stdout) : stdout
          })
        })
      })
    } catch (err) {
      return { success: false, log: `Error interno: ${err.message}` }
    }
  })

  // 4. Subir
  ipcMain.handle('arduino:upload', async (event, { port, fqbn, sketchName }) => {
    const cliPath = getArduinoCliPath()
    const safeName = (sketchName || 'Sketch').replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectDir = path.join(os.tmpdir(), safeName)

    const safePort = sanitizeCmd(port);
    const safeFqbn = sanitizeCmd(fqbn);

    return new Promise((resolve) => {
      console.log(`Subiendo a ${safePort}...`);
      const cmd = `"${cliPath}" upload -p ${safePort} --fqbn ${safeFqbn} "${projectDir}"`
      exec(cmd, (error, stdout, stderr) => {
        resolve({
          success: !error,
          log: error ? (stderr || stdout) : stdout
        })
      })
    })
  })

  // 5. Instalar Core
  ipcMain.handle('arduino:install-core', async (event, coreName) => {
    const cliPath = getArduinoCliPath()
    return new Promise((resolve) => {
      console.log(`Instalando core: ${coreName}...`);
      const cmd = `"${cliPath}" core install ${coreName}`
      exec(cmd, (error, stdout, stderr) => {
        resolve({
          success: !error,
          log: error ? (stderr + stdout) : stdout
        })
      })
    })
  })

  // 6. Abrir en IDE
  ipcMain.handle('arduino:open-ide', async (event, { code, sketchName }) => {
    try {
      const { filePath } = await createTempSketch(code, sketchName)
      shell.openPath(filePath) 
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // 7. Guardar
  ipcMain.handle('dialog:save-file', async (event, content, defaultName) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName || 'MySketch.xml',
      filters: [{ name: 'Blockly XML', extensions: ['xml'] }]
    })
    if (!canceled && filePath) {
      fs.writeFileSync(filePath, content)
      return { success: true, path: filePath }
    }
    return { success: false }
  })

  // 8. Abrir
  ipcMain.handle('dialog:open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Blockly XML', extensions: ['xml'] }]
    })
    if (!canceled && filePaths.length > 0) {
      const content = fs.readFileSync(filePaths[0], 'utf-8')
      return { canceled: false, content, fileName: path.basename(filePaths[0]) }
    }
    return { canceled: true }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})