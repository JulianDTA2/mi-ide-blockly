import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  listBoards: () => ipcRenderer.invoke('arduino:list-boards'),
  listAllBoards: () => ipcRenderer.invoke('arduino:list-all-boards'),
  compile: (config) => ipcRenderer.invoke('arduino:compile', config),
  upload: (config) => ipcRenderer.invoke('arduino:upload', config),
  installCore: (coreName) => ipcRenderer.invoke('arduino:install-core', coreName),
  openIde: (config) => ipcRenderer.invoke('arduino:open-ide', config),
  saveFile: (content, defaultName) => ipcRenderer.invoke('dialog:save-file', content, defaultName),
  openFile: () => ipcRenderer.invoke('dialog:open-file')
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