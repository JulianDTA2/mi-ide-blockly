<template>
  <div class="app-layout">
    
    <header class="top-bar">
      <div class="logo-area">
          <img :src="logo1" alt="Logo RM" class="app-logo" />
          <span class="divider-logo">|</span>
          <img :src="logo2" alt="Logo Mark" class="app-logo" />
      </div>
      
      <div class="controls-wrapper">
        <div class="hardware-controls neu-flat">
            <select v-model="selectedBoardFqbn" class="hw-select neu-input" title="Seleccionar Placa">
                <option value="arduino:avr:uno">Arduino Uno</option>
                <option value="arduino:avr:nano">Arduino Nano</option>
                <option value="arduino:avr:mega">Arduino Mega</option>
                <option value="esp8266:esp8266:nodemcuv2">NodeMCU 1.0</option>
                <option value="esp32:esp32:esp32">ESP32 Dev Module</option>
                <option disabled>──────────────</option>
                <option v-for="b in allKnownBoards" :key="b.fqbn" :value="b.fqbn">
                    {{ b.name }}
                </option>
            </select>

            <div class="port-selector">
                <select 
                    v-model="selectedPort" 
                    class="hw-select port-select neu-input"
                    :title="selectedPort ? 'Puerto Seleccionado: ' + selectedPort : 'Sin puerto'"
                >
                    <option value="" disabled>
                      {{ availablePorts.length === 0 ? 'Sin Puertos' : 'Seleccionar Puerto' }}
                    </option>
                    <option v-for="p in availablePorts" :key="p.address" :value="p.address">
                        {{ p.label }}
                    </option>
                </select>

                <button @click="refreshPorts" class="icon-btn refresh-btn neu-btn-icon" title="Refrescar Puertos">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </button>
            </div>
        </div>

        <div class="sketch-name-container">
            <input 
                type="text" 
                v-model="sketchName" 
                class="sketch-name-input neu-inset" 
                placeholder="NombreProyecto" 
            />
        </div>

        <div class="actions-area">
            <button class="action-btn neu-btn verify-btn" @click="verifyCode" :disabled="isCompiling" title="Verificar/Compilar">
                <span v-if="isCompiling">
                    <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </span>
                <span v-else>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </span> 
                <span class="btn-text">Verificar</span>
            </button>
            
            <button class="action-btn neu-btn upload-btn" @click="uploadCode" :disabled="isUploading" title="Subir a Placa">
                <span v-if="isUploading">
                    <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </span>
                <span v-else>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </span> 
                <span class="btn-text">Subir</span>
            </button>

            <button class="action-btn neu-btn run-btn" @click="runSimulation" title="Ver Código Generado">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span class="btn-text">Código</span>
            </button>

            <div class="divider"></div>

            <button class="action-btn secondary-btn neu-btn-icon" @click="installAvrCore" :disabled="isInstalling" title="Instalar Soporte Arduino Uno/Nano">
                <span v-if="isInstalling">
                    <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </span>
                <span v-else>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </span>
            </button>

            <button class="action-btn secondary-btn neu-btn" @click="openInArduino" title="Abrir en IDE Nativo">
                <span class="btn-text">IDE</span> 
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </button>
            
            <button class="action-btn secondary-btn neu-btn-icon" @click="saveSketch" title="Guardar Proyecto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            </button>
            
            <button class="action-btn secondary-btn neu-btn-icon" @click="loadSketch" title="Abrir Proyecto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
            </button>
            
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
                    <span>Output Console</span>
                </div>
                <button class="clear-console neu-btn-small" @click.stop="outputLog = ''">
                    Limpiar
                </button>
            </div>
            <textarea v-show="showOutput" class="console-content neu-inset" readonly :value="outputLog"></textarea>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'; 
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en';
import 'blockly/blocks'; 

// Importación unificada (Bloques + Generador)
import ArduinoGenerator from '../arduino_core.js'; 

// Ajusta estas rutas a tus logos reales
import logo2 from '../../../../resources/logo_m4rk.webp'; 
import logo1 from '../../../../resources/logo_RM.png';

Blockly.setLocale(En);

