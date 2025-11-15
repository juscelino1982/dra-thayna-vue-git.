<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import ConsultationSection from '@/components/ConsultationSection.vue'
import ReportsSection from '@/components/ReportsSection.vue'

const route = useRoute()
const router = useRouter()
const store = usePatientsStore()

const uploadDialog = ref(false)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const deleteExamDialog = ref(false)
const examToDelete = ref<string | null>(null)
const deleting = ref(false)
const processingDialog = ref(false)
const processingExam = ref<any | null>(null)
const processingStatus = ref<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('PENDING')
const processingMessage = ref('')
const processingError = ref<string | null>(null)
const processingElapsed = ref(0)
const processingManualLoading = ref(false)
const reprocessingExamId = ref<string | null>(null)

let processingPollInterval: ReturnType<typeof setInterval> | null = null
let processingElapsedInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const id = route.params.id as string
  store.fetchPatient(id)
})

const patient = computed(() => store.currentPatient)

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function calculateAge(birthDate?: Date) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function formatDate(date: Date | string) {
  if (!date) return '—'
  const value = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return '—'
  return value.toLocaleDateString('pt-BR')
}

function parseJsonField<T>(value: any, fallback: T): T {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return (parsed ?? fallback) as T
    } catch (error) {
      console.warn('Falha ao parsear JSON', value, error)
      return fallback
    }
  }

  if (typeof value === 'object') {
    return value as T
  }

  return fallback
}

