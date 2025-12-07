import * as Blockly from 'blockly';

// =========================================================
// 1. CONFIGURACIÓN DEL GENERADOR C++ (ARDUINO)
// =========================================================
const Arduino = new Blockly.Generator('Arduino');

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
  var definitions = [];
  var variables = [];
  var setups = [];
  
  for (var name in Arduino.definitions_) definitions.push(Arduino.definitions_[name]);
  for (var name in Arduino.variables_) variables.push(Arduino.variables_[name]);
  for (var name in Arduino.setups_) setups.push(Arduino.setups_[name]);
  
  var allDefs = definitions.join('\n');
  var allVars = variables.join('\n');
  var allSetups = 'void setup() {\n  ' + setups.join('\n  ') + '\n}\n\n';
  var allLoop = 'void loop() {\n' + code + '\n}';
  
  return '// Generado por RoboticMinds IDE\n\n' + allDefs + '\n' + allVars + '\n' + allSetups + allLoop;
};

Arduino.scrub_ = function(block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = opt_thisOnly ? '' : Arduino.workspaceToCode(nextBlock);
  return code + nextCode;
};

// =========================================================
// 2. SISTEMA (INICIO)
// =========================================================
Blockly.Blocks['arduino_start'] = {
  init: function() {
    this.appendDummyInput().appendField("🚀 INICIO PROGRAMA");
    this.appendStatementInput("LOOP").setCheck(null).appendField("Ejecutar siempre");
    this.setColour(230);
    this.setDeletable(false);
  }
};
Arduino.forBlock['arduino_start'] = function(block) {
  return Arduino.statementToCode(block, 'LOOP');
};

// =========================================================
// 3. LÓGICA & CONTROL
// =========================================================
Arduino.forBlock['controls_if'] = function(block) {
  var n = 0;
  var code = '', branchCode, conditionCode;
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
  var OPERATORS = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var argument0 = Arduino.valueToCode(block, 'A', Arduino.ORDER_EQUALITY) || '0';
  var argument1 = Arduino.valueToCode(block, 'B', Arduino.ORDER_EQUALITY) || '0';
  return [argument0 + ' ' + operator + ' ' + argument1, Arduino.ORDER_EQUALITY];
};

Arduino.forBlock['logic_operation'] = function(block) {
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var argument0 = Arduino.valueToCode(block, 'A', Arduino.ORDER_LOGICAL_AND) || 'false';
  var argument1 = Arduino.valueToCode(block, 'B', Arduino.ORDER_LOGICAL_AND) || 'false';
  return [argument0 + ' ' + operator + ' ' + argument1, Arduino.ORDER_LOGICAL_AND];
};

Arduino.forBlock['logic_negate'] = function(block) {
  var argument0 = Arduino.valueToCode(block, 'BOOL', Arduino.ORDER_UNARY_PREFIX) || 'true';
  return ['!' + argument0, Arduino.ORDER_UNARY_PREFIX];
};

