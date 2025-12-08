/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';

const Arduino = new Blockly.Generator('Arduino');

/**
 * Palabras reservadas de Arduino C++ para evitar conflictos con variables
 */
Arduino.addReservedWords(
    'setup,loop,if,else,for,switch,case,while,do,break,continue,return,goto,' +
    'define,include,HIGH,LOW,INPUT,OUTPUT,INPUT_PULLUP,true,false,integer,' +
    'constants,floating,point,void,book,boolean,char,class,const,double,enum,' +
    'explicit,extern,float,friend,inline,int,long,mutable,new,operator,private,' +
    'protected,public,register,short,signed,sizeof,static,struct,template,' +
    'this,throw,try,typedef,union,unsigned,virtual,void,volatile,while,' +
    'setup,loop,delay,pinMode,digitalWrite,digitalRead,analogWrite,analogRead,' +
    'Serial,begin,print,println,available,read,write,flush,peek,end');

/**
 * Orden de precedencia de operadores (Estilo C++)
 */
Arduino.ORDER_ATOMIC = 0;         // 0 "" ...
Arduino.ORDER_UNARY_POSTFIX = 1;  // ++ --
Arduino.ORDER_UNARY_PREFIX = 2;   // + - ! ~
Arduino.ORDER_MULTIPLICATIVE = 3; // * / %
Arduino.ORDER_ADDITIVE = 4;       // + -
Arduino.ORDER_SHIFT = 5;          // << >>
Arduino.ORDER_RELATIONAL = 6;     // < > <= >=
Arduino.ORDER_EQUALITY = 7;       // == !=
Arduino.ORDER_BITWISE_AND = 8;    // &
Arduino.ORDER_BITWISE_XOR = 9;    // ^
Arduino.ORDER_BITWISE_OR = 10;    // |
Arduino.ORDER_LOGICAL_AND = 11;   // &&
Arduino.ORDER_LOGICAL_OR = 12;    // ||
Arduino.ORDER_CONDITIONAL = 13;   // ? :
Arduino.ORDER_ASSIGNMENT = 14;    // = += -= ...
Arduino.ORDER_COMMA = 15;         // ,
Arduino.ORDER_NONE = 99;          // (...)

/**
 * Inicialización del estado del generador.
 * Se llama antes de generar código para limpiar definiciones previas.
 */
Arduino.init = function(workspace) {
  // Diccionario para definiciones globales (#include, variables globales)
  Arduino.definitions_ = Object.create(null);
  // Diccionario para funciones auxiliares
  Arduino.functionNames_ = Object.create(null);
  // Diccionario para código de configuración (dentro de setup())
  Arduino.setups_ = Object.create(null);
  
  if (!Arduino.nameDB_) {
    Arduino.nameDB_ = new Blockly.Names(Arduino.RESERVED_WORDS_);
  } else {
    Arduino.nameDB_.reset();
  }

  Arduino.nameDB_.setVariableMap(workspace.getVariableMap());

  // Definición de variables globales
  const defvars = [];
  const variables = workspace.getAllVariables();
  for (let i = 0; i < variables.length; i++) {
    // Usamos el string explícito 'VARIABLE' para evitar problemas con constantes indefinidas
    const varName = Arduino.nameDB_.getName(variables[i].getId(), 'VARIABLE');
    // Por defecto las inicializamos como float para evitar errores de tipo en bloques matemáticos
    defvars.push('float ' + varName + ' = 0;');
  }
  if (defvars.length > 0) {
      Arduino.definitions_['variables'] = defvars.join('\n');
  }
};

/**
 * Finalización: Ensambla todo el código en la estructura de Arduino (.ino)
 */
Arduino.finish = function(code) {
  // 1. Definiciones Globales (Includes, Variables, Funciones auxiliares)
  const definitions = [];
  for (const name in Arduino.definitions_) {
    definitions.push(Arduino.definitions_[name]);
  }
  
  // 2. Setup (pinMode, Serial.begin)
  const setups = [];
  for (const name in Arduino.setups_) {
    setups.push(Arduino.setups_[name]);
  }

  // CONSTRUCCIÓN DEL CÓDIGO FINAL
  let ret = '';
  
  // Headers y Globales
  if (definitions.length > 0) {
      ret += definitions.join('\n') + '\n\n';
  }
  
  // Función Setup
  ret += 'void setup() {\n';
  if (setups.length > 0) {
      ret += '  ' + setups.join('\n  ') + '\n';
  }
  ret += '}\n\n';
  
  // Función Loop
  ret += 'void loop() {\n';
  ret += code;
  ret += '}\n';

  return ret;
};