function ensureArray<T>(value: any): T[] {
  if (!value && value !== 0) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function getValueStatusColor(status?: string) {
  if (!status) return 'info'
  const normalized = status.toUpperCase()

  if (normalized.includes('CRITICAL') || normalized.includes('ALTO') || normalized.includes('HIGH') || normalized.includes('ACIMA')) {
    return 'error'
  }

  if (normalized.includes('LOW') || normalized.includes('BAIXO') || normalized.includes('ABAIXO')) {
    return 'warning'
  }

  if (normalized.includes('NORMAL')) {
    return 'success'
  }

  return 'info'
}

function getFindingTitle(finding: any): string {
  if (!finding && finding !== 0) return ''
  if (typeof finding === 'string') return finding

  const parameter = finding.parameter || finding.title || finding.nome || finding.label
  const value = finding.value ?? finding.valor

  if (parameter && value !== undefined && value !== null && value !== '') {
    return `${parameter}: ${value}`
  }

  return parameter || finding.description || ''
}

function getFindingSubtitle(finding: any): string {
  if (!finding && finding !== 0) return ''
  if (typeof finding === 'string') return ''

  const parts: string[] = []

  if (finding.description) {
    parts.push(finding.description)
  }

  if (finding.reference) {
    parts.push(`Referência: ${finding.reference}`)
  }

  if (finding.value !== undefined && finding.value !== null && finding.reference && !finding.description) {
    // already handled in title, keep subtle
  }

  return parts.join(' • ')
}

function getFindingStatusChip(finding: any): string | null {
  if (!finding || typeof finding === 'string') return null
  return finding.status || null
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return 'Tamanho desconhecido'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function onFileChange(files: File[]) {
  if (files.length > 0) {
    selectedFile.value = files[0]
  }
}

async function handleUpload() {
  if (!selectedFile.value || !patient.value) return

  uploading.value = true
  processingError.value = null
  try {
    const response = await store.uploadExam(patient.value.id, selectedFile.value)

    if (response?.exam) {
      processingExam.value = response.exam
      processingStatus.value = response.exam.processingStatus
      processingMessage.value = response.message || 'Análise em andamento...'
      processingError.value = null
      processingElapsed.value = 0
      processingDialog.value = true
      startExamProcessingMonitor(response.exam.id, patient.value.id)
    }

    uploadDialog.value = false
    selectedFile.value = null
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    processingError.value = (error as any)?.message || 'Erro ao fazer upload do exame.'
  } finally {
    uploading.value = false
  }
}

function confirmDeleteExam(examId: string) {
  examToDelete.value = examId
  deleteExamDialog.value = true
}

async function handleDeleteExam() {
  if (!examToDelete.value || !patient.value) return

  deleting.value = true
  try {
    await store.deleteExam(patient.value.id, examToDelete.value)
    deleteExamDialog.value = false
    examToDelete.value = null
  } catch (error: any) {
    console.error('Erro ao deletar exame:', error)
    alert('Erro ao deletar exame: ' + (error.message || 'Erro desconhecido'))
  } finally {
    deleting.value = false
  }
}

function stopExamProcessingMonitor() {
  if (processingPollInterval) {
    clearInterval(processingPollInterval)
    processingPollInterval = null
  }

  if (processingElapsedInterval) {
    clearInterval(processingElapsedInterval)
    processingElapsedInterval = null
  }
}

async function updateProcessingStatus(examId: string, patientId: string) {
  try {
    const exam = await store.fetchExamById(examId)
    processingExam.value = exam
    processingStatus.value = exam.processingStatus

    if (exam.processingStatus === 'COMPLETED') {
      processingMessage.value = 'Análise concluída com sucesso!'
      processingError.value = null
      stopExamProcessingMonitor()
      await store.fetchPatient(patientId)
    } else if (exam.processingStatus === 'FAILED') {
      processingMessage.value = 'Falha na análise do exame.'
      processingError.value = exam.processingError || 'Não foi possível concluir a análise.'
      stopExamProcessingMonitor()
      await store.fetchPatient(patientId)
    } else {
      processingMessage.value = 'Análise em andamento...'
      processingError.value = null
    }
  } catch (error: any) {
    console.error('Erro ao atualizar status do exame:', error)
    processingError.value = error.message || 'Erro ao consultar status do exame.'
  }
}

function startExamProcessingMonitor(examId: string, patientId: string) {
  stopExamProcessingMonitor()

  processingElapsed.value = 0
  processingStatus.value = 'PROCESSING'
  processingMessage.value = 'Análise em andamento...'
  processingError.value = null

  processingElapsedInterval = setInterval(() => {
    processingElapsed.value += 1
  }, 1000)

  updateProcessingStatus(examId, patientId)

  processingPollInterval = setInterval(() => {
    updateProcessingStatus(examId, patientId)
  }, 4000)
}

function closeProcessingDialog() {
  processingDialog.value = false
  stopExamProcessingMonitor()
  processingManualLoading.value = false
  processingStatus.value = 'PENDING'
  processingExam.value = null
  processingMessage.value = ''
  processingError.value = null
}

async function refreshProcessingExam() {
  if (processingExam.value && patient.value) {
    try {
      processingManualLoading.value = true
      await updateProcessingStatus(processingExam.value.id, patient.value.id)
    } finally {
      processingManualLoading.value = false
    }
  }
}

async function handleReprocessExam(exam: any) {
  if (!patient.value) return

  try {
    reprocessingExamId.value = exam.id
    processingExam.value = exam
    processingStatus.value = 'PROCESSING'
    processingMessage.value = 'Reprocessando exame...'
    processingError.value = null
    processingElapsed.value = 0
    processingDialog.value = true

    const response = await store.reprocessExam(patient.value.id, exam.id)

    if (response?.exam) {
      await updateProcessingStatus(exam.id, patient.value.id)
    } else {
      await store.fetchPatient(patient.value.id)
      await updateProcessingStatus(exam.id, patient.value.id)
    }
  } catch (error: any) {
    processingStatus.value = 'FAILED'
    processingError.value = error.message || 'Erro ao reprocessar exame.'
  } finally {
    reprocessingExamId.value = null
  }
}

function openProcessingDialog(exam: any) {
  if (!patient.value) return

  processingExam.value = exam
  processingStatus.value = exam.processingStatus
  processingMessage.value =
    exam.processingStatus === 'COMPLETED'
      ? 'Análise concluída com sucesso!'
      : exam.processingStatus === 'FAILED'
      ? 'Falha na análise do exame.'
      : 'Análise em andamento...'
  processingError.value = exam.processingError || null
  processingElapsed.value = 0
  processingDialog.value = true

  if (exam.processingStatus === 'PROCESSING') {
    startExamProcessingMonitor(exam.id, patient.value.id)
  } else {
    stopExamProcessingMonitor()
  }
}

onBeforeUnmount(() => {
  stopExamProcessingMonitor()
})

const examsByCategory = computed(() => {
  if (!patient.value?.exams) return {}

  return patient.value.exams.reduce((acc: any, exam: any) => {
    const category = exam.category || 'Não Categorizado'
    const parsedExam = {
      ...exam,
      parsedAbnormalValues: ensureArray(parseJsonField(exam.abnormalValues, [] as any[])),
      parsedKeyFindings: ensureArray(parseJsonField(exam.keyFindings, [] as any[])),
      parsedRecommendations: ensureArray(parseJsonField(exam.recommendations, [] as any[])),
      parsedExtractedData: parseJsonField(exam.extractedData, {} as Record<string, any>),
    }

    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(parsedExam)
    return acc
  }, {})
})

const categoryIcons: Record<string, string> = {
  'Hemograma': 'mdi-water',
  'Lipidograma': 'mdi-heart',
  'Glicemia': 'mdi-candy',
  'Hormônios': 'mdi-flask',
  'Tireoide': 'mdi-thyroid',
  'Hepático': 'mdi-liver',
  'Renal': 'mdi-kidney',
  'Vitaminas': 'mdi-pill',
  'Urina': 'mdi-beaker',
  'Fezes': 'mdi-bacteria',
  'Imagem': 'mdi-image',
  'Outros': 'mdi-file-document',
}

function getCategoryIcon(category: string) {
  return categoryIcons[category] || 'mdi-file-document'
}

const statusColors: Record<string, string> = {
  'COMPLETED': 'success',
  'PROCESSING': 'warning',
  'PENDING': 'grey',
  'FAILED': 'error',
}

const statusLabels: Record<string, string> = {
  'COMPLETED': 'Concluído',
  'PROCESSING': 'Processando',
  'PENDING': 'Pendente',
  'FAILED': 'Erro',
}

function getExamActionLabel(status: string) {
  switch (status) {
    case 'PROCESSING':
      return 'Ver progresso'
    case 'FAILED':
      return 'Ver erro'
    case 'COMPLETED':
      return 'Ver análise'
    default:
      return 'Detalhes'
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <v-row v-if="store.loading">
      <v-col cols="12" class="text-center pa-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4 text-grey-darken-1">Carregando dados do paciente...</p>
      </v-col>
    </v-row>

    <template v-else-if="patient">
      <v-row>
        <v-col cols="12">
          <v-btn
            prepend-icon="mdi-arrow-left"
            variant="text"
            @click="router.push('/pacientes')"
            class="mb-4"
          >
            Voltar
          </v-btn>
        </v-col>
      </v-row>

      <v-row>
        <!-- Coluna Esquerda - Informações do Paciente -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="mb-4">
            <v-card-text class="text-center pa-6">
              <v-avatar color="primary" size="96" class="mb-4">
                <span class="text-h4 font-weight-bold">{{ getInitials(patient.fullName) }}</span>
              </v-avatar>
              <h2 class="text-h5 font-weight-bold mb-2">{{ patient.fullName }}</h2>
              <p v-if="calculateAge(patient.birthDate)" class="text-grey-darken-1">
                {{ calculateAge(patient.birthDate) }} anos
              </p>
            </v-card-text>

            <v-divider></v-divider>

            <v-list>
              <v-list-item v-if="patient.email" prepend-icon="mdi-email">
                <v-list-item-title>{{ patient.email }}</v-list-item-title>
                <v-list-item-subtitle>Email</v-list-item-subtitle>
              </v-list-item>

              <v-list-item prepend-icon="mdi-phone">
                <v-list-item-title>{{ patient.phone }}</v-list-item-title>
                <v-list-item-subtitle>Telefone</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="patient.birthDate" prepend-icon="mdi-calendar">
                <v-list-item-title>{{ formatDate(patient.birthDate) }}</v-list-item-title>
                <v-list-item-subtitle>Data de Nascimento</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="patient.bloodType" prepend-icon="mdi-water">
                <v-list-item-title>{{ patient.bloodType }}</v-list-item-title>
                <v-list-item-subtitle>Tipo Sanguíneo</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="patient.city" prepend-icon="mdi-map-marker">
                <v-list-item-title>{{ patient.city }}, {{ patient.state }}</v-list-item-title>
                <v-list-item-subtitle>Localização</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>

          <!-- Informações Médicas -->
          <v-card v-if="patient.allergies || patient.currentMedications || patient.medicalHistory" elevation="2" class="mb-4">
            <v-card-title class="bg-warning">
              <v-icon icon="mdi-medical-bag" class="mr-2"></v-icon>
              Informações Médicas
            </v-card-title>
            <v-card-text class="pa-4">
              <div v-if="patient.allergies" class="mb-3">
                <div class="text-caption text-grey-darken-1">Alergias</div>
                <div class="font-weight-medium">{{ patient.allergies }}</div>
              </div>
              <div v-if="patient.currentMedications" class="mb-3">
                <div class="text-caption text-grey-darken-1">Medicações Atuais</div>
                <div class="font-weight-medium">{{ patient.currentMedications }}</div>
              </div>
              <div v-if="patient.medicalHistory">
                <div class="text-caption text-grey-darken-1">Histórico Médico</div>
                <div class="font-weight-medium">{{ patient.medicalHistory }}</div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Estatísticas -->
          <v-card elevation="2">
            <v-card-title class="bg-primary">
              <v-icon icon="mdi-chart-box" class="mr-2"></v-icon>
              Estatísticas
            </v-card-title>
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <span>Consultas</span>
                <v-chip color="primary">{{ patient.consultations?.length || 0 }}</v-chip>
              </div>
              <div class="d-flex align-center justify-space-between mb-2">
                <span>Relatórios</span>
                <v-chip color="info">{{ patient.reports?.length || 0 }}</v-chip>
              </div>
              <div class="d-flex align-center justify-space-between">
                <span>Exames</span>
                <v-chip color="success">{{ patient.exams?.length || 0 }}</v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Coluna Direita - Exames -->
        <v-col cols="12" md="8">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div>
                <h3 class="text-h5 font-weight-bold">Exames Laboratoriais</h3>
                <p class="text-caption text-grey-darken-1 mt-1">
                  {{ patient.exams?.length || 0 }} exames anexados
                </p>
              </div>
              <v-btn
                color="primary"
                prepend-icon="mdi-upload"
                @click="uploadDialog = true"
              >
                Upload Exame
              </v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text v-if="!patient.exams || patient.exams.length === 0" class="text-center pa-12">
              <v-icon icon="mdi-flask-empty" size="64" color="grey"></v-icon>
              <h4 class="text-h6 font-weight-bold mt-4 mb-2">Nenhum exame anexado</h4>
              <p class="text-grey-darken-1 mb-6">
                Faça upload dos exames laboratoriais do paciente para análise automática com IA
              </p>
              <v-btn
                color="primary"
                size="large"
                prepend-icon="mdi-upload"
                @click="uploadDialog = true"
              >
                Fazer Upload do Primeiro Exame
              </v-btn>
            </v-card-text>

            <v-card-text v-else class="pa-6">
              <div v-for="(exams, category) in examsByCategory" :key="category" class="mb-6">
                <div class="d-flex align-center mb-3">
                  <v-icon :icon="getCategoryIcon(category)" class="mr-2" color="primary"></v-icon>
                  <h4 class="text-h6 font-weight-bold">{{ category }}</h4>
                  <v-chip size="small" class="ml-2">{{ exams.length }}</v-chip>
                </div>

                <v-card
                  v-for="exam in exams"
                  :key="exam.id"
                  variant="outlined"
                  class="mb-4 exam-card"
                  elevation="0"
                >
                  <v-card-title class="exam-card__header">
                    <div class="d-flex align-center">
                      <v-avatar color="primary" size="44" class="mr-3">
                        <v-icon icon="mdi-file-document"></v-icon>
                      </v-avatar>
                      <div>
                        <div class="text-body-1 font-weight-medium">{{ exam.fileName }}</div>
                        <div class="text-caption text-grey-darken-1">
                          {{ formatDate(exam.createdAt) }} · {{ formatFileSize(exam.fileSize) }} ·
                          {{ exam.fileType === 'pdf' ? 'PDF' : 'Imagem' }}
                        </div>
                      </div>
                    </div>

                    <div class="d-flex align-center flex-wrap justify-end exam-card__header-actions">
                      <v-chip
                        :color="statusColors[exam.processingStatus]"
                        variant="tonal"
                        size="small"
                        class="mr-2 mb-2"
                      >
                        <v-icon
                          start
                          size="16"
                          :icon="exam.processingStatus === 'COMPLETED' ? 'mdi-check-circle' : exam.processingStatus === 'FAILED' ? 'mdi-alert-circle' : 'mdi-timer-sand'"
                        ></v-icon>
                        {{ statusLabels[exam.processingStatus] }}
                      </v-chip>

                      <v-btn
                        color="secondary"
                        variant="tonal"
                        size="small"
                        class="mr-2 mb-2"
                        prepend-icon="mdi-timeline-clock-outline"
                        @click.stop="openProcessingDialog(exam)"
                      >
                        {{ getExamActionLabel(exam.processingStatus) }}
                      </v-btn>

                      <v-btn
                        color="primary"
                        variant="tonal"
                        size="small"
                        class="mr-2 mb-2"
                        prepend-icon="mdi-refresh"
                        :loading="reprocessingExamId === exam.id"
                        :disabled="reprocessingExamId !== null"
                        @click.stop="handleReprocessExam(exam)"
                      >
                        Reprocessar
                      </v-btn>

                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="error"
                        class="mb-2"
                        @click.stop="confirmDeleteExam(exam.id)"
                      >
                        <v-icon icon="mdi-delete"></v-icon>
                        <v-tooltip activator="parent">Excluir Exame</v-tooltip>
                      </v-btn>
                    </div>
                  </v-card-title>

                  <v-card-text class="pa-6">
                    <div class="d-flex align-center flex-wrap exam-card__meta mb-4">
                      <v-chip color="primary" variant="tonal" size="small" class="mr-2 mb-2">
                        <v-icon icon="mdi-tag-outline" start size="16"></v-icon>
                        {{ exam.category || 'Categoria não definida' }}
                      </v-chip>

                      <v-chip
                        v-if="exam.examType"
                        color="info"
                        variant="tonal"
                        size="small"
                        class="mr-2 mb-2"
                      >
                        <v-icon icon="mdi-flask-outline" start size="16"></v-icon>
                        {{ exam.examType }}
                      </v-chip>

                      <v-chip
                        v-if="exam.examDate"
                        color="success"
                        variant="tonal"
                        size="small"
                        class="mr-2 mb-2"
                      >
                        <v-icon icon="mdi-calendar" start size="16"></v-icon>
                        {{ formatDate(exam.examDate) }}
                      </v-chip>

                      <v-chip color="grey-darken-1" variant="tonal" size="small" class="mr-2 mb-2">
                        <v-icon icon="mdi-database" start size="16"></v-icon>
                        {{ exam.aiModel || 'Anthropic' }}
                      </v-chip>
                    </div>

                    <v-sheet
                      v-if="exam.aiSummary"
                      color="primary-lighten-5"
                      class="pa-4 rounded-lg exam-card__summary mb-4"
                    >
                      <div class="d-flex align-center mb-2">
                        <v-icon icon="mdi-text-long" class="mr-2" color="primary-darken-1"></v-icon>
                        <span class="text-subtitle-2 font-weight-medium">Resumo da IA</span>
                      </div>
                      <p class="mb-0 text-body-2">{{ exam.aiSummary }}</p>
                    </v-sheet>

                    <v-alert
                      v-else
                      type="warning"
                      variant="tonal"
                      class="mb-4"
                    >
                      A IA não retornou um resumo para este exame. Consulte os dados extraídos nos detalhes abaixo.
                    </v-alert>

                    <div v-if="ensureArray(exam.parsedKeyFindings).length" class="mb-4">
                      <div class="d-flex align-center mb-2">
                        <v-icon icon="mdi-lightbulb-on-outline" class="mr-2" color="primary"></v-icon>
                        <span class="text-subtitle-2 font-weight-medium">Principais achados</span>
                      </div>
                      <v-list density="compact" class="exam-card__list">
                        <v-list-item
                          v-for="(finding, index) in ensureArray(exam.parsedKeyFindings)"
                          :key="`${exam.id}-finding-${index}`"
                        >
                          <template #prepend>
                            <v-icon icon="mdi-check-circle" size="18" color="primary"></v-icon>
                          </template>
                          <template #append>
                            <v-chip
                              v-if="getFindingStatusChip(finding)"
                              size="small"
                              :color="getValueStatusColor(getFindingStatusChip(finding))"
                              variant="tonal"
                              class="ml-2"
                            >
                              {{ getFindingStatusChip(finding) }}
                            </v-chip>
                          </template>
                          <v-list-item-title class="text-body-2 font-weight-medium">
                            {{ getFindingTitle(finding) }}
                          </v-list-item-title>
                          <v-list-item-subtitle
                            v-if="getFindingSubtitle(finding)"
                            class="text-caption text-grey-darken-1"
                          >
                            {{ getFindingSubtitle(finding) }}
                          </v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </div>

                    <div v-if="ensureArray(exam.parsedRecommendations).length" class="mb-4">
                      <div class="d-flex align-center mb-2">
                        <v-icon icon="mdi-clipboard-check-outline" class="mr-2" color="success"></v-icon>
                        <span class="text-subtitle-2 font-weight-medium">Recomendações</span>
                      </div>
                      <v-list density="compact" class="exam-card__list">
                        <v-list-item
                          v-for="(recommendation, index) in ensureArray(exam.parsedRecommendations)"
                          :key="`${exam.id}-recommendation-${index}`"
                        >
                          <template #prepend>
                            <v-icon icon="mdi-arrow-right" size="18" color="success"></v-icon>
                          </template>
                          <v-list-item-title class="text-body-2">{{ recommendation }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </div>

                    <div v-if="ensureArray(exam.parsedAbnormalValues).length" class="mb-4">
                      <div class="d-flex align-center mb-2">
                        <v-icon icon="mdi-alert-circle-outline" class="mr-2" color="error"></v-icon>
                        <span class="text-subtitle-2 font-weight-medium">Parâmetros em destaque</span>
                      </div>
                      <v-table class="exam-card__table" density="comfortable">
                        <thead>
                          <tr>
                            <th class="text-left">Parâmetro</th>
                            <th class="text-center">Valor</th>
                            <th class="text-center">Referência</th>
                            <th class="text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(item, index) in ensureArray(exam.parsedAbnormalValues)"
                            :key="`${exam.id}-abnormal-${index}`"
                          >
                            <td class="text-body-2">{{ item.parameter }}</td>
                            <td class="text-center text-body-2">{{ item.value || '—' }}</td>
                            <td class="text-center text-body-2">{{ item.reference || '—' }}</td>
                            <td class="text-center">
                              <v-chip size="small" :color="getValueStatusColor(item.status)" variant="tonal">
                                {{ item.status || 'Alterado' }}
                              </v-chip>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>

                    <v-expansion-panels
                      variant="accordion"
                      class="exam-card__expansion"
                      v-if="Object.keys(exam.parsedExtractedData || {}).length"
                    >
                      <v-expansion-panel>
                        <v-expansion-panel-title>
                          <v-icon icon="mdi-database-outline" class="mr-2" color="primary"></v-icon>
                          Dados extraídos completos
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <pre class="exam-card__code">{{ JSON.stringify(exam.parsedExtractedData, null, 2) }}</pre>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-card>
              </div>
            </v-card-text>
          </v-card>

          <!-- Consultas -->
          <ConsultationSection :patient-id="patient.id" class="mt-6" />

          <!-- Relatórios -->
          <ReportsSection :patient-id="patient.id" class="mt-6" />
        </v-col>
      </v-row>
    </template>

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog" max-width="600">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon icon="mdi-upload" class="mr-2"></v-icon>
          Upload de Exame
        </v-card-title>

        <v-card-text class="pa-6">
          <p class="mb-4">
            Selecione um arquivo PDF ou imagem do exame laboratorial. A IA irá analisar e categorizar automaticamente.
          </p>

          <v-file-input
            v-model="selectedFile"
            label="Selecione o arquivo"
            accept=".pdf,image/*"
            prepend-icon="mdi-file"
            show-size
            :disabled="uploading"
          ></v-file-input>

          <v-alert v-if="store.error" type="error" class="mt-4">
            {{ store.error }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="uploadDialog = false" :disabled="uploading">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            @click="handleUpload"
            :loading="uploading"
            :disabled="!selectedFile"
          >
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Status de Processamento do Exame -->
    <v-dialog
      v-model="processingDialog"
      max-width="640"
      :persistent="processingStatus === 'PROCESSING' || processingStatus === 'PENDING'"
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon icon="mdi-clipboard-text" class="mr-2" :color="processingStatus === 'COMPLETED' ? 'success' : processingStatus === 'FAILED' ? 'error' : 'primary'"></v-icon>
            <span>Status da análise do exame</span>
          </div>
          <v-chip :color="statusColors[processingStatus]" variant="tonal">
            {{ statusLabels[processingStatus] }}
          </v-chip>
        </v-card-title>

        <v-card-text class="pa-6" v-if="processingExam">
          <div class="mb-4">
            <p class="text-subtitle-1 font-weight-medium mb-1">{{ processingExam.fileName }}</p>
            <p class="text-caption text-grey-darken-1 mb-0">
              {{ formatFileSize(processingExam.fileSize) }} ·
              {{ processingExam.fileType === 'pdf' ? 'PDF' : 'Imagem' }}
            </p>
          </div>

          <v-alert type="info" variant="tonal" class="mb-4">
            {{ processingMessage }}
          </v-alert>

          <div class="d-flex align-center mb-4">
            <v-icon icon="mdi-timer-outline" class="mr-2" color="primary"></v-icon>
            <span class="font-weight-medium">Tempo decorrido: {{ formatTimer(processingElapsed) }}</span>
          </div>

          <v-progress-linear
            v-if="processingStatus === 'PROCESSING'"
            color="primary"
            indeterminate
            class="mb-4"
          ></v-progress-linear>

          <v-alert
            v-if="processingStatus === 'FAILED' && processingError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ processingError }}
          </v-alert>

          <div v-if="processingStatus === 'COMPLETED'" class="mb-4">
            <p class="text-subtitle-2 font-weight-medium">Resumo gerado pela IA</p>
            <v-sheet color="grey-lighten-4" class="pa-3 rounded-lg">
              <p class="mb-0 text-body-2">
                {{ processingExam.aiSummary || 'Resumo não disponível.' }}
              </p>
            </v-sheet>

            <v-alert
              v-if="processingExam.keyFindings"
              type="success"
              variant="tonal"
              class="mt-3"
            >
              Resultados disponíveis! Consulte os detalhes completos do exame na lista.
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions class="pa-6">
          <v-btn
            variant="text"
            @click="closeProcessingDialog"
            :disabled="processingStatus === 'PROCESSING'"
          >
            Fechar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-refresh"
            :disabled="processingStatus !== 'PROCESSING'"
            :loading="processingManualLoading"
            @click="refreshProcessingExam"
          >
            Atualizar agora
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Confirmar Exclusão de Exame -->
    <v-dialog v-model="deleteExamDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon icon="mdi-alert" class="mr-2"></v-icon>
          Confirmar Exclusão
        </v-card-title>

        <v-card-text class="pa-6">
          <p class="text-h6 mb-4">Tem certeza que deseja excluir este exame?</p>
          <p class="text-body-2 text-grey-darken-1">
            Esta ação não pode ser desfeita. O arquivo físico também será removido.
          </p>
        </v-card-text>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn @click="deleteExamDialog = false" :disabled="deleting">
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            @click="handleDeleteExam"
            :loading="deleting"
          >
            Excluir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.v-container {
  min-height: 100vh;
  background: linear-gradient(to bottom right, #ecfdf5, #d1fae5, #cffafe);
}

.v-card {
  border-radius: 12px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid #e5e7eb !important;
}

.v-avatar {
  background: linear-gradient(to bottom right, #10b981, #14b8a6) !important;
}

.v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.v-list-item:last-child {
  border-bottom: none;
}

.exam-card {
  border-radius: 16px;
  border: 1px solid rgba(33, 33, 33, 0.08);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.exam-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.exam-card__header-actions {
  min-width: 220px;
}

.exam-card__meta .v-chip {
  font-weight: 500;
}

.exam-card__summary {
  border: 1px solid rgba(33, 150, 243, 0.25);
}

.exam-card__table thead {
  background-color: rgba(120, 144, 156, 0.08);
}

.exam-card__table th {
  font-weight: 600;
  color: #424242;
}

.exam-card__table tr:nth-of-type(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

.exam-card__code {
  background-color: rgb(248, 250, 252);
  border-radius: 12px;
  padding: 16px;
  max-height: 320px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.exam-card__list .v-list-item {
  border-bottom: none;
  min-height: 32px;
}

.exam-card__list .v-list-item-title {
  white-space: normal;
}

.exam-card__expansion {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
}
</style>
