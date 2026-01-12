<template>
  <div class="app-layout">
    
    <header class="top-bar">
      <div class="logo-area">
          <img :src="logo2" alt="Logo Mark" class="app-logo" />
      </div>
      
      <div class="controls-wrapper">
        <div class="hardware-controls neu-flat">
            <select v-model="selectedBoardFqbn" class="hw-select neu-input" title="Seleccionar Placa">
                <option value="arduino:avr:uno">Arduino Uno</option>
                <option value="arduino:avr:nano">Arduino Nano</option>
                <option value="arduino:avr:mega">Arduino Mega</option>
                <option value="esp8266:esp8266:nodemcuv2">NodeMCU 1.0 (Solo Compilar)</option>
                <option value="esp32:esp32:esp32">ESP32 Dev Module (Solo Compilar)</option>
            </select>

            <div class="port-selector">
                <button 
                    @click="toggleConnection" 
                    class="action-btn neu-btn" 
                    :class="{ 'connected': isPortConnected }"
                    :title="isPortConnected ? 'Desconectar Monitor' : 'Conectar para Monitor Serial'"
                >
                    <span v-if="!isPortConnected">🔌 Monitor Serial</span>
                    <span v-else>❌ Desconectar</span>
                </button>
            </div>
        </div>

        <div class="sketch-name-container">
            <input type="text" v-model="sketchName" class="sketch-name-input neu-inset" placeholder="NombreProyecto" />
        </div>

        <div class="actions-area">
            <button class="action-btn neu-btn verify-btn" @click="verifyCode" :disabled="isCompiling" title="Solo Verificar">
                <span v-if="isCompiling">
                    <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </span>
                <span v-else>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </span> 
                <span class="btn-text">Verificar</span>
            </button>
            
            <button 
                class="action-btn neu-btn upload-btn" 
                :class="{ 'ready-to-flash': isReadyToFlash }"
                @click="handleUploadClick" 
                :disabled="isCompiling || isUploading" 
                :title="isReadyToFlash ? '¡Click para confirmar subida!' : 'Compilar y Subir'"
            >
                <span v-if="isCompiling || isUploading">
                    <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </span>
                <span v-else-if="isReadyToFlash" class="flash-icon">
                    ⚡ CONFIRMAR
                </span> 
                <span v-else>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </span>
                
                <span class="btn-text" v-if="!isReadyToFlash && !isCompiling && !isUploading">Subir</span>
            </button>

            <button class="action-btn neu-btn run-btn" @click="runSimulation" title="Ver Código">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span class="btn-text">Código</span>
            </button>

            <div class="divider"></div>

            <button class="action-btn secondary-btn neu-btn-icon" @click="saveSketchWeb" title="Descargar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            </button>
            
            <button class="action-btn secondary-btn neu-btn-icon" @click="triggerLoad" title="Abrir">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
            </button>
            
            <input type="file" ref="fileInput" accept=".xml" style="display: none" @change="handleFileUpload" />

            <button class="action-btn delete-btn neu-btn-icon danger" @click="clearWorkspace" title="Limpiar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <div ref="blocklyDiv" class="blockly-container neu-inset-large dot-grid-background"></div>

      <aside class="right-sidebar neu-flat">
        <div class="tabs">
            <button class="tab active">C++ Code</button>
        </div>
        
        <div class="code-panel">
            <textarea class="panel-content code-font neu-inset" readonly :value="generatedCode"></textarea>
        </div>

        <div class="output-panel neu-flat-top" :class="{ 'collapsed': !showOutput }">
            <div class="panel-header" @click="showOutput = !showOutput">
                <div class="header-title">
                    <span class="toggle-icon">
                        <svg v-if="showOutput" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                    </span>
                    <span>Consola de Salida</span>
                </div>
                <button class="clear-console neu-btn-small" @click.stop="outputLog = ''">Limpiar</button>
            </div>
            <textarea v-show="showOutput" class="console-content neu-inset" readonly :value="outputLog"></textarea>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'; 
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en';
import 'blockly/blocks'; 
import Avrgirl from 'avrgirl-arduino'; 
import ArduinoGenerator from '../arduino_core.js'; 
import logo2 from '../assets/electron.svg';

