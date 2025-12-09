import * as Blockly from 'blockly';

// =========================================================
// 1. CONFIGURACIÓN DEL GENERADOR C++ (ARDUINO)
// =========================================================
const Arduino = new Blockly.Generator('Arduino');

// Configuración de prioridad de operadores
Arduino.ORDER_ATOMIC = 0;
Arduino.ORDER_UNARY_POSTFIX = 1;
Arduino.ORDER_UNARY_PREFIX = 2;
Arduino.ORDER_MULTIPLICATIVE = 3;
Arduino.ORDER_ADDITIVE = 4;
Arduino.ORDER_SHIFT = 5;
Arduino.ORDER_RELATIONAL = 6;
Arduino.ORDER_EQUALITY = 7;
Arduino.ORDER_BITWISE_AND = 8;
Arduino.ORDER_BITWISE_XOR = 9;
Arduino.ORDER_BITWISE_OR = 10;
Arduino.ORDER_LOGICAL_AND = 11;
Arduino.ORDER_LOGICAL_OR = 12;
Arduino.ORDER_CONDITIONAL = 13;
Arduino.ORDER_ASSIGNMENT = 14;
Arduino.ORDER_NONE = 99;

Arduino.init = function(workspace) {
  Arduino.definitions_ = Object.create(null); 
  Arduino.setups_ = Object.create(null);      
  Arduino.variables_ = Object.create(null);   
};

Arduino.finish = function(code) {
  const definitions = [];
  const variables = [];
  const setups = [];
  
  for (const name in Arduino.definitions_) definitions.push(Arduino.definitions_[name]);
  for (const name in Arduino.variables_) variables.push(Arduino.variables_[name]);
  for (const name in Arduino.setups_) setups.push(Arduino.setups_[name]);
  
  const allDefs = definitions.join('\n');
  const allVars = variables.join('\n');
  const allSetups = 'void setup() {\n  ' + setups.join('\n  ') + '\n}\n\n';
  const allLoop = 'void loop() {\n' + code + '\n}';
  
  return '// Generado por MarkRobot IDE\n\n' + allDefs + '\n' + allVars + '\n' + allSetups + allLoop;
};

Arduino.scrub_ = function(block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = opt_thisOnly ? '' : Arduino.blockToCode(nextBlock);
  return code + nextCode;
};

// =========================================================
// UTILIDADES: LISTAS DE PINES (Definidas AL INICIO)
// =========================================================
const DIGITAL_PINS = [
  ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], 
  ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], 
  ['10', '10'], ['11', '11'], ['12', '12'], ['13', '13']
];

const ANALOG_PINS = [
  ['A0', 'A0'], ['A1', 'A1'], ['A2', 'A2'], ['A3', 'A3'], ['A4', 'A4'], ['A5', 'A5']
];

// =========================================================
// 2. BLOQUES DE ESTRUCTURA
// =========================================================

Blockly.Blocks['arduino_start'] = {
  init: function() {
    this.appendDummyInput().appendField("INICIO PROGRAMA");
    this.appendStatementInput("DO").setCheck(null).appendField("Hacer");
    this.setPreviousStatement(true, null); 
    this.setNextStatement(true, null);     
    this.setColour(120);                   
  }
};
Arduino.forBlock['arduino_start'] = function(block) {
  return Arduino.statementToCode(block, 'DO');
};