/**
 * Manejo de bloques sueltos
 */
Arduino.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Función auxiliar para escapar strings
 */
Arduino.quote_ = function(string) {
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/'/g, '\\\'');
  return '\"' + string + '\"';
};

/**
 * Función principal de recorrido (Scrub)
 * Conecta los bloques en secuencia.
 */
Arduino.scrub_ = function(block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = opt_thisOnly ? '' : Arduino.blockToCode(nextBlock);
  return code + nextCode;
};

// =============================================================================
//                             GENERADORES DE BLOQUES ESTÁNDAR
// =============================================================================

// --- LÓGICA ---
Arduino['controls_if'] = function(block) {
  let n = 0;
  let code = '', branchCode, conditionCode;
  do {
    conditionCode = Arduino.valueToCode(block, 'IF' + n,
      Arduino.ORDER_NONE) || 'false';
    branchCode = Arduino.statementToCode(block, 'DO' + n);
    code += (n > 0 ? ' else ' : '') +
        'if (' + conditionCode + ') {\n' + branchCode + '}';
    ++n;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE')) {
    branchCode = Arduino.statementToCode(block, 'ELSE');
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

Arduino['logic_compare'] = function(block) {
  const OPERATORS = {
    'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>='
  };
  const operator = OPERATORS[block.getFieldValue('OP')];
  const order = (operator == '==' || operator == '!=') ?
      Arduino.ORDER_EQUALITY : Arduino.ORDER_RELATIONAL;
  const argument0 = Arduino.valueToCode(block, 'A', order) || '0';
  const argument1 = Arduino.valueToCode(block, 'B', order) || '0';
  const code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Arduino['logic_operation'] = function(block) {
    const operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
    const order = (operator == '&&') ? Arduino.ORDER_LOGICAL_AND :
        Arduino.ORDER_LOGICAL_OR;
    const argument0 = Arduino.valueToCode(block, 'A', order) || 'false';
    const argument1 = Arduino.valueToCode(block, 'B', order) || 'false';
    const code = argument0 + ' ' + operator + ' ' + argument1;
    return [code, order];
};

Arduino['logic_boolean'] = function(block) {
    const code = (block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false';
    return [code, Arduino.ORDER_ATOMIC];
};

Arduino['logic_negate'] = function(block) {
    const order = Arduino.ORDER_UNARY_PREFIX;
    const argument0 = Arduino.valueToCode(block, 'BOOL', order) || 'false';
    const code = '!' + argument0;
    return [code, order];
};

// --- BUCLES ---
Arduino['controls_repeat_ext'] = function(block) {
    const repeats = Arduino.valueToCode(block, 'TIMES',
        Arduino.ORDER_ADDITIVE) || '0';
    const branch = Arduino.statementToCode(block, 'DO');
    // Usamos 'VARIABLE' explícitamente para el nombre del contador
    const loopVar = Arduino.nameDB_.getDistinctName('count', 'VARIABLE');
    const code = 'for (int ' + loopVar + ' = 0; ' + loopVar + ' < ' + repeats + '; ' + loopVar + '++) {\n' +
        branch + '}\n';
    return code;
};

Arduino['controls_whileUntil'] = function(block) {
    const until = block.getFieldValue('MODE') == 'UNTIL';
    let argument0 = Arduino.valueToCode(block, 'BOOL',
        until ? Arduino.ORDER_LOGICAL_NOT :
        Arduino.ORDER_NONE) || 'false';
    const branch = Arduino.statementToCode(block, 'DO');
    if (until) {
      argument0 = '!' + argument0;
    }
    return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

Arduino['controls_for'] = function(block) {
    const variable0 = Arduino.nameDB_.getName(
        block.getFieldValue('VAR'), 'VARIABLE');
    const argument0 = Arduino.valueToCode(block, 'FROM',
        Arduino.ORDER_ASSIGNMENT) || '0';
    const argument1 = Arduino.valueToCode(block, 'TO',
        Arduino.ORDER_ASSIGNMENT) || '0';
    const increment = Arduino.valueToCode(block, 'BY',
        Arduino.ORDER_ASSIGNMENT) || '1';
    const branch = Arduino.statementToCode(block, 'DO');
    
    const code = 'for (' + variable0 + ' = ' + argument0 + '; ' +
        variable0 + ' <= ' + argument1 + '; ' +
        variable0 + ' += ' + increment + ') {\n' +
        branch + '}\n';
    return code;
};

// --- MATEMÁTICAS ---
Arduino['math_number'] = function(block) {
  const code = parseFloat(block.getFieldValue('NUM'));
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino['math_arithmetic'] = function(block) {
  const OPERATORS = {
    'ADD': [' + ', Arduino.ORDER_ADDITIVE],
    'MINUS': [' - ', Arduino.ORDER_ADDITIVE],
    'MULTIPLY': [' * ', Arduino.ORDER_MULTIPLICATIVE],
    'DIVIDE': [' / ', Arduino.ORDER_MULTIPLICATIVE],
    'POWER': [null, Arduino.ORDER_NONE]
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const argument0 = Arduino.valueToCode(block, 'A', order) || '0';
  const argument1 = Arduino.valueToCode(block, 'B', order) || '0';
  let code;
  if (!operator) {
    code = 'pow(' + argument0 + ', ' + argument1 + ')';
    return [code, Arduino.ORDER_UNARY_POSTFIX];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

Arduino['math_random_int'] = function(block) {
    const argument0 = Arduino.valueToCode(block, 'FROM', Arduino.ORDER_NONE) || '0';
    const argument1 = Arduino.valueToCode(block, 'TO', Arduino.ORDER_NONE) || '0';
    const code = 'random(' + argument0 + ', ' + argument1 + ' + 1)';
    return [code, Arduino.ORDER_UNARY_POSTFIX];
};

Arduino['math_map'] = function(block) {
    const value = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '0';
    const fromLow = Arduino.valueToCode(block, 'FROM_LOW', Arduino.ORDER_NONE) || '0';
    const fromHigh = Arduino.valueToCode(block, 'FROM_HIGH', Arduino.ORDER_NONE) || '1024';
    const toLow = Arduino.valueToCode(block, 'TO_LOW', Arduino.ORDER_NONE) || '0';
    const toHigh = Arduino.valueToCode(block, 'TO_HIGH', Arduino.ORDER_NONE) || '255';
    const code = 'map(' + value + ', ' + fromLow + ', ' + fromHigh + ', ' + toLow + ', ' + toHigh + ')';
    return [code, Arduino.ORDER_NONE];
}

// --- TEXTO ---
Arduino['text'] = function(block) {
  const code = Arduino.quote_(block.getFieldValue('TEXT'));
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino['text_print'] = function(block) {
  const msg = Arduino.valueToCode(block, 'TEXT', Arduino.ORDER_NONE) || '""';
  Arduino.setups_['setup_serial'] = 'Serial.begin(9600);';
  return 'Serial.println(' + msg + ');\n';
};

Arduino['text_join'] = function(block) {
    if (block.itemCount_ == 0) return ['""', Arduino.ORDER_ATOMIC];
    if (block.itemCount_ == 1) return [Arduino.valueToCode(block, 'ADD0', Arduino.ORDER_NONE) || '""', Arduino.ORDER_ATOMIC];
    
    let code = 'String(' + (Arduino.valueToCode(block, 'ADD0', Arduino.ORDER_ADDITIVE) || '""') + ')';
    for (let n = 1; n < block.itemCount_; n++) {
        code += ' + String(' + (Arduino.valueToCode(block, 'ADD' + n, Arduino.ORDER_ADDITIVE) || '""') + ')';
    }
    return [code, Arduino.ORDER_ADDITIVE];
};

// --- VARIABLES ---
Arduino['variables_get'] = function(block) {
  const code = Arduino.nameDB_.getName(block.getFieldValue('VAR'), 'VARIABLE');
  return [code, Arduino.ORDER_ATOMIC];
};

Arduino['variables_set'] = function(block) {
  const argument0 = Arduino.valueToCode(block, 'VALUE',
      Arduino.ORDER_ASSIGNMENT) || '0';
  const varName = Arduino.nameDB_.getName(block.getFieldValue('VAR'), 'VARIABLE');
  return varName + ' = ' + argument0 + ';\n';
};

// --- ENTRADA / SALIDA ---
Arduino['digital_write'] = function(block) {
    const pin = block.getFieldValue('PIN') || '13';
    const state = block.getFieldValue('STATE') || 'HIGH';
    Arduino.setups_['setup_output_' + pin] = 'pinMode(' + pin + ', OUTPUT);';
    return 'digitalWrite(' + pin + ', ' + state + ');\n';
};

Arduino['digital_read'] = function(block) {
    const pin = block.getFieldValue('PIN') || '2';
    Arduino.setups_['setup_input_' + pin] = 'pinMode(' + pin + ', INPUT);';
    return ['digitalRead(' + pin + ')', Arduino.ORDER_ATOMIC];
};

Arduino['analog_read'] = function(block) {
    const pin = block.getFieldValue('PIN') || 'A0';
    return ['analogRead(' + pin + ')', Arduino.ORDER_ATOMIC];
};

Arduino['analog_write'] = function(block) {
    const pin = block.getFieldValue('PIN') || '3';
    const val = Arduino.valueToCode(block, 'VALUE', Arduino.ORDER_NONE) || '0';
    Arduino.setups_['setup_output_' + pin] = 'pinMode(' + pin + ', OUTPUT);';
    return 'analogWrite(' + pin + ', ' + val + ');\n';
};

// =============================================================================
//               GENERADORES PERSONALIZADOS (RoboticMinds & Custom)
// =============================================================================

// Generador para el bloque "Esperar %1 ms"
Arduino['custom_delay'] = function(block) {
    let delayTime = block.getFieldValue('DELAY_MS');
    // Soporte tanto para campo numérico directo como para entrada conectada
    if (delayTime === undefined || delayTime === null) {
         delayTime = Arduino.valueToCode(block, 'DELAY_MS', Arduino.ORDER_NONE) || '1000';
    }
    return 'delay(' + delayTime + ');\n';
};

// Generador para Sensor Ultrasónico
Arduino['rm_ultrasonic'] = function(block) {
    const trig = block.getFieldValue('TRIG') || '2';
    const echo = block.getFieldValue('ECHO') || '3';
    
    // Inyectamos una función auxiliar para la lectura del sensor
    Arduino.definitions_['func_ultrasonic'] = `
long readUltrasonic(int trigPin, int echoPin) {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  return pulseIn(echoPin, HIGH) * 0.034 / 2;
}`;
    return ['readUltrasonic(' + trig + ', ' + echo + ')', Arduino.ORDER_ATOMIC];
};

// Generador para Motor DC
Arduino['rm_motor'] = function(block) {
    const pin1 = block.getFieldValue('PIN1') || '5';
    const pin2 = block.getFieldValue('PIN2') || '6';
    const speed = Arduino.valueToCode(block, 'SPEED', Arduino.ORDER_NONE) || '0';
    
    Arduino.setups_['setup_motor_' + pin1] = 'pinMode(' + pin1 + ', OUTPUT);';
    Arduino.setups_['setup_motor_' + pin2] = 'pinMode(' + pin2 + ', OUTPUT);';
    
    // Lógica básica para driver de motor (un pin PWM, el otro a tierra para dirección fija)
    // Se puede expandir para manejar dirección si el bloque cambia en el futuro
    return 'analogWrite(' + pin1 + ', ' + speed + ');\n' +
           'digitalWrite(' + pin2 + ', LOW);\n';
};

// Generador para Leer Bluetooth
Arduino['rm_bluetooth_read'] = function(block) {
    Arduino.setups_['setup_serial'] = 'Serial.begin(9600);';
    return ['Serial.read()', Arduino.ORDER_ATOMIC];
};

// Generador para Conexión WiFi (ESP32/ESP8266)
Arduino['rm_wifi_connect'] = function(block) {
    const ssid = Arduino.quote_(block.getFieldValue('SSID') || 'Network');
    const pass = Arduino.quote_(block.getFieldValue('PASSWORD') || '12345678');
    
    Arduino.definitions_['include_wifi'] = '#include <WiFi.h>'; // Nota: Cambiar a ESP8266WiFi.h si se usa esa placa
    
    return 'WiFi.begin(' + ssid + ', ' + pass + ');\n';
};

// Generador para el bloque contenedor "Start" (opcional si se usa setup/loop automático)
Arduino['arduino_start'] = function(block) {
    const statements_setup = Arduino.statementToCode(block, 'SETUP');
    const statements_loop = Arduino.statementToCode(block, 'LOOP');
    
    // Si el usuario usa este bloque, inyectamos su contenido.
    // El sistema `finish` envolverá todo en setup() y loop() de todas formas,
    // así que esto sirve para organizar bloques dentro del canvas.
    return '// -- Bloque Start --\n' + 
           '// Setup manual:\n' + statements_setup + 
           '// Loop manual:\n' + statements_loop; 
};

export default Arduino;