Blockly.setLocale(En);

// Refs de UI
const blocklyDiv = ref(null);
const generatedCode = ref("");
const generatedXml = ref("");
const outputLog = ref("Bienvenido. \nPara subir código: \n1. Click en 'Subir' (Compila) \n2. Click en 'Confirmar' (Flashea)");
const isCompiling = ref(false);
const isUploading = ref(false);
const showOutput = ref(true); 
const sketchName = ref("MySketch");
const fileInput = ref(null);

// Refs de Lógica de Subida
const isReadyToFlash = ref(false); 
const pendingHex = ref(null);

// Refs de Hardware
const serialPort = ref(null);
const isPortConnected = ref(false);
const selectedBoardFqbn = ref("arduino:avr:uno"); 
let workspace = null;

// Cuando cambia el código, invalidamos la compilación lista
watch(generatedCode, () => {
    if (isReadyToFlash.value) {
        isReadyToFlash.value = false;
        pendingHex.value = null;
    }
});

// --- UTILIDADES ---
function base64ToBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// --- 1. MANEJO INTELIGENTE DEL BOTÓN SUBIR ---
async function handleUploadClick() {
    if (isReadyToFlash.value) {
        // PASO 2: El usuario confirma.
        await flashToBoard();
    } else {
        // PASO 1: Compilamos primero
        await compileForUpload();
    }
}

// --- 2. FASE 1: COMPILACIÓN ---
async function compileForUpload() {
    isCompiling.value = true;
    showOutput.value = true;
    outputLog.value = "⏳ Compilando... (Espera a que el botón se ponga verde)\n";
    updateContent();

    try {
        const hex = await requestCompile(); 
        if (hex) {
            pendingHex.value = hex;
            isReadyToFlash.value = true;
            outputLog.value += "\n✅ Compilación lista.\n👉 ¡PRESIONA 'CONFIRMAR' PARA SUBIR!";
        }
    } catch (e) {
        outputLog.value += "\n❌ Error compilando: " + e.message;
    } finally {
        isCompiling.value = false;
    }
}

// --- 3. FASE 2: FLASHING (SUBIDA REAL BLINDADA) ---
async function flashToBoard() {
    if (!pendingHex.value) return;
    
    isUploading.value = true;
    isReadyToFlash.value = false;
    
    // IMPORTANTE: Cerrar monitor serial y esperar un poco
    if (isPortConnected.value) {
        outputLog.value += "\n⚠️ Cerrando monitor serial para subir...";
        await closePort();
        await new Promise(r => setTimeout(r, 500)); // Espera de seguridad
    }

    outputLog.value += "\n🚀 Iniciando subida...";

    // --- CAPTURA DE LOGS (LOG, INFO, WARN) ---
    // Esto es vital para saber si "flash complete" salió aunque avrgirl lance error después
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    
    const logInterceptor = (...args) => {
        const msg = args.join(' ');
        // Filtramos y buscamos la señal de éxito
        if (msg.includes('writing')) {
             outputLog.value += '.';
        } else if (msg.includes('flash complete')) {
             outputLog.value += '\n✅ [Flasher] Escritura terminada.';
        } else {
             outputLog.value += `\n[Flasher] ${msg}`;
        }
    };

    console.log = logInterceptor;
    console.info = logInterceptor; // Avrgirl a veces usa info
    console.warn = logInterceptor;

    try {
        const fileBuffer = base64ToBuffer(pendingHex.value);
        
        const boardMap = {
          'arduino:avr:uno': 'uno',
          'arduino:avr:nano': 'nano',
          'arduino:avr:mega': 'mega',
          'arduino:avr:leonardo': 'leonardo'
        };
        const boardKey = boardMap[selectedBoardFqbn.value] || 'uno';

        const avrgirl = new Avrgirl({ board: boardKey, debug: true });

        await new Promise((resolve, reject) => {
            avrgirl.flash(fileBuffer, (error) => {
                // Restauramos consolas inmediatamente para depurar si hace falta
                // console.log = originalLog; (Lo hacemos en finally para asegurar)

                if (error) {
                    // INTELIGENCIA DE ERRORES:
                    // Si el log ya tiene "flash complete" o "Escritura terminada", 
                    // ENTONCES FUE ÉXITO. El error es falso positivo del cierre.
                    const logs = outputLog.value;
                    const successDetected = logs.includes('flash complete') || logs.includes('Escritura terminada');

                    if (successDetected) {
                        resolve(); // ¡ÉXITO! Ignorar el error.
                    } else if (error.message === 'Releasing Default reader') {
                        resolve(); // ¡ÉXITO! Error conocido de cierre.
                    } else {
                        reject(error);
                    }
                } else {
                    resolve();
                }
            });
        });

        outputLog.value += "\n✨ ¡SUBIDA EXITOSA!";
        pendingHex.value = null;

    } catch (e) {
        // ULTIMO RECURSO DE VERIFICACIÓN
        const logs = outputLog.value;
        const successDetected = logs.includes('flash complete') || logs.includes('Escritura terminada');
        
        if (successDetected || (e.message && e.message.includes('Releasing Default reader'))) {
             outputLog.value += "\n✨ ¡SUBIDA EXITOSA! (Error de cierre ignorado)";
             pendingHex.value = null;
        } else {
             outputLog.value += `\n❌ Error en subida: ${e.message}`;
             if(e.message && (e.message.includes('gesture') || e.message.includes('canceled'))) {
                  isReadyToFlash.value = true;
                  outputLog.value += "\n(Vuelve a presionar CONFIRMAR)";
             }
        }
    } finally {
        // Restaurar consola original
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
        isUploading.value = false;
    }
}