// Refs de UI
const blocklyDiv = ref(null);
const generatedCode = ref("");
const generatedXml = ref("");
const outputLog = ref("Bienvenido a MarkRobot IDE.\nSelecciona una placa y puerto para comenzar.");
const isCompiling = ref(false);
const isUploading = ref(false);
const isInstalling = ref(false);
const showOutput = ref(true); 
const sketchName = ref("MySketch");

// Refs de Hardware
const rawPorts = ref([]); 
const selectedPort = ref("");
const allKnownBoards = ref([]); 
const selectedBoardFqbn = ref("arduino:avr:uno"); 

let workspace = null;

// --- COMPUTADA: FORMATO DE PUERTOS LIMPIO Y ROBUSTO ---
const availablePorts = computed(() => {
    if (!rawPorts.value || !Array.isArray(rawPorts.value)) return [];

    return rawPorts.value.map(p => {
        let portName = p.address;
        if (!portName && p.port && p.port.address) {
            portName = p.port.address;
        }
        if (!portName) return null;

        return {
            address: portName,
            label: portName, 
        };
    }).filter(p => p !== null); 
});

async function refreshPorts() {
  if (!window.api) return;
  outputLog.value += "\nBuscando puertos...";
  
  try {
    const ports = await window.api.listBoards(); 
    rawPorts.value = ports || [];
    
    setTimeout(() => {
        if (availablePorts.value.length > 0) {
            if (!selectedPort.value) {
                selectedPort.value = availablePorts.value[0].address;
            }
            outputLog.value += `\nEncontrados: ${availablePorts.value.length}`;
        } else {
            outputLog.value += "\nNo se encontraron puertos (verifica drivers/cable).";
        }
    }, 50);
    
  } catch (e) {
    outputLog.value += `\nError al listar puertos: ${e.message}`;
  }
}

async function verifyCode() {
  if (isCompiling.value) return;
  if (!window.api) { alert("Backend no conectado"); return; }

  isCompiling.value = true;
  showOutput.value = true;
  outputLog.value = "Iniciando compilación...\n";
  updateContent(); 

  try {
    const res = await window.api.compile({
      code: generatedCode.value,
      fqbn: selectedBoardFqbn.value,
      sketchName: sketchName.value || 'Sketch'
    });
    outputLog.value += res.log;
    if (res.success) outputLog.value += "\n✅ VERIFICADO CORRECTAMENTE.";
  } catch (e) {
    outputLog.value += "\nError crítico: " + e.message;
  } finally {
    isCompiling.value = false;
  }
}

async function uploadCode() {
  if (isUploading.value) return;
  if (!window.api) { alert("Backend no conectado"); return; }
  
  if (!selectedPort.value) {
    alert("Por favor selecciona un PUERTO primero.");
    return;
  }
  
  isUploading.value = true;
  showOutput.value = true;
  outputLog.value = `Iniciando subida a ${selectedPort.value}...\n`;
  updateContent();
  
  try {
    const compileRes = await window.api.compile({
      code: generatedCode.value,
      fqbn: selectedBoardFqbn.value,
      sketchName: sketchName.value || 'Sketch'
    });
    
    if (!compileRes.success) {
      outputLog.value += compileRes.log + "\n⚠️ Subida cancelada por error de compilación.";
      isUploading.value = false;
      return;
    }

    outputLog.value += "\nCompilación OK. Subiendo...\n";
    
    const uploadRes = await window.api.upload({
      port: selectedPort.value,
      fqbn: selectedBoardFqbn.value,
      sketchName: sketchName.value || 'Sketch'
    });
    
    outputLog.value += uploadRes.log;
    if (uploadRes.success) outputLog.value += "\nSUBIDA COMPLETADA.\n Ejecutando...";
  } catch (e) {
    outputLog.value += "\nError crítico en subida: " + e.message;
  } finally {
    isUploading.value = false;
  }
}

