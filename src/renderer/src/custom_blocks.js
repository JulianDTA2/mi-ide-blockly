import * as Blockly from 'blockly';

const createCustomBlocks = () => {
  // Definimos la estructura visual de los bloques usando JSON
  Blockly.defineBlocksWithJsonArray([
    // BLOQUE PRINCIPAL (Setup y Loop)
    {
      "type": "arduino_start",
      "message0": "Arduino Run %1 Configuración (Setup) %2 %3 Bucle Principal (Loop) %4",
      "args0": [
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "SETUP" },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "LOOP" }
      ],
      "colour": "#A65C81",
      "tooltip": "Estructura base del programa Arduino",
      "helpUrl": ""
    },
    // DELAY (Tiempo)
    {
      "type": "custom_delay",
      "message0": "Esperar %1 ms",
      "args0": [
        { "type": "field_number", "name": "DELAY_MS", "value": 1000, "min": 0 }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "#5CA65C",
      "tooltip": "Pausa la ejecución por milisegundos",
      "helpUrl": ""
    },
    // SENSOR ULTRASONICO
    {
      "type": "rm_ultrasonic",
      "message0": "Ultrasonico Trig %1 Echo %2",
      "args0": [
        { "type": "field_dropdown", "name": "TRIG", "options": [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"]] },
        { "type": "field_dropdown", "name": "ECHO", "options": [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"]] }
      ],
      "output": "Number",
      "colour": "#8E44AD",
      "tooltip": "Mide distancia en cm",
      "helpUrl": ""
    },
    // MOTOR DC
    {
      "type": "rm_motor",
      "message0": "Motor Pin1 %1 Pin2 %2 Vel %3",
      "args0": [
        { "type": "field_dropdown", "name": "PIN1", "options": [["3", "3"], ["5", "5"], ["6", "6"], ["9", "9"], ["10", "10"], ["11", "11"]] },
        { "type": "field_dropdown", "name": "PIN2", "options": [["3", "3"], ["5", "5"], ["6", "6"], ["9", "9"], ["10", "10"], ["11", "11"]] },
        { "type": "input_value", "name": "SPEED", "check": "Number" }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "#8E44AD",
      "tooltip": "Controla un motor DC (requiere driver)",
      "helpUrl": ""
    },
    // LEER BLUETOOTH
    {
      "type": "rm_bluetooth_read",
      "message0": "Leer Bluetooth",
      "output": null,
      "colour": "#8E44AD",
      "tooltip": "Lee datos del puerto serie",
      "helpUrl": ""
    },
    // CONECTAR WIFI
    {
      "type": "rm_wifi_connect",
      "message0": "WiFi SSID %1 Pass %2",
      "args0": [
        { "type": "field_input", "name": "SSID", "text": "MiRed" },
        { "type": "field_input", "name": "PASSWORD", "text": "12345678" }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "#8E44AD",
      "tooltip": "Conectar a red WiFi (ESP32/8266)",
      "helpUrl": ""
    }
  ]);
};

export default createCustomBlocks;