Arduino.forBlock['logic_boolean'] = function(block) {
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['logic_null'] = function(block) {
  return ['NULL', Arduino.ORDER_ATOMIC];
};

Arduino.forBlock['logic_ternary'] = function(block) {
  var value_if = Arduino.valueToCode(block, 'IF', Arduino.ORDER_CONDITIONAL) || 'false';
  var value_then = Arduino.valueToCode(block, 'THEN', Arduino.ORDER_CONDITIONAL) || 'null';
  var value_else = Arduino.valueToCode(block, 'ELSE', Arduino.ORDER_CONDITIONAL) || 'null';
  return [value_if + ' ? ' + value_then + ' : ' + value_else, Arduino.ORDER_CONDITIONAL];
};

Arduino.forBlock['controls_repeat_ext'] = function(block) {
  var repeats = Arduino.valueToCode(block, 'TIMES', Arduino.ORDER_ASSIGNMENT) || '0';
  var branch = Arduino.statementToCode(block, 'DO');
  return 'for (int i = 0; i < ' + repeats + '; i++) {\n' + branch + '}\n';
};

Arduino.forBlock['controls_whileUntil'] = function(block) {
  var mode = block.getFieldValue('MODE');
  var until = mode == 'UNTIL';
  var argument0 = Arduino.valueToCode(block, 'BOOL', until ? Arduino.ORDER_LOGICAL_NOT : Arduino.ORDER_NONE) || 'false';
  var branch = Arduino.statementToCode(block, 'DO');
  if (until) argument0 = '!' + argument0;
  return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

Arduino.forBlock['controls_for'] = function(block) {
  var variable0 = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  var argument0 = Arduino.valueToCode(block, 'FROM', Arduino.ORDER_ASSIGNMENT) || '0';
  var argument1 = Arduino.valueToCode(block, 'TO', Arduino.ORDER_ASSIGNMENT) || '0';
  var increment = Arduino.valueToCode(block, 'BY', Arduino.ORDER_ASSIGNMENT) || '1';
  var branch = Arduino.statementToCode(block, 'DO');
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
  var OPERATORS = { 'ADD': [' + ', Arduino.ORDER_ADDITIVE], 'MINUS': [' - ', Arduino.ORDER_ADDITIVE], 'MULTIPLY': [' * ', Arduino.ORDER_MULTIPLICATIVE], 'DIVIDE': [' / ', Arduino.ORDER_MULTIPLICATIVE], 'POWER': [null, Arduino.ORDER_NONE] };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var argument0 = Arduino.valueToCode(block, 'A', tuple[1]) || '0';
  var argument1 = Arduino.valueToCode(block, 'B', tuple[1]) || '0';
  if (!operator) return ['pow(' + argument0 + ', ' + argument1 + ')', Arduino.ORDER_UNARY_POSTFIX];
  return [argument0 + operator + argument1, tuple[1]];
};

Arduino.forBlock['math_single'] = function(block) {
  var operator = block.getFieldValue('OP');
  var arg = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  var code;
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
  var operator = block.getFieldValue('OP');
  var arg = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  var code;
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
  var CONSTANTS = {'PI': ['PI', Arduino.ORDER_UNARY_POSTFIX], 'E': ['E', Arduino.ORDER_UNARY_POSTFIX], 'GOLDEN_RATIO': ['1.618', Arduino.ORDER_UNARY_POSTFIX], 'SQRT2': ['1.414', Arduino.ORDER_UNARY_POSTFIX], 'SQRT1_2': ['0.707', Arduino.ORDER_UNARY_POSTFIX], 'INFINITY': ['INFINITY', Arduino.ORDER_UNARY_POSTFIX]};
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

Arduino.forBlock['math_number_property'] = function(block) {
  var number_to_check = Arduino.valueToCode(block, 'NUMBER_TO_CHECK', Arduino.ORDER_MODULUS) || '0';
  var dropdown_property = block.getFieldValue('PROPERTY');
  var code;
  switch (dropdown_property) {
    case 'EVEN': code = '(int)' + number_to_check + ' % 2 == 0'; break;
    case 'ODD': code = '(int)' + number_to_check + ' % 2 == 1'; break;
    case 'POSITIVE': code = number_to_check + ' > 0'; break;
    case 'NEGATIVE': code = number_to_check + ' < 0'; break;
    case 'WHOLE': code = number_to_check + ' % 1 == 0'; break;
    case 'DIVISIBLE_BY':
      var divisor = Arduino.valueToCode(block, 'DIVISOR', Arduino.ORDER_MODULUS) || '0';
      code = '(int)' + number_to_check + ' % (int)' + divisor + ' == 0';
      break;
  }
  return [code, Arduino.ORDER_EQUALITY];
};

Arduino.forBlock['math_change'] = function(block) {
  var argument0 = Arduino.valueToCode(block, 'DELTA', Arduino.ORDER_ADDITIVE) || '0';
  var varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  return varName + ' += ' + argument0 + ';\n';
};

Arduino.forBlock['math_round'] = function(block) {
  var operator = block.getFieldValue('OP');
  var arg = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  var code;
  switch (operator) {
    case 'ROUND': code = 'round(' + arg + ')'; break;
    case 'ROUNDUP': code = 'ceil(' + arg + ')'; break;
    case 'ROUNDDOWN': code = 'floor(' + arg + ')'; break;
  }
  return [code, Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['math_modulo'] = function(block) {
  var argument0 = Arduino.valueToCode(block, 'DIVIDEND', Arduino.ORDER_MODULUS) || '0';
  var argument1 = Arduino.valueToCode(block, 'DIVISOR', Arduino.ORDER_MODULUS) || '0';
  return ['(int)' + argument0 + ' % (int)' + argument1, Arduino.ORDER_MODULUS];
};

Arduino.forBlock['math_constrain'] = function(block) {
  var argument0 = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '0';
  var argument1 = Arduino.valueToCode(block, 'LOW', Arduino.ORDER_NONE) || '0';
  var argument2 = Arduino.valueToCode(block, 'HIGH', Arduino.ORDER_NONE) || '0';
  return ['constrain(' + argument0 + ', ' + argument1 + ', ' + argument2 + ')', Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['math_random_int'] = function(block) {
  var argument0 = Arduino.valueToCode(block, 'FROM', Arduino.ORDER_NONE) || '0';
  var argument1 = Arduino.valueToCode(block, 'TO', Arduino.ORDER_NONE) || '0';
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
    this.setTooltip("Mapea un valor (0-1023) a un nuevo rango");
  }
};
Arduino.forBlock['math_map'] = function(block) {
  var value = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_NONE) || '0';
  var max = Arduino.valueToCode(block, 'MAX', Arduino.ORDER_NONE) || '255';
  return ['map(' + value + ', 0, 1023, 0, ' + max + ')', Arduino.ORDER_ATOMIC];
};

// =========================================================
// 5. VARIABLES Y TEXTO
// =========================================================
Arduino.forBlock['variables_get'] = function(block) {
  var varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  return [varName, Arduino.ORDER_ATOMIC];
};
Arduino.forBlock['variables_set'] = function(block) {
  var argument0 = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_ASSIGNMENT) || '0';
  var varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
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
  var argument0 = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_ASSIGNMENT) || '0';
  var varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  var type = block.getFieldValue('TYPE');
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
  var value = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_ATOMIC) || '0';
  var type = block.getFieldValue('TYPE');
  if (type === 'String') return ['String(' + value + ')', Arduino.ORDER_UNARY_POSTFIX];
  return ['(' + type + ') ' + value, Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['text'] = function(block) {
  return [JSON.stringify(block.getFieldValue('TEXT')), Arduino.ORDER_ATOMIC];
};
Arduino.forBlock['text_join'] = function(block) {
  var code;
  if (block.itemCount_ == 0) return ['""', Arduino.ORDER_ATOMIC];
  else if (block.itemCount_ == 1) return ['String(' + (Arduino.valueToCode(block, 'ADD0', Arduino.ORDER_NONE) || '""') + ')', Arduino.ORDER_UNARY_POSTFIX];
  else {
    code = 'String(' + (Arduino.valueToCode(block, 'ADD0', Arduino.ORDER_NONE) || '""') + ')';
    for (var n = 1; n < block.itemCount_; n++) code += ' + String(' + (Arduino.valueToCode(block, 'ADD' + n, Arduino.ORDER_NONE) || '""') + ')';
    return [code, Arduino.ORDER_UNARY_POSTFIX];
  }
};
Arduino.forBlock['text_append'] = function(block) {
  var varName = Blockly.Names.prototype.getName(block.getFieldValue('VAR'), 'VARIABLE');
  var value = Arduino.valueToCode(block, 'TEXT', Arduino.ORDER_NONE) || '""';
  return varName + ' += String(' + value + ');\n';
};
Arduino.forBlock['text_length'] = function(block) {
  var text = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '""';
  return ['String(' + text + ').length()', Arduino.ORDER_UNARY_POSTFIX];
};
Arduino.forBlock['text_isEmpty'] = function(block) {
  var text = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '""';
  return ['String(' + text + ').length() == 0', Arduino.ORDER_EQUALITY];
};
Arduino.forBlock['text_print'] = function(block) {
  var msg = Arduino.valueToCode(block, 'TEXT', Arduino.ORDER_NONE) || '""';
  Arduino.setups_['serial_begin'] = 'Serial.begin(9600);';
  return 'Serial.println(' + msg + ');\n';
};

// =========================================================
// 6. FUNCIONES
// =========================================================
Arduino.forBlock['procedures_defnoreturn'] = function(block) {
  var funcName = Blockly.Names.prototype.getName(block.getFieldValue('NAME'), 'PROCEDURE');
  var branch = Arduino.statementToCode(block, 'STACK');
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    var argName = Blockly.Names.prototype.getName(block.arguments_[i], 'VARIABLE');
    args.push('float ' + argName);
    Arduino.variables_[argName] = ''; 
  }
  var code = 'void ' + funcName + '(' + args.join(', ') + ') {\n' + branch + '}\n';
  Arduino.definitions_['%' + funcName] = code;
  return null;
};

Arduino.forBlock['procedures_defreturn'] = function(block) {
  var funcName = Blockly.Names.prototype.getName(block.getFieldValue('NAME'), 'PROCEDURE');
  var branch = Arduino.statementToCode(block, 'STACK');
  var returnValue = Arduino.valueToCode(block, 'RETURN', Arduino.ORDER_NONE) || '';
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    var argName = Blockly.Names.prototype.getName(block.arguments_[i], 'VARIABLE');
    args.push('float ' + argName);
  }
  if (returnValue) returnValue = '  return ' + returnValue + ';\n';
  var code = 'float ' + funcName + '(' + args.join(', ') + ') {\n' + branch + returnValue + '}\n';
  Arduino.definitions_['%' + funcName] = code;
  return null;
};

Arduino.forBlock['procedures_callnoreturn'] = function(block) {
  var funcName = Blockly.Names.prototype.getName(block.getFieldValue('NAME'), 'PROCEDURE');
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = Arduino.valueToCode(block, 'ARG' + i, Arduino.ORDER_NONE) || '0';
  }
  return funcName + '(' + args.join(', ') + ');\n';
};

Arduino.forBlock['procedures_callreturn'] = function(block) {
  var funcName = Blockly.Names.prototype.getName(block.getFieldValue('NAME'), 'PROCEDURE');
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = Arduino.valueToCode(block, 'ARG' + i, Arduino.ORDER_NONE) || '0';
  }
  return [funcName + '(' + args.join(', ') + ')', Arduino.ORDER_UNARY_POSTFIX];
};