// --- COMUNICACIÓN CON BACKEND ---
async function requestCompile() {
    const response = await fetch('http://127.0.0.1:3000/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: generatedCode.value,
        fqbn: selectedBoardFqbn.value
      })
    });
    const data = await response.json();
    outputLog.value += data.log;
    return (data.success && data.hex) ? data.hex : null;
}

// --- BOTÓN VERIFICAR ---
async function verifyCode() {
    if (isCompiling.value) return;
    isCompiling.value = true;
    showOutput.value = true;
    outputLog.value = "Verificando código...\n";
    updateContent();
    try {
        await requestCompile();
        outputLog.value += "\n(Verificación terminada)";
    } catch(e) {
        outputLog.value += "\n❌ Error conexión: " + e.message;
    } finally {
        isCompiling.value = false;
    }
}

// --- MONITOR SERIAL ---
async function toggleConnection() {
  if (isPortConnected.value) await closePort();
  else await openPort();
}
async function openPort() {
  if (!("serial" in navigator)) return alert("Navegador no soportado");
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    serialPort.value = port;
    isPortConnected.value = true;
    outputLog.value += "\n🔌 Monitor Conectado.";
  } catch (e) { outputLog.value += `\n❌ Error puerto: ${e.message}`; }
}
async function closePort() {
    if (serialPort.value) {
        try {
            await serialPort.value.close();
            serialPort.value = null;
            isPortConnected.value = false;
            outputLog.value += "\n❌ Puerto liberado.";
        } catch (e) { outputLog.value += "\nError cerrando: " + e.message; }
    }
}

// --- UI Y BLOCKLY ---
function updateContent() {
  if (!workspace) return;
  generatedCode.value = ArduinoGenerator.workspaceToCode(workspace);
  const xmlDom = Blockly.Xml.workspaceToDom(workspace);
  generatedXml.value = Blockly.Xml.domToPrettyText(xmlDom);
}

function insertStartBlock() {
    if(!workspace) return;
    const startBlock = workspace.newBlock('arduino_start');
    startBlock.initSvg();
    startBlock.render();
    workspace.centerOnBlock(startBlock.id);
    updateContent(); 
}

