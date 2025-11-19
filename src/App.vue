<script setup lang="ts">
import { ref } from 'vue'

const drawer = ref(true)
</script>

<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Dra. Thayná Marra - Sistema de Gestão</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon>
        <v-icon>mdi-account</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer">
      <v-list>
        <v-list-item
          prepend-icon="mdi-home"
          title="Início"
          to="/home"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-account-group"
          title="Pacientes"
          to="/pacientes"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-calendar"
          title="Calendário"
          to="/calendario"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>
</style>