Arduino.forBlock['procedures_ifreturn'] = function(block) {
  var condition = Arduino.valueToCode(block, 'CONDITION', Arduino.ORDER_NONE) || 'false';
  var code = 'if (' + condition + ') {\n';
  if (block.hasReturnValue_) {
    var value = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '0';
    code += '  return ' + value + ';\n';
  } else {
    code += '  return;\n';
  }
  code += '}\n';
  return code;
};

// =========================================================
// 7. HARDWARE (INPUT/OUTPUT)
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
  var pin = block.getFieldValue('PIN');
  var state = block.getFieldValue('STATE');
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
  var pin = block.getFieldValue('PIN');
  Arduino.setups_['setup_pin_' + pin] = 'pinMode(' + pin + ', INPUT);';
  return ['digitalRead(' + pin + ')', Arduino.ORDER_ATOMIC];
};

Blockly.Blocks['analog_read'] = {
  init: function() {
    this.appendDummyInput().appendField("Leer Analógico PIN").appendField(new Blockly.FieldDropdown([["A0","A0"], ["A1","A1"], ["A2","A2"], ["A3","A3"]]), "PIN");
    this.setOutput(true, "Number");
    this.setColour(65);
  }
};
Arduino.forBlock['analog_read'] = function(block) {
  var pin = block.getFieldValue('PIN');
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
  var pin = block.getFieldValue('PIN');
  var value = Arduino.valueToCode(block, 'NUM', Arduino.ORDER_ATOMIC) || '0';
  Arduino.setups_['setup_pin_' + pin] = 'pinMode(' + pin + ', OUTPUT);';
  return 'analogWrite(' + pin + ', ' + value + ');\n';
};

