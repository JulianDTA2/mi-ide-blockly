<script setup>
import { onMounted, ref } from 'vue';
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en';
import 'blockly/blocks'; 

// IMPORTANTE: Tu cerebro Arduino
import ArduinoGenerator from '../arduino_core.js'; 

Blockly.setLocale(En);

const blocklyDiv = ref(null);
const generatedCode = ref("");
const generatedXml = ref("");
const sketchName = ref("Sketch_Name");
const outputLog = ref("Arduino IDE output: Listo para compilar.");
let workspace = null;

// ==========================================
// TOOLBOX (Configuración completa)
// ==========================================
const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    { kind: 'category', name: 'Logic', colour: '#5C81A6', contents: [
      { kind: 'block', type: 'controls_if' },
      { kind: 'block', type: 'logic_compare' },
      { kind: 'block', type: 'logic_operation' },
      { kind: 'block', type: 'logic_negate' },
      { kind: 'block', type: 'logic_boolean' },
      { kind: 'block', type: 'logic_null' },
      { kind: 'block', type: 'logic_ternary' }
    ]},
    { kind: 'category', name: 'Loops', colour: '#5CA65C', contents: [
      { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
      { kind: 'block', type: 'controls_whileUntil' },
      { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      { kind: 'block', type: 'controls_flow_statements' }
    ]},
    { kind: 'category', name: 'Math', colour: '#5C68A6', contents: [
      { kind: 'block', type: 'math_number' },
      { kind: 'block', type: 'math_arithmetic', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      { kind: 'block', type: 'math_single', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 9 } } } } },
      { kind: 'block', type: 'math_trig', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 45 } } } } },
      { kind: 'block', type: 'math_constant' },
      { kind: 'block', type: 'math_number_property', inputs: { NUMBER_TO_CHECK: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
      { kind: 'block', type: 'math_round' },
      { kind: 'block', type: 'math_modulo', inputs: { DIVIDEND: { shadow: { type: 'math_number', fields: { NUM: 64 } } }, DIVISOR: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
      { kind: 'block', type: 'math_constrain', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 50 } } }, LOW: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, HIGH: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
      { kind: 'block', type: 'math_random_int', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
      { kind: 'block', type: 'math_map', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 512 } } }, MAX: { shadow: { type: 'math_number', fields: { NUM: 255 } } } } }
    ]},
    { kind: 'category', name: 'Text', colour: '#5CA699', contents: [
      { kind: 'block', type: 'text' },
      { kind: 'block', type: 'text_join' },
      { kind: 'block', type: 'text_append', inputs: { TEXT: { shadow: { type: 'text' } } } },
      { kind: 'block', type: 'text_length', inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } },
      { kind: 'block', type: 'text_isEmpty', inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: '' } } } } },
      { kind: 'block', type: 'text_print', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'abc' } } } } }
    ]},
    { kind: 'category', name: 'Variables', colour: '#A65C81', contents: [
      { kind: 'button', text: 'Crear Variable', callbackKey: 'CREATE_VARIABLE' },
      { kind: 'block', type: 'variables_get' },
      { kind: 'block', type: 'variables_set' },
      { kind: 'block', type: 'variables_set_type' },
      { kind: 'block', type: 'type_cast' }
    ]},
    { kind: 'category', name: 'Functions', colour: '#9A5CA6', custom: 'PROCEDURE' },
    { kind: 'sep' },
    { kind: 'category', name: 'Input/Output', colour: '#5C81A6', contents: [
      { kind: 'block', type: 'digital_write' },
      { kind: 'block', type: 'digital_read' },
      { kind: 'block', type: 'analog_read' },
      { kind: 'block', type: 'analog_write', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 128 } } } } }
    ]},
    { kind: 'category', name: 'Time', colour: '#5CA65C', contents: [ { kind: 'block', type: 'custom_delay' } ]},
    { kind: 'category', name: 'Audio', colour: '#A65C5C', contents: [ { kind: 'block', type: 'play_tone' } ]},
    { kind: 'category', name: 'Motors', colour: '#A68C5C', contents: [ { kind: 'block', type: 'servo_move' } ]},
    { kind: 'category', name: 'Comms', colour: '#995CA6', contents: [ { kind: 'block', type: 'serial_print' } ]},
    { kind: 'category', name: 'RoboticMinds', colour: '#8E44AD', contents: [
      { kind: 'block', type: 'rm_ultrasonic' },
      { kind: 'block', type: 'rm_motor' },
      { kind: 'block', type: 'rm_bluetooth_read' },
      { kind: 'block', type: 'rm_wifi_connect' }
    ]}
  ]
};

