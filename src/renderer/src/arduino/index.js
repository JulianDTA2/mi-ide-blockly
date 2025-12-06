import * as Blockly from 'blockly';

// 1. Truco de magia: Hacemos a Blockly global para que los scripts viejos lo encuentren
window.Blockly = Blockly;

// 2. Aquí vamos a importar los archivos que copiaste.
// VITE intentará ejecutarlos. Como Blockly ya está en 'window', deberían funcionar.
// CAMBIA ESTOS NOMBRES por los archivos reales que copiaste:
import './blocks.js';      // Tus definiciones de bloques
import './generator.js';   // Tu generador de Arduino

// 3. Inicializamos el generador si no existe (por seguridad)
if (!Blockly.Arduino) {
  Blockly.Arduino = new Blockly.Generator('Arduino');
  Blockly.Arduino.ORDER_ATOMIC = 0;
}

// 4. Configuración básica de Arduino (Setup y Loop)
Blockly.Arduino.init = function(workspace) {
  // Lógica para inicializar variables y definiciones
  Blockly.Arduino.definitions_ = Object.create(null);
  Blockly.Arduino.setups_ = Object.create(null);
};

// Función final para obtener el código limpio
Blockly.Arduino.finish = function(code) {
  // Juntamos includes, definiciones, setups y el código principal
  var definitions = [];
  var setups = [];
  
  for (var name in Blockly.Arduino.definitions_) {
    definitions.push(Blockly.Arduino.definitions_[name]);
  }
  for (var name in Blockly.Arduino.setups_) {
    setups.push(Blockly.Arduino.setups_[name]);
  }
  
  var allDefs = definitions.join('\n') + '\n\n';
  var allSetups = 'void setup() {\n  ' + setups.join('\n  ') + '\n}\n\n';
  var allLoop = 'void loop() {\n  ' + code + '\n}';
  
  return allDefs + allSetups + allLoop;
};

export const arduinoGenerator = Blockly.Arduino;