// --- OTROS COMPONENTES ---
Blockly.Blocks['custom_delay'] = {
  init: function() {
    this.appendValueInput("DELAY_TIME").setCheck("Number").appendField("⏱️ Esperar (ms)");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
  }
};
Arduino.forBlock['custom_delay'] = function(block) {
  var delayTime = Arduino.valueToCode(block, 'DELAY_TIME', Arduino.ORDER_ATOMIC) || '1000';
  return 'delay(' + delayTime + ');\n';
};

Blockly.Blocks['play_tone'] = {
  init: function() {
    this.appendDummyInput().appendField("🎵 Reproducir Tono PIN").appendField(new Blockly.FieldNumber(8), "PIN").appendField("Frecuencia").appendField(new Blockly.FieldNumber(440), "FREQ");
    this.appendValueInput("DURATION").setCheck("Number").appendField("Duración (ms)");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
  }
};
Arduino.forBlock['play_tone'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var freq = block.getFieldValue('FREQ');
  var duration = Arduino.valueToCode(block, 'DURATION', Arduino.ORDER_ATOMIC) || '500';
  Arduino.setups_['setup_pin_' + pin] = 'pinMode(' + pin + ', OUTPUT);';
  return 'tone(' + pin + ', ' + freq + ', ' + duration + ');\n';
};