function saveSketchWeb() {
  const blob = new Blob([generatedXml.value], { type: "text/xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = (sketchName.value || "proyecto") + ".xml";
  link.click();
}
function triggerLoad() { fileInput.value.click(); }
function handleFileUpload(e) { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        workspace.clear();
        try {
            const xml = Blockly.utils.xml.textToDom(ev.target.result);
            Blockly.Xml.domToWorkspace(xml, workspace);
        } catch(err) { console.error(err); }
    };
    reader.readAsText(file);
    e.target.value = '';
}
function clearWorkspace() { 
    if(confirm("Borrar todo?")) { workspace.clear(); insertStartBlock(); }
}
function runSimulation() { showOutput.value = true; outputLog.value = generatedCode.value; }

onMounted(() => {
  if (blocklyDiv.value) {
    workspace = Blockly.inject(blocklyDiv.value, {
      toolbox: {
        kind: 'categoryToolbox',
        contents: [
            { kind: 'category', name: 'Variables', colour: '#A65C81', contents: [
              { kind: 'block', type: 'arduino_start' },
              { kind: 'button', text: 'Crear Variable', callbackKey: 'CREATE_VARIABLE' },
              { kind: 'block', type: 'variables_get' },
              { kind: 'block', type: 'variables_set' },
              { kind: 'block', type: 'variables_set_type' },
              { kind: 'block', type: 'type_cast' }
            ]},
            { kind: 'category', name: 'Lógica', colour: '#5C81A6', contents: [
              { kind: 'block', type: 'controls_if' },
              { kind: 'block', type: 'logic_compare' },
              { kind: 'block', type: 'logic_operation' },
              { kind: 'block', type: 'logic_boolean' },
              { kind: 'block', type: 'logic_negate' },
              { kind: 'block', type: 'logic_null' },
              { kind: 'block', type: 'logic_ternary' }
            ]},
            { kind: 'category', name: 'Bucles', colour: '#5CA65C', contents: [
              { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
              { kind: 'block', type: 'controls_whileUntil' },
              { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
              { kind: 'block', type: 'controls_flow_statements' }
            ]},
            { kind: 'category', name: 'Matemáticas', colour: '#5C68A6', contents: [
              { kind: 'block', type: 'math_number' },
              { kind: 'block', type: 'math_arithmetic' },
              { kind: 'block', type: 'math_random_int' },
              { kind: 'block', type: 'math_map' },
              { kind: 'block', type: 'math_single' },
              { kind: 'block', type: 'math_trig' },
              { kind: 'block', type: 'math_constant' },
              { kind: 'block', type: 'math_number_property' },
              { kind: 'block', type: 'math_round' },
              { kind: 'block', type: 'math_modulo' },
              { kind: 'block', type: 'math_constrain' }
            ]},
            { kind: 'category', name: 'Texto', colour: '#5CA699', contents: [
              { kind: 'block', type: 'text' },
              { kind: 'block', type: 'text_print' },
              { kind: 'block', type: 'text_join' },
              { kind: 'block', type: 'text_append' },
              { kind: 'block', type: 'text_length' },
              { kind: 'block', type: 'text_isEmpty' }
            ]},
            { kind: 'sep' },
            { kind: 'category', name: 'Entrada/Salida', colour: '#5C81A6', contents: [
              { kind: 'block', type: 'digital_write' },
              { kind: 'block', type: 'digital_read' },
              { kind: 'block', type: 'analog_read' },
              { kind: 'block', type: 'analog_write' },
              { kind: 'block', type: 'custom_delay' }
            ]},
            { kind: 'category', name: 'Motores & Energía', colour: '#E67E22', contents: [
              { kind: 'block', type: 'motor_setup' },
              { kind: 'block', type: 'motor_run' },
              { kind: 'block', type: 'motor_stop' }
            ]},
            { kind: 'category', name: 'Pantallas (8x8)', colour: '#D35400', contents: [
              { kind: 'block', type: 'display_8x8_setup' },
              { kind: 'block', type: 'display_8x8_draw' }
            ]},
            { kind: 'category', name: 'Sensores', colour: '#8E44AD', contents: [
              { kind: 'block', type: 'ultrasonic_read' },
              { kind: 'block', type: 'color_sensor_read' },
              { kind: 'block', type: 'sound_sensor_read' }
            ]},
            { kind: 'category', name: 'Conectividad', colour: '#2980B9', contents: [
              { kind: 'block', type: 'wifi_connect' },
              { kind: 'block', type: 'wifi_is_connected' },
              { kind: 'block', type: 'bluetooth_setup' },
              { kind: 'block', type: 'bluetooth_read_string' },
              { kind: 'block', type: 'bluetooth_send_string' },
              { kind: 'block', type: 'rm_bluetooth_read' }
            ]}
        ]
      },
      scrollbars: true,
      media: 'media/', 
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      renderer: 'geras',
      theme: {
        'base': 'classic',
        'fontStyle': { 'family': 'Segoe UI, sans-serif', 'weight': 'bold', 'size': 12 },
        'componentStyles': { 
            'workspaceBackgroundColour': 'transparent', 
            'toolboxBackgroundColour': '#e0e5ec', 
            'flyoutBackgroundColour': '#e0e5eccc' 
        }
      }
    });
    workspace.registerButtonCallback('CREATE_VARIABLE', (b) => Blockly.Variables.createVariableButtonHandler(b.getTargetWorkspace(), null, ''));
    workspace.addChangeListener(updateContent);
    insertStartBlock();
  }
});
</script>

<style scoped>
/* VARIABLES NEUMORFISM */
:root {
    --bg-color: #e0e5ec;
    --shadow-light: #ffffff;
    --shadow-dark: #a3b1c6;
    --text-color: #4d5b6b;
    --accent-color: #6d7fcc;
    --danger-color: #e57373;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #e0e5ec;
  font-family: 'Segoe UI', sans-serif;
  color: #4d5b6b;
}

/* UTILIDADES SVG */
.w-5 { width: 20px; }
.h-5 { height: 20px; }
.w-4 { width: 16px; }
.h-4 { height: 16px; }
.ml-1 { margin-left: 4px; }
.animate-spin { animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* NUEVOS ESTILOS PARA EL BOTÓN DE SUBIDA */
.ready-to-flash {
    background-color: #27ae60 !important;
    color: white !important;
    animation: pulse 2s infinite;
    font-weight: bold;
    box-shadow: 0 0 10px #2ecc71;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* ESTILOS NEUMÓRFICOS */
.neu-btn, .neu-btn-icon {
    border-radius: 10px;
    background: #e0e5ec;
    box-shadow: 6px 6px 12px #a3b1c6, -6px -6px 12px #ffffff;
    border: none;
    color: #4d5b6b;
    transition: all 0.2s ease;
    cursor: pointer;
    font-weight: 700;
}

.neu-btn:hover, .neu-btn-icon:hover {
    transform: translateY(-1px);
    box-shadow: 8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff;
    color: #6d7fcc;
}

.neu-btn:active, .neu-btn-icon:active {
    box-shadow: inset 4px 4px 8px #a3b1c6, inset -4px -4px 8px #ffffff;
    transform: translateY(1px);
}

.neu-btn.connected {
    color: #27AE60;
    box-shadow: inset 3px 3px 6px #a3b1c6, inset -3px -3px 6px #ffffff;
    font-weight: bold;
}

.neu-input, .neu-inset {
    border-radius: 10px;
    background: #e0e5ec;
    box-shadow: inset 5px 5px 10px #a3b1c6, inset -5px -5px 10px #ffffff;
    border: none;
    padding: 8px 12px;
}

.neu-inset-large {
    box-shadow: inset 8px 8px 16px #a3b1c6, inset -8px -8px 16px #ffffff;
}

.neu-flat {
    background: #e0e5ec;
    box-shadow: 5px 5px 10px #a3b1c6, -5px -5px 10px #ffffff;
}

/* LAYOUT */
.top-bar {
  min-height: 70px;
  background: #e0e5ec;
  display: flex;
  align-items: center;
  padding: 10px 20px;
  gap: 20px;
  flex-wrap: wrap;
  z-index: 10;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 120px;
}

.app-logo { 
    height: 60px; 
    width: auto;
    object-fit: contain;
}

.controls-wrapper {
    display: flex;
    flex-grow: 1;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    flex-wrap: wrap;
}

.hardware-controls {
    display: flex;
    gap: 15px;
    align-items: center;
    padding: 10px 15px;
    border-radius: 15px;
    flex-wrap: wrap;
}

.hw-select {
    color: #4d5b6b;
    font-weight: 600;
    min-width: 140px;
    outline: none;
}

.port-selector {
    display: flex;
    gap: 10px;
}

.sketch-name-container {
    margin: 0 15px;
    flex-grow: 0;
    min-width: 150px;
    display: flex;
    align-items: center;
}

.sketch-name-input {
    width: 100%;
    min-width: 150px;
    text-align: center;
    font-weight: bold;
    color: #6d7fcc;
    font-size: 1rem;
    transition: all 0.3s ease;
}
.sketch-name-input:focus {
    outline: none;
    box-shadow: inset 6px 6px 12px #a3b1c6, inset -6px -6px 12px #ffffff;
}

.actions-area {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
}

.verify-btn { color: #4a90e2; }
.upload-btn { color: #27ae60; }
.run-btn { color: #e67e22; }
.danger { color: #e57373; }
.danger:hover { color: #ff5252; }

.divider { width: 1px; height: 30px; background: #cbd5e1; margin: 0 5px; opacity: 0.5; }

/* SIDEBAR & CONTENT */
.main-content {
  flex-grow: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  padding: 15px;
  gap: 15px;
}

.blockly-container {
  flex-grow: 1;
  border-radius: 20px;
  overflow: hidden;
  background-color: #e0e5ec;
}

.dot-grid-background {
  background-image: radial-gradient(#a3b1c6 1.5px, transparent 1.5px);
  background-size: 20px 20px;
  background-position: 0 0;
}

.right-sidebar {
  width: 350px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  padding: 15px;
  gap: 15px;
}

.tabs {
    display: flex;
    margin-bottom: 5px;
}

.tab {
    background: transparent;
    border: none;
    color: #4d5b6b;
    padding: 5px 15px;
    cursor: pointer;
    font-weight: 700;
    border-bottom: 3px solid transparent;
}

.tab.active {
    color: #6d7fcc;
    border-bottom-color: #6d7fcc;
    text-shadow: 1px 1px 2px #fff;
}

.code-panel {
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    border-radius: 15px;
}

.panel-content {
    width: 100%;
    height: 100%;
    color: #4d5b6b;
    resize: none;
    font-family: 'Consolas', monospace;
    font-size: 0.85rem;
    outline: none;
    background: #e0e5ec;
}

.output-panel {
    height: 200px;
    display: flex;
    flex-direction: column;
    transition: height 0.3s ease;
    border-radius: 15px;
    background: #e0e5ec;
    box-shadow: 5px 5px 10px #a3b1c6, -5px -5px 10px #ffffff;
    overflow: hidden;
}

.output-panel.collapsed {
    height: 45px;
}

.panel-header {
    padding: 10px 15px;
    background: #e0e5ec;
    color: #4d5b6b;
    font-size: 0.85rem;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid rgba(163, 177, 198, 0.3);
}

.panel-header:hover {
    color: #6d7fcc;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.neu-btn-small {
    border: none;
    background: transparent;
    color: #a3b1c6;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 6px;
    box-shadow: 3px 3px 6px #a3b1c6, -3px -3px 6px #ffffff;
}
.neu-btn-small:hover { color: #e57373; }

.console-content {
    flex-grow: 1;
    background: #e0e5ec;
    color: #27ae60;
    resize: none;
    outline: none;
    margin: 10px;
    border-radius: 10px;
}

/* RESPONSIVE */
@media (max-width: 900px) {
    .btn-text { display: none; }
    .action-btn { padding: 10px; border-radius: 50%; width: 40px; height: 40px; }
    .right-sidebar { width: 250px; }
}

@media (max-width: 768px) {
    .main-content { flex-direction: column; }
    .right-sidebar { width: 100%; height: 350px; }
    .top-bar { justify-content: center; }
    .controls-wrapper { justify-content: center; }
    .sketch-name-container { width: 100%; margin: 10px 0; order: -1; }
    .sketch-name-input { width: 100%; }
}
</style>