// =========================================================
// 3. LÓGICA & CONTROL
// =========================================================
Arduino.forBlock['controls_if'] = function(block) {
  let n = 0;
  let code = '';
  let branchCode, conditionCode;
  do {
    conditionCode = Arduino.valueToCode(block, 'IF' + n, Arduino.ORDER_NONE) || 'false';
    branchCode = Arduino.statementToCode(block, 'DO' + n);
    code += (n > 0 ? ' else ' : '') + 'if (' + conditionCode + ') {\n' + branchCode + '}';
    ++n;
  } while (block.getInput('IF' + n));
  if (block.getInput('ELSE')) {
    branchCode = Arduino.statementToCode(block, 'ELSE');
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

Arduino.forBlock['logic_compare'] = function(block) {
  const OPERATORS = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
  const operator = OPERATORS[block.getFieldValue('OP')];
  const argument0 = Arduino.valueToCode(block, 'A', Arduino.ORDER_EQUALITY) || '0';
  const argument1 = Arduino.valueToCode(block, 'B', Arduino.ORDER_EQUALITY) || '0';
  return [argument0 + ' ' + operator + ' ' + argument1, Arduino.ORDER_EQUALITY];
};

Arduino.forBlock['logic_operation'] = function(block) {
  const operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  const argument0 = Arduino.valueToCode(block, 'A', Arduino.ORDER_LOGICAL_AND) || 'false';
  const argument1 = Arduino.valueToCode(block, 'B', Arduino.ORDER_LOGICAL_AND) || 'false';
  return [argument0 + ' ' + operator + ' ' + argument1, Arduino.ORDER_LOGICAL_AND];
};

Arduino.forBlock['logic_negate'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'BOOL', Arduino.ORDER_UNARY_PREFIX) || 'true';
  return ['!' + argument0, Arduino.ORDER_UNARY_PREFIX];
};

Arduino.forBlock['logic_boolean'] = function(block) {
  return [(block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['logic_null'] = function(block) {
  return ['NULL', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['logic_ternary'] = function(block) {
  const value_if = Arduino.valueToCode(block, 'IF', Arduino.ORDER_CONDITIONAL) || 'false';
  const value_then = Arduino.valueToCode(block, 'THEN', Arduino.ORDER_CONDITIONAL) || 'null';
  const value_else = Arduino.valueToCode(block, 'ELSE', Arduino.ORDER_CONDITIONAL) || 'null';
  return [value_if + ' ? ' + value_then + ' : ' + value_else, Arduino.ORDER_CONDITIONAL];
};

Arduino.forBlock['controls_repeat_ext'] = function(block) {
  const repeats = Arduino.valueToCode(block, 'TIMES', Arduino.ORDER_ASSIGNMENT) || '0';
  const branch = Arduino.statementToCode(block, 'DO');
  return 'for (int i = 0; i < ' + repeats + '; i++) {\n' + branch + '}\n';
};

Arduino.forBlock['controls_whileUntil'] = function(block) {
  const mode = block.getFieldValue('MODE');
  const until = mode == 'UNTIL';
  let argument0 = Arduino.valueToCode(block, 'BOOL', until ? Arduino.ORDER_LOGICAL_NOT : Arduino.ORDER_NONE) || 'false';
  const branch = Arduino.statementToCode(block, 'DO');
  if (until) argument0 = '!' + argument0;
  return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

Arduino.forBlock['controls_for'] = function(block) {
  const variable0 = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  const argument0 = Arduino.valueToCode(block, 'FROM', Arduino.ORDER_ASSIGNMENT) || '0';
  const argument1 = Arduino.valueToCode(block, 'TO', Arduino.ORDER_ASSIGNMENT) || '0';
  const increment = Arduino.valueToCode(block, 'BY', Arduino.ORDER_ASSIGNMENT) || '1';
  const branch = Arduino.statementToCode(block, 'DO');
  Arduino.variables_[variable0] = 'int ' + variable0 + ';';
  return 'for (' + variable0 + ' = ' + argument0 + '; ' + variable0 + ' <= ' + argument1 + '; ' + variable0 + ' += ' + increment + ') {\n' + branch + '}\n';
};

Arduino.forBlock['controls_flow_statements'] = function(block) {
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK': return 'break;\n';
    case 'CONTINUE': return 'continue;\n';
  }
  return '';
};

// =========================================================
// 4. MATEMÁTICAS
// =========================================================
Arduino.forBlock['math_number'] = function(block) {
  return [parseFloat(block.getFieldValue('NUM')), Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['math_arithmetic'] = function(block) {
  const OPERATORS = { 'ADD': [' + ', Arduino.ORDER_ADDITIVE], 'MINUS': [' - ', Arduino.ORDER_ADDITIVE], 'MULTIPLY': [' * ', Arduino.ORDER_MULTIPLICATIVE], 'DIVIDE': [' / ', Arduino.ORDER_MULTIPLICATIVE], 'POWER': [null, Arduino.ORDER_NONE] };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const argument0 = Arduino.valueToCode(block, 'A', tuple[1]) || '0';
  const argument1 = Arduino.valueToCode(block, 'B', tuple[1]) || '0';
  if (!operator) return ['pow(' + argument0 + ', ' + argument1 + ')', Arduino.ORDER_UNARY_POSTFIX];
  return [argument0 + operator + argument1, tuple[1]];
};

Arduino.forBlock['math_single'] = function(block) {
  const operator = block.getFieldValue('OP');
  const arg = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  let code;
  switch (operator) {
    case 'ROOT': code = 'sqrt(' + arg + ')'; break;
    case 'ABS': code = 'abs(' + arg + ')'; break;
    case 'NEG': code = '-' + arg; break;
    case 'LN': code = 'log(' + arg + ')'; break;
    case 'LOG10': code = 'log10(' + arg + ')'; break;
    case 'EXP': code = 'exp(' + arg + ')'; break;
    case 'POW10': code = 'pow(10, ' + arg + ')'; break;
  }
  return [code, Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['math_trig'] = function(block) {
  const operator = block.getFieldValue('OP');
  const arg = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  let code;
  switch (operator) {
    case 'SIN': code = 'sin(' + arg + ' * PI / 180)'; break;
    case 'COS': code = 'cos(' + arg + ' * PI / 180)'; break;
    case 'TAN': code = 'tan(' + arg + ' * PI / 180)'; break;
    case 'ASIN': code = 'asin(' + arg + ') * 180 / PI'; break;
    case 'ACOS': code = 'acos(' + arg + ') * 180 / PI'; break;
    case 'ATAN': code = 'atan(' + arg + ') * 180 / PI'; break;
  }
  return [code, Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['math_constant'] = function(block) {
  const CONSTANTS = {'PI': ['PI', Arduino.ORDER_UNARY_POSTFIX], 'E': ['E', Arduino.ORDER_UNARY_POSTFIX], 'GOLDEN_RATIO': ['1.618', Arduino.ORDER_UNARY_POSTFIX], 'SQRT2': ['1.414', Arduino.ORDER_UNARY_POSTFIX], 'SQRT1_2': ['0.707', Arduino.ORDER_UNARY_POSTFIX], 'INFINITY': ['INFINITY', Arduino.ORDER_UNARY_POSTFIX]};
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

Arduino.forBlock['math_number_property'] = function(block) {
  const number_to_check = Arduino.valueToCode(block, 'NUMBER_TO_CHECK', Arduino.ORDER_MODULUS) || '0';
  const dropdown_property = block.getFieldValue('PROPERTY');
  let code;
  switch (dropdown_property) {
    case 'EVEN': code = '(int)' + number_to_check + ' % 2 == 0'; break;
    case 'ODD': code = '(int)' + number_to_check + ' % 2 == 1'; break;
    case 'POSITIVE': code = number_to_check + ' > 0'; break;
    case 'NEGATIVE': code = number_to_check + ' < 0'; break;
    case 'WHOLE': code = number_to_check + ' % 1 == 0'; break;
    case 'DIVISIBLE_BY':
      const divisor = Arduino.valueToCode(block, 'DIVISOR', Arduino.ORDER_MODULUS) || '0';
      code = '(int)' + number_to_check + ' % (int)' + divisor + ' == 0';
      break;
  }
  return [code, Arduino.ORDER_EQUALITY];
};

Arduino.forBlock['math_change'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'DELTA', Arduino.ORDER_ADDITIVE) || '0';
  const varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  return varName + ' += ' + argument0 + ';\n';
};

Arduino.forBlock['math_round'] = function(block) {
  const operator = block.getFieldValue('OP');
  const arg = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  let code;
  switch (operator) {
    case 'ROUND': code = 'round(' + arg + ')'; break;
    case 'ROUNDUP': code = 'ceil(' + arg + ')'; break;
    case 'ROUNDDOWN': code = 'floor(' + arg + ')'; break;
  }
  return [code, Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['math_modulo'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'DIVIDEND', Arduino.ORDER_MODULUS) || '0';
  const argument1 = Arduino.valueToCode(block, 'DIVISOR', Arduino.ORDER_MODULUS) || '0';
  return ['(int)' + argument0 + ' % (int)' + argument1, Arduino.ORDER_MODULUS];
};

Arduino.forBlock['math_constrain'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '0';
  const argument1 = Arduino.valueToCode(block, 'LOW', Arduino.ORDER_NONE) || '0';
  const argument2 = Arduino.valueToCode(block, 'HIGH', Arduino.ORDER_NONE) || '0';
  return ['constrain(' + argument0 + ', ' + argument1 + ', ' + argument2 + ')', Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['math_random_int'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'FROM', Arduino.ORDER_NONE) || '0';
  const argument1 = Arduino.valueToCode(block, 'TO', Arduino.ORDER_NONE) || '0';
  return ['random(' + argument0 + ', ' + argument1 + ' + 1)', Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['math_random_float'] = function(block) {
  return ['(random(0, 1000) / 1000.0)', Arduino.ORDER_UNARY_POSTFIX];
};

Blockly.Blocks['math_map'] = {
  init: function() {
    this.appendValueInput("NUM").setCheck("Number").appendField("Mapear");
    this.appendDummyInput().appendField("valor a [0-");
    this.appendValueInput("MAX").setCheck("Number");
    this.appendDummyInput().appendField("]");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setColour('#5C68A6');
  }
};
Arduino.forBlock['math_map'] = function(block) {
  const value = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  const max = Arduino.valueToCode(block, 'MAX', Arduino.ORDER_NONE) || '255';
  return ['map(' + value + ', 0, 1023, 0, ' + max + ')', Arduino.ORDER_ATOMIC];
};

// =========================================================
// 5. VARIABLES Y TEXTO
// =========================================================
Arduino.forBlock['variables_get'] = function(block) {
  const varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  return [varName, Arduino.ORDER_ATOMIC];
};
Arduino.forBlock['variables_set'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_ASSIGNMENT) || '0';
  const varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  Arduino.variables_[varName] = 'int ' + varName + ';';
  return varName + ' = ' + argument0 + ';\n';
};

Blockly.Blocks['variables_set_type'] = {
  init: function() {
    this.appendValueInput("VALUE").setCheck(null).appendField("fijar");
    this.appendDummyInput().appendField(new Blockly.FieldVariable("item"), "VAR");
    this.appendDummyInput().appendField("a");
    this.appendDummyInput().appendField("como");
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([["Número (int)","int"], ["Texto (String)","String"], ["Carácter (char)","char"], ["Decimal (float)","float"], ["Booleano (bool)","bool"]]), "TYPE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#A65C81');
  }
};
Arduino.forBlock['variables_set_type'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_ASSIGNMENT) || '0';
  const varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  const type = block.getFieldValue('TYPE');
  Arduino.variables_[varName] = type + ' ' + varName + ';';
  return varName + ' = ' + argument0 + ';\n';
};

Blockly.Blocks['type_cast'] = {
  init: function() {
    this.appendValueInput("VALUE").setCheck(null);
    this.appendDummyInput().appendField("como");
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([["Número (int)","int"], ["Texto (String)","String"], ["Carácter (char)","char"], ["Decimal (float)","float"]]), "TYPE");
    this.setOutput(true, null);
    this.setColour('#A65C81');
  }
};
Arduino.forBlock['type_cast'] = function(block) {
  const value = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  const type = block.getFieldValue('TYPE');
  if (type === 'String') return ['String(' + value + ')', Arduino.ORDER_UNARY_POSTFIX];
  return ['(' + type + ') ' + value, Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['text'] = function(block) {
  return [JSON.stringify(block.getFieldValue('TEXT')), Arduino.ORDER_ATOMIC];
};
Arduino.forBlock['text_join'] = function(block) {
  let code;
  if (block.itemCount_ == 0) return ['""', Arduino.ORDER_ATOMIC];
  else if (block.itemCount_ == 1) return ['String(' + (Arduino.valueToCode(block, 'ADD0', Arduino.ORDER_NONE) || '""') + ')', Arduino.ORDER_UNARY_POSTFIX];
  else {
    code = 'String(' + (Arduino.valueToCode(block, 'ADD0', Arduino.ORDER_NONE) || '""') + ')';
    for (let n = 1; n < block.itemCount_; n++) code += ' + String(' + (Arduino.valueToCode(block, 'ADD' + n, Arduino.ORDER_NONE) || '""') + ')';
    return [code, Arduino.ORDER_UNARY_POSTFIX];
  }
};
Arduino.forBlock['text_append'] = function(block) {
  const varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  const value = Arduino.valueToCode(block, 'TEXT', Arduino.ORDER_NONE) || '""';
  return varName + ' += String(' + value + ');\n';
};
Arduino.forBlock['text_length'] = function(block) {
  const text = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '""';
  return ['String(' + text + ').length()', Arduino.ORDER_UNARY_POSTFIX];
};
Arduino.forBlock['text_isEmpty'] = function(block) {
  const text = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '""';
  return ['String(' + text + ').length() == 0', Arduino.ORDER_EQUALITY];
};
Arduino.forBlock['text_print'] = function(block) {
  const msg = Arduino.valueToCode(block, 'TEXT', Arduino.ORDER_NONE) || '""';
  Arduino.setups_['serial_begin'] = 'Serial.begin(9600);';
  return 'Serial.println(' + msg + ');\n';
};

// =========================================================
// 6. HARDWARE (INPUT/OUTPUT)
// =========================================================
Blockly.Blocks['digital_write'] = {
  init: function() {
    this.appendDummyInput().appendField("Escribir Digital PIN").appendField(new Blockly.FieldNumber(13), "PIN").appendField("Valor").appendField(new Blockly.FieldDropdown([["HIGH","HIGH"], ["LOW","LOW"]]), "STATE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
  }
};
Arduino.forBlock['digital_write'] = function(block) {
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE');
  Arduino.setups_['setup_pin_' + pin] = 'pinMode(' + pin + ', OUTPUT);';
  return 'digitalWrite(' + pin + ', ' + state + ');\n';
};

Blockly.Blocks['digital_read'] = {
  init: function() {
    this.appendDummyInput().appendField("Leer Digital PIN").appendField(new Blockly.FieldNumber(2), "PIN");
    this.setOutput(true, "Boolean");
    this.setColour(65);
  }
};
Arduino.forBlock['digital_read'] = function(block) {
  const pin = block.getFieldValue('PIN');
  Arduino.setups_['setup_pin_' + pin] = 'pinMode(' + pin + ', INPUT);';
  return ['digitalRead(' + pin + ')', Arduino.ORDER_ATOMIC];
};

Blockly.Blocks['analog_read'] = {
  init: function() {
    this.appendDummyInput().appendField("Leer Analógico PIN").appendField(new Blockly.FieldDropdown(ANALOG_PINS), "PIN");
    this.setOutput(true, "Number");
    this.setColour(65);
  }
};
Arduino.forBlock['analog_read'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return ['analogRead(' + pin + ')', Arduino.ORDER_ATOMIC];
};

Blockly.Blocks['analog_write'] = {
  init: function() {
    this.appendDummyInput().appendField("Escribir PWM (Analógico) PIN").appendField(new Blockly.FieldNumber(3), "PIN").appendField("Valor");
    this.appendValueInput("NUM").setCheck("Number");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
  }
};
Arduino.forBlock['analog_write'] = function(block) {
  const pin = block.getFieldValue('PIN');
  const value = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_ATOMIC) || '0';
  Arduino.setups_['setup_pin_' + pin] = 'pinMode(' + pin + ', OUTPUT);';
  return 'analogWrite(' + pin + ', ' + value + ');\n';
};

Blockly.Blocks['custom_delay'] = {
  init: function() {
    this.appendValueInput("DELAY_TIME").setCheck("Number").appendField("Esperar (ms)");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
  }
};
Arduino.forBlock['custom_delay'] = function(block) {
  const delayTime = Arduino.valueToCode(block, 'DELAY_TIME', Arduino.ORDER_ATOMIC) || '1000';
  return 'delay(' + delayTime + ');\n';
};

// =========================================================
// 7. MÓDULOS DE CONECTIVIDAD (WIFI / BLUETOOTH)
// =========================================================

// --- WIFI ---
Blockly.Blocks['wifi_connect'] = {
  init: function() {
    this.appendDummyInput().appendField("Conectar WiFi");
    this.appendValueInput("SSID").setCheck("String").appendField("SSID");
    this.appendValueInput("PASSWORD").setCheck("String").appendField("Clave");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#27AE60');
  }
};
Arduino.forBlock['wifi_connect'] = function(block) {
  const ssid = Arduino.valueToCode(block, 'SSID', Arduino.ORDER_ATOMIC) || '"MiRed"';
  const pass = Arduino.valueToCode(block, 'PASSWORD', Arduino.ORDER_ATOMIC) || '"1234"';
  Arduino.definitions_['include_wifi'] = '#include <WiFi.h>'; 
  return `WiFi.begin(${ssid}, ${pass});\n`;
};

Blockly.Blocks['wifi_is_connected'] = {
  init: function() {
    this.appendDummyInput().appendField("¿WiFi Conectado?");
    this.setOutput(true, "Boolean");
    this.setColour('#27AE60');
  }
};
Arduino.forBlock['wifi_is_connected'] = function(block) {
  return ['(WiFi.status() == WL_CONNECTED)', Arduino.ORDER_ATOMIC];
};

// --- BLUETOOTH (HC-05/06) ---
Blockly.Blocks['bluetooth_setup'] = {
  init: function() {
    this.appendDummyInput().appendField("Configurar Bluetooth");
    this.appendDummyInput().appendField("RX Pin").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'RX_PIN');
    this.appendDummyInput().appendField("TX Pin").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'TX_PIN');
    this.appendDummyInput().appendField("Baudios").appendField(new Blockly.FieldDropdown([['9600', '9600'], ['38400', '38400']]), 'BAUD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2980B9');
  }
};
Arduino.forBlock['bluetooth_setup'] = function(block) {
  const rx = block.getFieldValue('RX_PIN');
  const tx = block.getFieldValue('TX_PIN');
  const baud = block.getFieldValue('BAUD');
  
  Arduino.definitions_['include_softserial'] = '#include <SoftwareSerial.h>';
  Arduino.definitions_['var_bt_serial'] = `SoftwareSerial BTSerial(${rx}, ${tx});`; 
  Arduino.setups_['setup_bt'] = `BTSerial.begin(${baud});`;
  
  return '';
};

Blockly.Blocks['bluetooth_read_string'] = {
  init: function() {
    this.appendDummyInput().appendField("BT Leer Texto");
    this.setOutput(true, "String");
    this.setColour('#2980B9');
  }
};
Arduino.forBlock['bluetooth_read_string'] = function(block) {
  return ['BTSerial.readString()', Arduino.ORDER_ATOMIC];
};

Blockly.Blocks['bluetooth_send_string'] = {
  init: function() {
    this.appendValueInput("DATA").setCheck(null).appendField("BT Enviar");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2980B9');
  }
};
Arduino.forBlock['bluetooth_send_string'] = function(block) {
  const data = Arduino.valueToCode(block, 'DATA', Arduino.ORDER_ATOMIC) || '""';
  return `BTSerial.println(${data});\n`;
};

Blockly.Blocks['rm_bluetooth_read'] = {
  init: function() {
    this.appendDummyInput().appendField("Leer Dato Bluetooth (Serial1)");
    this.setOutput(true, "String");
    this.setColour('#2980B9');
  }
};
Arduino.forBlock['rm_bluetooth_read'] = function(block) {
  Arduino.setups_['serial_bt'] = 'Serial1.begin(9600);';
  return ['Serial1.readString()', Arduino.ORDER_ATOMIC];
};

// =========================================================
// 8. MOTORES L298N (Configurables)
// =========================================================

Blockly.Blocks['motor_setup'] = {
    init: function () {
        this.appendDummyInput().appendField("Configurar Motor L298N");
        this.appendDummyInput().appendField("Nombre").appendField(new Blockly.FieldTextInput("Motor1"), "MOTOR_NAME");
        this.appendDummyInput().appendField("IN1").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'IN1');
        this.appendDummyInput().appendField("IN2").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'IN2');
        this.appendDummyInput().appendField("EN").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'EN');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#E67E22');
    }
};

Arduino.forBlock['motor_setup'] = function(block) {
  const motorName = block.getFieldValue('MOTOR_NAME') || 'Motor1';
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const en = block.getFieldValue('EN');

  const cleanName = motorName.replace(/[^a-zA-Z0-9_]/g, '');

  Arduino.definitions_['motor_pins_' + cleanName] = `
const int ${cleanName}_IN1 = ${in1};
const int ${cleanName}_IN2 = ${in2};
const int ${cleanName}_EN = ${en};
`;

  Arduino.setups_['motor_setup_' + cleanName] = `
  pinMode(${cleanName}_IN1, OUTPUT);
  pinMode(${cleanName}_IN2, OUTPUT);
  pinMode(${cleanName}_EN, OUTPUT);
`;
  return '';
};

Blockly.Blocks['motor_run'] = {
    init: function () {
        this.appendDummyInput().appendField("Mover Motor");
        this.appendDummyInput().appendField("Nombre").appendField(new Blockly.FieldTextInput("Motor1"), "MOTOR_NAME");
        this.appendDummyInput().appendField("Dirección").appendField(new Blockly.FieldDropdown([["Adelante", "FORWARD"], ["Atrás", "BACKWARD"]]), "DIRECTION");
        this.appendValueInput("SPEED").setCheck("Number").appendField("Velocidad (0-255)");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#E67E22');
    }
};

Arduino.forBlock['motor_run'] = function(block) {
  const motorName = block.getFieldValue('MOTOR_NAME') || 'Motor1';
  const direction = block.getFieldValue('DIRECTION');
  const speed = Arduino.valueToCode(block, 'SPEED', Arduino.ORDER_ATOMIC) || '0';
  
  const cleanName = motorName.replace(/[^a-zA-Z0-9_]/g, '');

  let code = '';
  if (direction === 'FORWARD') {
    code += `digitalWrite(${cleanName}_IN1, HIGH);\n`;
    code += `digitalWrite(${cleanName}_IN2, LOW);\n`;
  } else {
    code += `digitalWrite(${cleanName}_IN1, LOW);\n`;
    code += `digitalWrite(${cleanName}_IN2, HIGH);\n`;
  }
  code += `analogWrite(${cleanName}_EN, ${speed});\n`;

  return code;
};

Blockly.Blocks['motor_stop'] = {
    init: function () {
        this.appendDummyInput().appendField("Parar Motor");
        this.appendDummyInput().appendField("Nombre").appendField(new Blockly.FieldTextInput("Motor1"), "MOTOR_NAME");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#E67E22');
    }
};

Arduino.forBlock['motor_stop'] = function(block) {
  const motorName = block.getFieldValue('MOTOR_NAME') || 'Motor1';
  const cleanName = motorName.replace(/[^a-zA-Z0-9_]/g, '');

  let code = '';
  code += `digitalWrite(${cleanName}_IN1, LOW);\n`;
  code += `digitalWrite(${cleanName}_IN2, LOW);\n`;
  code += `analogWrite(${cleanName}_EN, 0);\n`;

  return code;
};

// =========================================================
// 9. SENSORES Y DISPLAY
// =========================================================

// --- ULTRASONIDOS (HC-SR04) ---
Blockly.Blocks['ultrasonic_read'] = {
  init: function() {
    this.appendDummyInput().appendField("Sensor Ultrasonico");
    this.appendDummyInput().appendField("Trig").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'TRIG_PIN');
    this.appendDummyInput().appendField("Echo").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'ECHO_PIN');
    this.setOutput(true, "Number");
    this.setColour('#8E44AD');
  }
};
Arduino.forBlock['ultrasonic_read'] = function(block) {
  const trigPin = block.getFieldValue('TRIG_PIN');
  const echoPin = block.getFieldValue('ECHO_PIN');

  Arduino.setups_['ultrasonic_' + trigPin + '_' + echoPin] = `pinMode(${trigPin}, OUTPUT); pinMode(${echoPin}, INPUT);`;

  Arduino.definitions_['func_readUltrasonic'] = `
long readUltrasonicDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.034 / 2;
}`;

  return [`readUltrasonicDistance(${trigPin}, ${echoPin})`, Arduino.ORDER_ATOMIC];
};

// --- SENSOR DE COLOR (TCS3200) ---
Blockly.Blocks['color_sensor_read'] = {
    init: function () {
        this.appendDummyInput().appendField("Sensor Color (TCS3200)");
        this.appendDummyInput().appendField("S0").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'S0');
        this.appendDummyInput().appendField("S1").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'S1');
        this.appendDummyInput().appendField("S2").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'S2');
        this.appendDummyInput().appendField("S3").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'S3');
        this.appendDummyInput().appendField("OUT").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'OUT');
        this.appendDummyInput().appendField("Componente").appendField(new Blockly.FieldDropdown([['Rojo', 'RED'], ['Verde', 'GREEN'], ['Azul', 'BLUE']]), 'COLOR_COMP');
        this.setOutput(true, "Number");
        this.setColour('#F1C40F');
    }
};

Arduino.forBlock['color_sensor_read'] = function(block) {
    const s0 = block.getFieldValue('S0');
    const s1 = block.getFieldValue('S1');
    const s2 = block.getFieldValue('S2');
    const s3 = block.getFieldValue('S3');
    const out = block.getFieldValue('OUT');
    const colorComp = block.getFieldValue('COLOR_COMP');

    // Configuración Inicial en Setup
    Arduino.setups_['color_sensor_init_' + out] = `
  pinMode(${s0}, OUTPUT);
  pinMode(${s1}, OUTPUT);
  pinMode(${s2}, OUTPUT);
  pinMode(${s3}, OUTPUT);
  pinMode(${out}, INPUT);
  digitalWrite(${s0}, HIGH); // Frequency 20%
  digitalWrite(${s1}, LOW);
`;

    // Filtros según componente
    let filterCode = '';
    if (colorComp === 'RED') {
        filterCode = `digitalWrite(${s2}, LOW); digitalWrite(${s3}, LOW);`;
    } else if (colorComp === 'GREEN') {
        filterCode = `digitalWrite(${s2}, HIGH); digitalWrite(${s3}, HIGH);`;
    } else if (colorComp === 'BLUE') {
        filterCode = `digitalWrite(${s2}, LOW); digitalWrite(${s3}, HIGH);`;
    }

    // Definición de función única por componente
    const funcName = `readColor_${colorComp}`;
    Arduino.definitions_['func_' + funcName] = `
int ${funcName}(int s2, int s3, int out) {
  ${filterCode}
  return pulseIn(out, LOW);
}`;

    return [`${funcName}(${s2}, ${s3}, ${out})`, Arduino.ORDER_ATOMIC];
};

// --- SENSOR DE SONIDO ---
Blockly.Blocks['sound_sensor_read'] = {
    init: function () {
        this.appendDummyInput().appendField("Sensor Sonido");
        this.appendDummyInput().appendField("Pin").appendField(new Blockly.FieldDropdown(ANALOG_PINS), 'PIN');
        this.setOutput(true, "Number");
        this.setColour('#8E44AD');
    }
};
Arduino.forBlock['sound_sensor_read'] = function (block) {
    const pin = block.getFieldValue('PIN');
    return ['analogRead(' + pin + ')', Arduino.ORDER_ATOMIC];
};

// --- DISPLAY 8x8 (MAX7219) ---
Blockly.Blocks['display_8x8_setup'] = {
  init: function() {
    this.appendDummyInput().appendField("Configurar Matriz 8x8");
    this.appendDummyInput().appendField("DIN").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'DIN');
    this.appendDummyInput().appendField("CLK").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'CLK');
    this.appendDummyInput().appendField("CS").appendField(new Blockly.FieldDropdown(DIGITAL_PINS), 'CS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#D35400');
  }
};

Arduino.forBlock['display_8x8_setup'] = function(block) {
  const din = block.getFieldValue('DIN');
  const clk = block.getFieldValue('CLK');
  const cs = block.getFieldValue('CS');

  Arduino.definitions_['display_8x8_pins'] = `
const int DIN_PIN = ${din};
const int CLK_PIN = ${clk};
const int CS_PIN = ${cs};
`;

  Arduino.definitions_['func_max7219_write'] = `
void max7219_write(int din, int clk, int cs, byte address, byte data) {
  digitalWrite(cs, LOW);
  shiftOut(din, clk, MSBFIRST, address);
  shiftOut(din, clk, MSBFIRST, data);
  digitalWrite(cs, HIGH);
}
`;

  Arduino.setups_['display_8x8_init'] = `
  pinMode(DIN_PIN, OUTPUT);
  pinMode(CLK_PIN, OUTPUT);
  pinMode(CS_PIN, OUTPUT);
  max7219_write(DIN_PIN, CLK_PIN, CS_PIN, 0x09, 0x00);
  max7219_write(DIN_PIN, CLK_PIN, CS_PIN, 0x0B, 0x07);
  max7219_write(DIN_PIN, CLK_PIN, CS_PIN, 0x0C, 0x01);
  max7219_write(DIN_PIN, CLK_PIN, CS_PIN, 0x0A, 0x0F);
  max7219_write(DIN_PIN, CLK_PIN, CS_PIN, 0x0F, 0x00);
`;

  return '';
};

Blockly.Blocks['display_8x8_draw'] = {
  init: function() {
    this.appendDummyInput().appendField("Dibujar Fila Matriz");
    this.appendValueInput("ROW").setCheck("Number").appendField("Fila (0-7)");
    this.appendValueInput("BITMAP").setCheck("Number").appendField("Bits (0-255)");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#D35400');
  }
};

Arduino.forBlock['display_8x8_draw'] = function(block) {
  const row = Arduino.valueToCode(block, 'ROW', Arduino.ORDER_ATOMIC) || '0';
  const bitmap = Arduino.valueToCode(block, 'BITMAP', Arduino.ORDER_ATOMIC) || '0';
  return `max7219_write(DIN_PIN, CLK_PIN, CS_PIN, ${row} + 1, ${bitmap});\n`;
};

export default Arduino;