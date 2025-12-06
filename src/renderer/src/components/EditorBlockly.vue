<script setup>
import { onMounted, ref } from 'vue';
import * as Blockly from 'blockly';
import * as En from 'blockly/msg/en';
import 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';

Blockly.setLocale(En);

const blocklyDiv = ref(null);
const generatedCode = ref("");
const consoleLogs = ref([]);
let workspace = null;

const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Lógica',
      colour: '#5C81A6',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
      ]
    },
    {
      kind: 'category',
      name: 'Matemáticas',
      colour: '#5CA65C',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
      ]
    },
    {
      kind: 'category',
      name: 'Texto',
      colour: '#5CA699',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_print' },
      ]
    },
    {
      kind: 'category',
      name: 'Bucles',
      colour: '#5CA65C',
      contents: [
         { kind: 'block', type: 'controls_repeat_ext'},
      ]
    }
  ]
};

javascriptGenerator.forBlock['text_print'] = function(block) {
  const msg = javascriptGenerator.valueToCode(block, 'TEXT', javascriptGenerator.ORDER_NONE) || "''";
  return `customLog(${msg});\n`;
};

const updateCode = () => {
  if (!workspace) return;
  const code = javascriptGenerator.workspaceToCode(workspace);
  generatedCode.value = code;
};

const runCode = () => {
  consoleLogs.value = [];
  
  try {
    const customLog = (message) => {
      consoleLogs.value.push(`> ${message}`);
    };

    const runFunction = new Function('customLog', generatedCode.value);
    runFunction(customLog);
    
    consoleLogs.value.push("--- Ejecución finalizada con éxito ---");
  } catch (error) {
    consoleLogs.value.push(`Error: ${error.message}`);
  }
};

// 3. FUNCIÓN GUARDAR PROYECTO
const saveProject = async () => {
  if (!workspace) return;
  // Convertimos los bloques a JSON
  const state = Blockly.serialization.workspaces.save(workspace);
  const jsonString = JSON.stringify(state);
  
  // Llamamos al puente que creamos en el preload
  const result = await window.api.saveFile(jsonString);
  
  if (result.success) {
    customLog('--- Proyecto guardado correctamente ---');
  } else if (result.error) {
    customLog('Error al guardar: ' + result.error);
  }
};

// 4. FUNCIÓN CARGAR PROYECTO
const loadProject = async () => {
  if (!workspace) return;
  
  const result = await window.api.openFile();
  
  if (!result.canceled && result.content) {
    try {
      const state = JSON.parse(result.content);
      // Limpiamos y cargamos el nuevo estado
      Blockly.serialization.workspaces.load(state, workspace);
      customLog('--- Proyecto cargado correctamente ---');
    } catch (e) {
      customLog('Error al leer el archivo (formato inválido)');
    }
  }
};

onMounted(() => {
  if (blocklyDiv.value) {
    workspace = Blockly.inject(blocklyDiv.value, {
      toolbox: toolbox,
      scrollbars: true,
      trashcan: true,
      media: 'media/', 
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true }
    });
    workspace.addChangeListener(updateCode);
    window.addEventListener('resize', () => Blockly.svgResize(workspace));
  }
});
</script>

<template>
  <div class="editor-container">
    <div ref="blocklyDiv" class="blockly-area"></div>
    
    <div class="sidebar">
      
      <div class="code-section">
        <div class="header">
          <h3>JavaScript Generado</h3>
          <button @click="runCode" class="run-btn">▶ EJECUTAR</button>
          <div class="file-controls">
          <button @click="saveProject" class="secondary-btn">💾 Guardar</button>
          <button @click="loadProject" class="secondary-btn">📂 Abrir</button>
        </div>
        </div>
        <pre class="code-view">{{ generatedCode }}</pre>
        
        <h3>JS Generado</h3>
        <button @click="runCode" class="run-btn">▶ EJECUTAR</button>
      </div>

      <div class="console-section">
        <h3>Consola de Salida</h3>
        <div class="console-output">
          <div v-for="(log, index) in consoleLogs" :key="index" class="log-line">
            {{ log }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.editor-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: row;
  font-family: sans-serif;
}

.blockly-area {
  width: 60%;
  height: 100%;
}

.sidebar {
  width: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  border-left: 2px solid #333;
}

/* Estilos de la parte del código */
.code-section {
  height: 50%;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-bottom: 2px solid #444;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

h3 {
  color: #ddd;
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
}

.run-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
}

.run-btn:hover {
  background-color: #218838;
}

.code-view {
  flex-grow: 1;
  background: #2d2d2d;
  color: #569cd6;
  padding: 10px;
  margin: 0;
  overflow: auto;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
}

/* Estilos de la consola */
.console-section {
  height: 50%;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.console-output {
  flex-grow: 1;
  background: black;
  color: #0f0;
  padding: 10px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  border-radius: 4px;
}

.log-line {
  margin-bottom: 4px;
  border-bottom: 1px solid #111;
}
.secondary-btn {
  background-color: #444;
  color: white;
  border: 1px solid #666;
  padding: 5px 10px;
  cursor: pointer;
  margin-right: 5px;
  border-radius: 4px;
}
.secondary-btn:hover {
  background-color: #555;
}
.file-controls {
  display: flex;
}
</style>