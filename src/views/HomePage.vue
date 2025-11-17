<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import NewPatientDialog from '@/components/NewPatientDialog.vue'

const router = useRouter()
const showNewPatientDialog = ref(false)
const loading = ref(true)

const stats = ref([
  { title: 'Pacientes Cadastrados', value: 0, icon: 'mdi-account-group', color: 'primary' },
  { title: 'Consultas Este Mês', value: 0, icon: 'mdi-calendar-check', color: 'success' },
  { title: 'Relatórios Gerados', value: 0, icon: 'mdi-file-document', color: 'info' },
  { title: 'Exames Analisados', value: 0, icon: 'mdi-flask', color: 'warning' },
])

async function loadStats() {
  loading.value = true
  try {
    // Buscar pacientes (já vem com _count incluindo exams)
    const patientsResponse = await axios.get('/api/patients')
    const patientsCount = patientsResponse.data.length
    stats.value[0].value = patientsCount

    // Contar exames usando _count dos pacientes
    let examsCount = 0
    patientsResponse.data.forEach((patient: any) => {
      if (patient._count && patient._count.exams) {
        examsCount += patient._count.exams
      }
    })
    stats.value[3].value = examsCount

    // Buscar consultas deste mês
    const consultationsResponse = await axios.get('/api/consultations')
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const consultationsThisMonth = consultationsResponse.data.filter((c: any) => {
      const consultationDate = new Date(c.date)
      return consultationDate >= firstDayOfMonth
    })
    stats.value[1].value = consultationsThisMonth.length

    // Buscar relatórios
    const reportsResponse = await axios.get('/api/reports')
    const reportsCount = reportsResponse.data.length
    stats.value[2].value = reportsCount
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
  } finally {
    loading.value = false
  }
}

function handlePatientCreated(patient: any) {
  router.push(`/pacientes/${patient.id}`)
  loadStats()
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <v-container fluid class="pa-6">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h3 font-weight-bold mb-2">
          Bem-vinda, Dra. Thayná Marra
        </h1>
        <p class="text-subtitle-1 text-grey-darken-1">
          Sistema de Gestão de Pacientes e Análise de Exames com IA
        </p>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col
        v-for="stat in stats"
        :key="stat.title"
        cols="12"
        sm="6"
        md="3"
      >
        <v-card :color="stat.color" variant="tonal" class="pa-4" elevation="2">
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-h4 font-weight-bold">{{ stat.value }}</div>
                <div class="text-body-2 mt-1">{{ stat.title }}</div>
              </div>
              <v-icon :icon="stat.icon" size="48"></v-icon>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12" md="8">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon icon="mdi-chart-line" class="mr-2"></v-icon>
            Funcionalidades Principais
          </v-card-title>
          <v-card-text class="pa-6">
            <v-list>
              <v-list-item
                prepend-icon="mdi-microphone"
                title="Transcrição de Consultas"
                subtitle="Grave e transcreva automaticamente suas consultas com IA"
              ></v-list-item>
              <v-divider></v-divider>
              <v-list-item
                prepend-icon="mdi-flask-outline"
                title="Análise de Exames com IA"
                subtitle="Upload de PDFs e imagens com categorização automática"
              ></v-list-item>
              <v-divider></v-divider>
              <v-list-item
                prepend-icon="mdi-file-document-edit"
                title="Geração de Relatórios"
                subtitle="Relatórios profissionais gerados automaticamente"
              ></v-list-item>
              <v-divider></v-divider>
              <v-list-item
                prepend-icon="mdi-account-multiple"
                title="Gestão de Pacientes"
                subtitle="Histórico completo e organizado de cada paciente"
              ></v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-success">
            <v-icon icon="mdi-rocket-launch" class="mr-2"></v-icon>
            Ações Rápidas
          </v-card-title>
          <v-card-text class="pa-4">
            <v-btn
              block
              color="primary"
              size="large"
              prepend-icon="mdi-account-plus"
              class="mb-3"
              @click="showNewPatientDialog = true"
            >
              Novo Paciente
            </v-btn>
            <v-btn
              block
              color="success"
              size="large"
              prepend-icon="mdi-calendar-plus"
              class="mb-3"
              to="/pacientes"
            >
              Ver Pacientes
            </v-btn>
            <v-btn
              block
              color="info"
              size="large"
              prepend-icon="mdi-file-document-plus"
            >
              Novo Relatório
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card elevation="2" color="primary" variant="tonal">
          <v-card-text class="pa-4">
            <div class="text-center">
              <v-icon icon="mdi-instagram" size="48" class="mb-2"></v-icon>
              <div class="text-h6 font-weight-bold">@drathaynamarra</div>
              <div class="text-caption">Análise de Sangue Vivo</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <NewPatientDialog
      v-model="showNewPatientDialog"
      @patient-created="handlePatientCreated"
    />
  </v-container>
</template>

<style scoped>
</style>