// ==========================================
// FUNCIONES LÓGICAS
// ==========================================

const updateContent = () => {
  if (!workspace) return;
  try {
    // 1. Generar Código C++
    const code = ArduinoGenerator.workspaceToCode(workspace);
    generatedCode.value = code;

    // 2. Generar XML
    const xmlDom = Blockly.Xml.workspaceToDom(workspace);
    const xmlText = Blockly.Xml.domToPrettyText(xmlDom);
    generatedXml.value = xmlText;
  } catch (e) {
    console.error(e);
    outputLog.value = "Error: " + e.message;
  }
};

const saveSketch = async () => {
  if (window.api && window.api.saveFile) {
    // Guardamos el código .INO
    const result = await window.api.saveFile(generatedCode.value);
    if(result.success) outputLog.value = "Guardado exitosamente.";
  } else {
    // Fallback web (descarga archivo)
    const element = document.createElement('a');
    const file = new Blob([generatedCode.value], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = sketchName.value + ".ino";
    document.body.appendChild(element);
    element.click();
    outputLog.value = "Archivo descargado (Modo Web).";
  }
};

const loadSketch = async () => {
    // Aquí podrías implementar la carga de XML usando window.api.openFile
    // y luego Blockly.Xml.domToWorkspace
    if (window.api && window.api.openFile) {
        const result = await window.api.openFile();
        if(!result.canceled && result.content) {
             // Nota: Para cargar, necesitaríamos que el archivo guardado fuera JSON o XML, no C++.
             // Por simplicidad, este botón es placeholder o para cargar XML si guardaras XML.
             outputLog.value = "Función de carga de .ino no reversible a bloques (Solo XML/JSON soportado).";
        }
    }
};

const clearWorkspace = () => {
  if(confirm("¿Estás seguro de borrar todo?")) {
    workspace.clear();
    // Restaurar bloque inicial
    const startBlock = workspace.newBlock('arduino_start');
    startBlock.initSvg();
    startBlock.render();
    startBlock.moveBy(50, 50);
    outputLog.value = "Espacio de trabajo limpiado.";
  }
};

onMounted(() => {
  if (blocklyDiv.value) {
    workspace = Blockly.inject(blocklyDiv.value, {
      toolbox: toolbox,
      scrollbars: true,
      media: 'media/', 
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      grid: { spacing: 20, length: 3, colour: '#e5e7eb', snap: true },
      renderer: 'geras', // Estilo visual clásico pero limpio
      theme: {
        'base': 'classic',
        'fontStyle': { 'family': 'Segoe UI, sans-serif', 'weight': 'bold', 'size': 12 },
        'componentStyles': { 
            'workspaceBackgroundColour': '#ffffff', 
            'toolboxBackgroundColour': '#f3f4f6', 
            'flyoutBackgroundColour': '#e5e7eb'
        }
      }
    });

    workspace.registerButtonCallback('CREATE_VARIABLE', (button) => {
      Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace(), null, '');
    });

    const startBlock = workspace.newBlock('arduino_start');
    startBlock.initSvg();
    startBlock.render();
    startBlock.moveBy(50, 50);

    workspace.addChangeListener(updateContent);
    window.addEventListener('resize', () => Blockly.svgResize(workspace));
    
    // Inicialización inmediata
    setTimeout(updateContent, 100);
  }
});
</script>

