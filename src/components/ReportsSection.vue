<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps<{
  patientId: string
}>()

const reports = ref<any[]>([])
const loading = ref(false)
const generating = ref(false)
const selectedReport = ref<any>(null)
const showReportDialog = ref(false)

onMounted(() => {
  fetchReports()
})

async function fetchReports() {
  loading.value = true
  try {
    const response = await axios.get(`/api/reports/patient/${props.patientId}`)
    reports.value = response.data
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error)
  } finally {
    loading.value = false
  }
}

async function generateReport() {
  generating.value = true
  try {
    // TODO: Pegar ID do usuário logado
    const conductedBy = 'cm5p00000000008l6a0a0a0a0' // ID temporário

    const response = await axios.post('/api/reports/generate/sync', {
      patientId: props.patientId,
      conductedBy,
    })

    reports.value.unshift(response.data)
    selectedReport.value = response.data
    showReportDialog.value = true

    alert('Relatório gerado com sucesso!')
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error)
    alert('Erro ao gerar relatório: ' + error.message)
  } finally {
    generating.value = false
  }
}

function viewReport(report: any) {
  selectedReport.value = report
  showReportDialog.value = true
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'grey',
    PENDING_REVIEW: 'orange',
    APPROVED: 'green',
    SENT: 'blue',
  }
  return colors[status] || 'grey'
}

function getStatusText(status: string) {
  const texts: Record<string, string> = {
    DRAFT: 'Rascunho',
    PENDING_REVIEW: 'Aguardando Revisão',
    APPROVED: 'Aprovado',
    SENT: 'Enviado',
  }
  return texts[status] || status
}
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-file-document" class="mr-2" color="primary"></v-icon>
        <span>Relatórios</span>
      </div>
      <v-btn
        color="primary"
        size="small"
        prepend-icon="mdi-auto-fix"
        @click="generateReport"
        :loading="generating"
      >
        Gerar Relatório com IA
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text v-if="loading && reports.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <p class="mt-4">Carregando relatórios...</p>
    </v-card-text>

    <v-card-text v-else-if="reports.length === 0" class="text-center py-12">
      <v-icon icon="mdi-file-document-outline" size="64" color="grey"></v-icon>
      <p class="mt-4 text-grey">Nenhum relatório gerado</p>
      <v-btn
        color="primary"
        class="mt-4"
        @click="generateReport"
        :loading="generating"
      >
        Gerar Primeiro Relatório
      </v-btn>
    </v-card-text>

    <v-list v-else>
      <v-list-item
        v-for="report in reports"
        :key="report.id"
        @click="viewReport(report)"
        class="py-4"
      >
        <template v-slot:prepend>
          <v-avatar :color="getStatusColor(report.status)">
            <v-icon icon="mdi-file-document"></v-icon>
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-bold mb-2">
          Relatório - {{ new Date(report.createdAt).toLocaleDateString('pt-BR') }}
        </v-list-item-title>

        <v-list-item-subtitle class="mb-2">
          <v-chip
            :color="getStatusColor(report.status)"
            size="small"
            class="mr-2"
          >
            {{ getStatusText(report.status) }}
          </v-chip>

          <v-chip
            v-if="report.aiGenerated"
            size="small"
            color="purple"
            prepend-icon="mdi-robot"
          >
            Gerado por IA
          </v-chip>
        </v-list-item-subtitle>

        <v-list-item-subtitle v-if="report.consultation">
          Consulta: {{ new Date(report.consultation.date).toLocaleDateString('pt-BR') }}
        </v-list-item-subtitle>

        <template v-slot:append>
          <v-btn
            icon="mdi-eye"
            variant="text"
            color="primary"
          >
            <v-icon>mdi-eye</v-icon>
            <v-tooltip activator="parent">Ver Relatório</v-tooltip>
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <!-- Dialog Visualizar Relatório -->
    <v-dialog v-model="showReportDialog" max-width="900" scrollable>
      <v-card v-if="selectedReport">
        <v-card-title class="bg-primary text-white d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon icon="mdi-file-document" class="mr-2"></v-icon>
            <span>Relatório - {{ new Date(selectedReport.createdAt).toLocaleDateString('pt-BR') }}</span>
          </div>
          <v-chip
            :color="getStatusColor(selectedReport.status)"
            size="small"
          >
            {{ getStatusText(selectedReport.status) }}
          </v-chip>
        </v-card-title>

        <v-card-text class="pa-6" style="max-height: 70vh">
          <div v-if="selectedReport.fullReportContent" class="report-content">
            <!-- Renderizar Markdown como texto formatado -->
            <pre style="white-space: pre-wrap; font-family: inherit;">{{ selectedReport.fullReportContent }}</pre>
          </div>

          <v-alert v-else type="info" class="mt-4">
            Relatório em processamento...
          </v-alert>

          <v-divider class="my-6"></v-divider>

          <div v-if="selectedReport.mainFindings">
            <h3 class="text-h6 mb-3">Achados Principais</h3>
            <v-chip
              v-for="(finding, index) in JSON.parse(selectedReport.mainFindings)"
              :key="index"
              class="mr-2 mb-2"
              color="error"
              variant="outlined"
            >
              {{ finding }}
            </v-chip>
          </div>

          <div v-if="selectedReport.supplementation" class="mt-6">
            <h3 class="text-h6 mb-3">
              <v-icon icon="mdi-pill" class="mr-2"></v-icon>
              Suplementação
            </h3>
            <v-list density="compact">
              <v-list-item
                v-for="(supp, index) in JSON.parse(selectedReport.supplementation)"
                :key="index"
                prepend-icon="mdi-checkbox-marked-circle"
              >
                {{ supp }}
              </v-list-item>
            </v-list>
          </div>

          <div v-if="selectedReport.phytotherapy" class="mt-6">
            <h3 class="text-h6 mb-3">
              <v-icon icon="mdi-leaf" class="mr-2"></v-icon>
              Fitoterapia
            </h3>
            <v-list density="compact">
              <v-list-item
                v-for="(phyto, index) in JSON.parse(selectedReport.phytotherapy)"
                :key="index"
                prepend-icon="mdi-checkbox-marked-circle"
              >
                {{ phyto }}
              </v-list-item>
            </v-list>
          </div>

          <div v-if="selectedReport.nutritionalGuidance" class="mt-6">
            <h3 class="text-h6 mb-3">
              <v-icon icon="mdi-food-apple" class="mr-2"></v-icon>
              Orientações Nutricionais
            </h3>
            <v-list density="compact">
              <v-list-item
                v-for="(guidance, index) in JSON.parse(selectedReport.nutritionalGuidance)"
                :key="index"
                prepend-icon="mdi-checkbox-marked-circle"
              >
                {{ guidance }}
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn @click="showReportDialog = false" variant="text">
            Fechar
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-download"
            disabled
          >
            Baixar PDF
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background-color 0.2s;
}

.v-list-item:hover {
  background-color: rgba(16, 185, 129, 0.05);
}

.v-list-item:last-child {
  border-bottom: none;
}

.report-content {
  line-height: 1.8;
}
</style>
