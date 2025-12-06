<script setup>
import EditorBlockly from './components/EditorBlockly.vue';
</script>

<template>
  <EditorBlockly />
</template>

<style>
/* Reseteamos márgenes para que no haya bordes blancos feos */
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden; /* Evita barras de scroll dobles */
}
#app {
  height: 100%;
}
</style>