async function installAvrCore() {
  if (isInstalling.value) return;
  if (!window.api) return;

  if(!confirm("Esto descargará el soporte para Arduino Uno/Nano/Mega. ¿Continuar?")) return;

  isInstalling.value = true;
  showOutput.value = true;
  outputLog.value += "\n⬇ Iniciando descarga del núcleo 'arduino:avr'...\n";
  
  try {
    const res = await window.api.installCore('arduino:avr');
    outputLog.value += res.log;
    
    if (res.success) {
        outputLog.value += "\n✅ Core AVR instalado.";
        window.api.listAllBoards().then(data => {
            if(data && data.boards) allKnownBoards.value = data.boards;
        });
    } else {
        outputLog.value += "\n⚠️ Error en la instalación.";
    }
  } catch (e) {
    outputLog.value += "\nError crítico al instalar core: " + e.message;
  } finally {
    isInstalling.value = false;
  }
}

async function openInArduino() {
  outputLog.value += "\nAbriendo en Arduino IDE...";
  if(window.api) {
      await window.api.openIde({
          code: generatedCode.value, 
          sketchName: sketchName.value || 'Sketch'
      });
  }
}

async function saveSketch() {
  if (window.api) {
    const result = await window.api.saveFile(generatedXml.value, sketchName.value);
    if(result.success) {
        outputLog.value += `\nProyecto guardado en: ${result.path}`;
    }
  }
}

async function loadSketch() {
  if (window.api) {
    const result = await window.api.openFile();
    if(!result.canceled && result.content) {
        workspace.clear();
        try {
            const xml = Blockly.utils.xml.textToDom(result.content);
            Blockly.Xml.domToWorkspace(xml, workspace);
            outputLog.value += "\nProyecto cargado exitosamente.";
            if(result.fileName) {
                sketchName.value = result.fileName.replace(/\.[^/.]+$/, "");
            }
        } catch(e) {
            outputLog.value += "\nError al parsear archivo.";
            console.error(e);
        }
    }
  }
}

function clearWorkspace() {
    if(confirm("¿Estás seguro de borrar todos los bloques?")) {
        workspace.clear();
        insertStartBlock();
        outputLog.value += "\nWorkspace limpiado.";
    }
}

function runSimulation() {
    showOutput.value = true;
    outputLog.value += "\n--- CÓDIGO GENERADO ---\n";
    outputLog.value += generatedCode.value;
}

// =========================================================
// DEFINICIÓN DE TOOLBOX (MENÚ LATERAL)
// =========================================================
// Aquí se registran todas las categorías para que aparezcan en la UI.
const toolbox = {
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
    // --- NUEVAS CATEGORÍAS AÑADIDAS ---
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
};

function updateContent() {
  if (!workspace) return;
  try {
    const code = ArduinoGenerator.workspaceToCode(workspace);
    generatedCode.value = code;
    const xmlDom = Blockly.Xml.workspaceToDom(workspace);
    generatedXml.value = Blockly.Xml.domToPrettyText(xmlDom);
  } catch (e) {
    console.error(e);
  }
}

function insertStartBlock() {
    if(!workspace) return;
    const startBlock = workspace.newBlock('arduino_start');
    startBlock.initSvg();
    startBlock.render();
    workspace.centerOnBlock(startBlock.id);
    updateContent(); 
}

onMounted(async () => {
  if (blocklyDiv.value) {
    workspace = Blockly.inject(blocklyDiv.value, {
      toolbox: toolbox,
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

    workspace.registerButtonCallback('CREATE_VARIABLE', (button) => {
      Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace(), null, '');
    });
    
    workspace.addChangeListener(updateContent);
    window.addEventListener('resize', () => Blockly.svgResize(workspace));
    
    insertStartBlock();

    await refreshPorts();
    
    if(window.api) {
        window.api.listAllBoards().then(data => {
            if(data && data.boards) allKnownBoards.value = data.boards;
        }).catch(err => console.error("Error loading boards", err));
    }
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

/* ESTILOS NEUMÓRFICOS */
.neu-btn, .neu-btn-icon {
    border-radius: 10px;
    background: #e0e5ec;
    box-shadow: 6px 6px 12px #a3b1c6, -6px -6px 12px #ffffff;
    border: none;
    color: #4d5b6b;
    transition: all 0.2s ease;
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
    height: 60px; /* Ajustado para que no sea enorme */
    width: auto;
    object-fit: contain;
}
.divider-logo { color: #a3b1c6; font-size: 1.5rem; font-weight: 300; }

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

.refresh-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    cursor: pointer;
    padding: 0;
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