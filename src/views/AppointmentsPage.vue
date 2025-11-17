<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Agendamentos</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <AppointmentCalendar />
      </v-col>
    </v-row>

    <!-- Instruções de Configuração -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="blue">mdi-google</v-icon>
            Google Calendar
          </v-card-title>
          <v-card-text>
            <p class="mb-2">
              Sincronize automaticamente seus agendamentos com o Google Calendar.
            </p>
            <v-alert type="info" variant="tonal" density="compact">
              <strong>Como configurar:</strong>
              <ol class="mt-2">
                <li>Acesse <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></li>
                <li>Crie um novo projeto ou selecione um existente</li>
                <li>Ative a API do Google Calendar</li>
                <li>Crie credenciais OAuth 2.0</li>
                <li>Configure as variáveis de ambiente no servidor</li>
              </ol>
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="blue"
              variant="outlined"
              href="http://localhost:3001/api/appointments/auth/google"
              target="_blank"
            >
              Conectar Google Calendar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-apple</v-icon>
            Apple Calendar (iCloud)
          </v-card-title>
          <v-card-text>
            <p class="mb-2">
              Sincronize com o Apple Calendar usando CalDAV ou arquivos .ICS.
            </p>
            <v-alert type="info" variant="tonal" density="compact">
              <strong>Opções disponíveis:</strong>
              <ul class="mt-2">
                <li><strong>CalDAV:</strong> Sincronização automática bidirecional</li>
                <li><strong>Arquivo .ICS:</strong> Download manual para importar</li>
              </ul>
            </v-alert>
            <v-alert type="warning" variant="tonal" density="compact" class="mt-2">
              Para usar CalDAV, você precisa:
              <ul class="mt-2">
                <li>URL do servidor CalDAV do iCloud</li>
                <li>Senha de app específica</li>
                <li>Configurar variáveis de ambiente</li>
              </ul>
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn
              variant="outlined"
              href="http://localhost:3001/api/appointments/setup/apple"
              target="_blank"
            >
              Ver Instruções
            </v-btn>
            <v-spacer />
            <v-chip size="small" color="success">
              Download .ICS disponível
            </v-chip>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Estatísticas -->
    <v-row class="mt-4">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-h6">{{ stats.scheduled }}</div>
            <div class="text-caption text-grey">Agendados</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-h6">{{ stats.confirmed }}</div>
            <div class="text-caption text-grey">Confirmados</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-h6">{{ stats.completed }}</div>
            <div class="text-caption text-grey">Concluídos</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-h6">{{ stats.synced }}</div>
            <div class="text-caption text-grey">Sincronizados</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import AppointmentCalendar from '../components/AppointmentCalendar.vue'

const API_URL = 'http://localhost:3001/api'

const stats = ref({
  scheduled: 0,
  confirmed: 0,
  completed: 0,
  synced: 0,
})

async function loadStats() {
  try {
    const response = await axios.get(`${API_URL}/appointments`)
    const appointments = response.data

    stats.value = {
      scheduled: appointments.filter((a: any) => a.status === 'SCHEDULED').length,
      confirmed: appointments.filter((a: any) => a.status === 'CONFIRMED').length,
      completed: appointments.filter((a: any) => a.status === 'COMPLETED').length,
      synced: appointments.filter(
        (a: any) => a.googleEventId || a.appleEventId
      ).length,
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
  }
}

onMounted(() => {
  loadStats()
})
</script>
