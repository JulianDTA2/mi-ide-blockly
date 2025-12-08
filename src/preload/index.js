import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Archivos
  saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  
  // Arduino
  listBoards: () => ipcRenderer.invoke('arduino:listBoards'),
  listAllBoards: () => ipcRenderer.invoke('arduino:listAllBoards'),
  compile: (data) => ipcRenderer.invoke('arduino:compile', data),
  upload: (data) => ipcRenderer.invoke('arduino:upload', data),
  openIde: (code) => ipcRenderer.invoke('arduino:openIde', code),
  installCore: (coreName) => ipcRenderer.invoke('arduino:installCore', coreName),
  onLog: (callback) => ipcRenderer.on('arduino:log', (_, data) => callback(data))
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}