Blockly.Blocks['servo_move'] = {
  init: function() {
    this.appendDummyInput().appendField("Mover Servo PIN").appendField(new Blockly.FieldNumber(9), "PIN").appendField("Grados");
    this.appendValueInput("DEGREE").setCheck("Number");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
  }
};
Arduino.forBlock['servo_move'] = function(block) {
  var pin = block.getFieldValue('PIN');
  var degree = Arduino.valueToCode(block, 'DEGREE', Arduino.ORDER_ATOMIC) || '90';
  Arduino.definitions_['include_servo'] = '#include <Servo.h>';
  Arduino.definitions_['define_servo_' + pin] = 'Servo servo_' + pin + ';';
  Arduino.setups_['setup_servo_' + pin] = 'servo_' + pin + '.attach(' + pin + ');';
  return 'servo_' + pin + '.write(' + degree + ');\n';
};

Blockly.Blocks['serial_print'] = {
  init: function() {
    this.appendValueInput("CONTENT").setCheck(null).appendField("🖨️ Serial Imprimir");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
  }
};
Arduino.forBlock['serial_print'] = function(block) {
  var content = Arduino.valueToCode(block, 'CONTENT', Arduino.ORDER_ATOMIC) || '""';
  Arduino.setups_['serial_begin'] = 'Serial.begin(9600);';
  return 'Serial.println(' + content + ');\n';
};

Blockly.Blocks['rm_ultrasonic'] = {
  init: function() {
    this.appendDummyInput().appendField("🦇 Sensor Ultrasónico").appendField("Trig").appendField(new Blockly.FieldNumber(11), "TRIG").appendField("Echo").appendField(new Blockly.FieldNumber(12), "ECHO");
    this.setOutput(true, "Number");
    this.setColour('#8E44AD');
  }
};
Arduino.forBlock['rm_ultrasonic'] = function(block) {
  var trig = block.getFieldValue('TRIG');
  var echo = block.getFieldValue('ECHO');
  Arduino.definitions_['func_ultrasonic'] = 'long readUltrasonic(int trig, int echo) {\n  pinMode(trig, OUTPUT);\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  pinMode(echo, INPUT);\n  return pulseIn(echo, HIGH) * 0.034 / 2;\n}';
  return ['readUltrasonic(' + trig + ', ' + echo + ')', Arduino.ORDER_ATOMIC];
};

Blockly.Blocks['rm_motor'] = {
  init: function() {
    this.appendDummyInput().appendField("⚙️ Motor RM").appendField(new Blockly.FieldDropdown([["Motor A","A"], ["Motor B","B"]]), "MOTOR").appendField("Velocidad (-255 a 255)");
    this.appendValueInput("SPEED").setCheck("Number");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E67E22');
  }
};
Arduino.forBlock['rm_motor'] = function(block) {
  var motor = block.getFieldValue('MOTOR');
  var speed = Arduino.valueToCode(block, 'SPEED', Arduino.ORDER_ATOMIC) || '100';
  var pinDir = motor === 'A' ? 3 : 5;
  var pinPwm = motor === 'A' ? 4 : 6;
  Arduino.setups_['setup_motor_' + motor] = `pinMode(${pinDir}, OUTPUT); pinMode(${pinPwm}, OUTPUT);`;
  return `analogWrite(${pinPwm}, abs(${speed})); digitalWrite(${pinDir}, ${speed} > 0 ? HIGH : LOW);\n`;
};

Blockly.Blocks['rm_bluetooth_read'] = {
  init: function() {
    this.appendDummyInput().appendField("🔵 Leer Dato Bluetooth");
    this.setOutput(true, "String");
    this.setColour('#2980B9');
  }
};
Arduino.forBlock['rm_bluetooth_read'] = function(block) {
  Arduino.setups_['serial_bt'] = 'Serial1.begin(9600);';
  return ['Serial1.readString()', Arduino.ORDER_ATOMIC];
};

Blockly.Blocks['rm_wifi_connect'] = {
  init: function() {
    this.appendDummyInput().appendField("📡 Conectar Wifi").appendField("SSID").appendField(new Blockly.FieldTextInput("MiRed"), "SSID").appendField("Pass").appendField(new Blockly.FieldTextInput("1234"), "PASS");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#27AE60');
  }
};
Arduino.forBlock['rm_wifi_connect'] = function(block) {
  var ssid = block.getFieldValue('SSID');
  var pass = block.getFieldValue('PASS');
  Arduino.definitions_['include_wifi'] = '#include <WiFi.h>';
  return `WiFi.begin("${ssid}", "${pass}");\n`;
};

export default Arduino;