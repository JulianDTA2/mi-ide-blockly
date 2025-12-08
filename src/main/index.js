import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

// [SEGURIDAD] Función para limpiar inputs de comandos
// Evita que un atacante inyecte comandos extraños en el FQBN o el puerto
const sanitizeCmd = (str) => {
  if (!str) return '';
  // Solo permite letras, números, guiones, puntos y dos puntos (para fqbn: arduino:avr:uno)
  return str.replace(/[^a-zA-Z0-9_\-.:]/g, '');
}

// --- CONFIGURACIÓN DE ARDUINO CLI ---
const getArduinoCliPath = () => {
  // Detectar plataforma para añadir .exe si es Windows
  const ext = process.platform === 'win32' ? '.exe' : '';
  
  let cliPath = '';
  if (app.isPackaged) {
    // En producción (instalador): resources/bin/arduino-cli.exe
    cliPath = path.join(process.resourcesPath, 'bin', `arduino-cli${ext}`)
  } else {
    // En desarrollo: root/bin/arduino-cli.exe
    // Ajustamos la ruta relativa desde src/main
    cliPath = path.join(__dirname, '../../bin', `arduino-cli${ext}`)
  }
  
  // Debug: Verificar si existe el archivo
  if (!fs.existsSync(cliPath)) {
    console.error(`❌ CRÍTICO: No se encontró arduino-cli en: ${cliPath}`);
  } else {
    console.log(`✅ Arduino CLI encontrado en: ${cliPath}`);
  }
  
  return cliPath;
}

// Utilidad para crear carpeta temporal con el nombre del sketch
// Arduino CLI requiere que el archivo .ino esté en una carpeta del mismo nombre
const createTempSketch = async (code, sketchName) => {
  // Limpiamos el nombre de caracteres inseguros
  const safeName = (sketchName || 'Sketch').replace(/[^a-zA-Z0-9_-]/g, '_');
  const tmpDir = os.tmpdir()
  const projectDir = path.join(tmpDir, safeName)
  const filePath = path.join(projectDir, `${safeName}.ino`)
  
  // Crear directorio si no existe
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }
  
  // Escribir el código en el archivo .ino
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

// --- INICIO DE LA APLICACIÓN ---
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.markrobot.ide')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ==========================================
  //     API HANDLERS (COMUNICACIÓN IPC)
  // ==========================================

  // 1. Listar puertos conectados actualmente
  ipcMain.handle('arduino:list-boards', async () => {
    const cliPath = getArduinoCliPath()
    return new Promise((resolve) => {
      exec(`"${cliPath}" board list --format json`, (error, stdout) => {
        if (error) {
          console.error("Error listando boards:", error);
          resolve([]);
          return;
        }
        try {
          const data = JSON.parse(stdout);
          resolve(data || []);
        } catch (e) {
          resolve([]);
        }
      })
    })
  })

  // 2. Listar TODAS las placas soportadas (Catálogo para el select manual)
  ipcMain.handle('arduino:list-all-boards', async () => {
    const cliPath = getArduinoCliPath()
    return new Promise((resolve) => {
      console.log("Cargando lista de placas conocidas...");
      // 'board listall' devuelve todas las definiciones instaladas
      exec(`"${cliPath}" board listall --format json`, (error, stdout) => {
        try {
          const data = JSON.parse(stdout);
          resolve(data || { boards: [] });
        } catch (e) {
          // Si falla (ej. JSON inválido), devolvemos lista vacía
          resolve({ boards: [] });
        }
      })
    })
  })

  // 3. Compilar Código
  ipcMain.handle('arduino:compile', async (event, { code, fqbn, sketchName }) => {
    const cliPath = getArduinoCliPath()
    // [SEGURIDAD] Sanitizamos el FQBN antes de pasarlo al comando
    const safeFqbn = sanitizeCmd(fqbn);

    try {
      // 1. Crear archivo temporal .ino
      const { projectDir } = await createTempSketch(code, sketchName)
      console.log(`Compilando ${safeFqbn} en ${projectDir}...`);
      
      return new Promise((resolve) => {
        // 2. Ejecutar comando compile usando el FQBN sanitizado
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

  // 4. Subir Código a la Placa
  ipcMain.handle('arduino:upload', async (event, { port, fqbn, sketchName }) => {
    const cliPath = getArduinoCliPath()
    // Recuperamos la ruta temporal basada en el nombre del sketch
    const safeName = (sketchName || 'Sketch').replace(/[^a-zA-Z0-9_-]/g, '_');
    const projectDir = path.join(os.tmpdir(), safeName)

    // [SEGURIDAD] Sanitizamos Puerto y FQBN
    const safePort = sanitizeCmd(port);
    const safeFqbn = sanitizeCmd(fqbn);

    return new Promise((resolve) => {
      console.log(`Subiendo a ${safePort} (FQBN: ${safeFqbn})...`);
      // Comando upload con variables sanitizadas
      const cmd = `"${cliPath}" upload -p ${safePort} --fqbn ${safeFqbn} "${projectDir}"`
      exec(cmd, (error, stdout, stderr) => {
        resolve({
          success: !error,
          log: error ? (stderr || stdout) : stdout
        })
      })
    })
  })

  // 5. Instalar Core (ej: arduino:avr)
  ipcMain.handle('arduino:install-core', async (event, coreName) => {
    const cliPath = getArduinoCliPath()
    return new Promise((resolve) => {
      // Nota: Si planeas soportar ESP32, aquí deberías añadir lógica para --additional-urls
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

  // 6. Abrir en Arduino IDE Nativo (si está instalado y asociado a .ino)
  ipcMain.handle('arduino:open-ide', async (event, { code, sketchName }) => {
    try {
      const { filePath } = await createTempSketch(code, sketchName)
      shell.openPath(filePath) // Abre el archivo con la app predeterminada del sistema
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // 7. Diálogo: Guardar Archivo (XML Blockly)
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

  // 8. Diálogo: Abrir Archivo (XML Blockly)
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