<template>
  <div class="app-layout">
    
    <!-- 1. BARRA SUPERIOR -->
    <header class="top-bar">
        <div class="logo-area">
          <span class="brand-text"><span style="color:#6b7280">robotic</span><span style="color:#22c55e">minds</span> | <span style="color:#0ea5e9; font-weight:800">MARK</span><span style="color:#f59e0b">ROBOT</span></span>
      </div>
      
      <div class="sketch-input-container">
        <span class="edit-icon">✏️</span>
        <input type="text" v-model="sketchName" class="sketch-input" />
      </div>

      <div class="actions-area">
        <button class="action-btn" @click="loadSketch" title="Abrir Proyecto">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 13h-3v-3h3v3z"/><path d="M12 3h-6a2 2 0 0 0 -2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-12z"/><path d="M9 3v18"/><path d="M21 9h-6"/></svg>
          <span>Open</span>
        </button>
        <button class="action-btn" @click="saveSketch" title="Guardar .INO">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Save</span>
        </button>
        <button class="action-btn delete-btn" @click="clearWorkspace" title="Borrar Todo">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          <span>Delete All</span>
        </button>
      </div>
    </header>

    <!-- 2. CONTENIDO PRINCIPAL -->
    <main class="main-content">
      <!-- Izquierda: Blockly (La toolbox es inyectada por Blockly dentro de este div) -->
      <div ref="blocklyDiv" class="blockly-container"></div>

      <!-- Derecha: Paneles de Código -->
      <aside class="right-sidebar">
        <!-- Panel 1: Código C++ -->
        <div class="panel-box">
          <div class="panel-header">
            <span class="panel-icon">{ }</span> Arduino Source Code
          </div>
          <textarea class="panel-content code-font" readonly :value="generatedCode"></textarea>
        </div>

        <!-- Panel 2: XML -->
        <div class="panel-box" style="margin-top: 10px; flex-grow: 0.5;">
          <div class="panel-header">
            <span class="panel-icon">&lt; &gt;</span> Blocks XML
          </div>
          <textarea class="panel-content code-font xml-font" readonly :value="generatedXml"></textarea>
        </div>
      </aside>
    </main>

    <!-- 3. BARRA INFERIOR -->
    <footer class="bottom-bar">
      <div class="toggle-icon">⇅</div>
      <span>{{ outputLog }}</span>
    </footer>

  </div>
</template>

<style scoped>
/* ESTRUCTURA GENERAL */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #f3f4f6; /* Gris muy claro de fondo */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
}

/* TOP BAR */
.top-bar {
  height: 60px;
  background: linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%);
  border-bottom: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.logo-area {
  font-weight: bold;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  width: 250px;
}

.sketch-input-container {
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: 5px 15px;
  border-radius: 20px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #d1d5db;
}

.edit-icon {
  margin-right: 8px;
  color: #6b7280;
}

.sketch-input {
  border: none;
  outline: none;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  font-style: italic;
  width: 150px;
}

.actions-area {
  display: flex;
  gap: 15px;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: #4b5563;
  font-weight: 500;
  transition: color 0.2s;
}

.action-btn:hover {
  color: #111827;
}

.delete-btn:hover {
  color: #ef4444;
}

/* MAIN CONTENT */
.main-content {
  flex-grow: 1;
  display: flex;
  overflow: hidden;
  padding: 10px;
  gap: 10px;
}

.blockly-container {
  flex-grow: 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  background: white;
  border: 1px solid #e5e7eb;
}

.right-sidebar {
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* PANELES DERECHOS */
.panel-box {
  background: #f0f4f8;
  border: 1px solid #dae2ed;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.panel-header {
  background: #e2e8f0;
  padding: 8px 15px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #cbd5e1;
}

.panel-icon {
  font-family: monospace;
  font-weight: bold;
  color: #3b82f6;
}

.panel-content {
  flex-grow: 1;
  border: none;
  resize: none;
  padding: 12px;
  background: #f8fafc;
  color: #334155;
  outline: none;
  font-size: 0.85rem;
}

.code-font {
  font-family: 'Consolas', 'Monaco', monospace;
  color: #0d9488; /* Color similar a Arduino IDE */
}

.xml-font {
  color: #64748b;
  font-size: 0.8rem;
}

/* BOTTOM BAR */
.bottom-bar {
  height: 35px;
  background: #e2e8f0;
  border-top: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  padding: 0 15px;
  font-size: 0.8rem;
  color: #475569;
  gap: 10px;
}

.toggle-icon {
  font-weight: bold;
  cursor: pointer;
}
</style>