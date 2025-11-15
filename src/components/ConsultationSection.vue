<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

const props = defineProps<{
  patientId: string
}>()

const consultations = ref<any[]>([])
const loading = ref(false)
const showNewConsultationDialog = ref(false)
const uploadingAudio = ref(false)
const deletingAudio = ref(false)
const audioToDelete = ref<{ consultationId: string; audioId: string; fileName?: string } | null>(null)
const showDeleteAudioDialog = ref(false)
const recordDialog = ref(false)
const currentRecordingConsultation = ref<{ id: string; title: string } | null>(null)
const recordingState = ref<'idle' | 'preparing' | 'recording' | 'paused' | 'processing' | 'review' | 'uploading'>('idle')
const recordingDuration = ref(0)
const isRecording = ref(false)
const isPaused = ref(false)
const recordingError = ref<string | null>(null)
const recordedBlob = ref<Blob | null>(null)
const recordingPreviewUrl = ref<string | null>(null)

// Tempo de transcrição
const transcriptionTimers = ref<Record<string, { startTime: number; elapsed: number }>>({})
let transcriptionTimerInterval: ReturnType<typeof setInterval> | null = null

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let recordedChunks: BlobPart[] = []

// Formulário de nova consulta
const newConsultation = ref({
  chiefComplaint: '',
  symptoms: '',
  status: 'IN_PROGRESS',
})

let pollingInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchConsultations()
  startPolling()
})

function startPolling() {
  // Verificar a cada 3 segundos se há transcrições em andamento
  pollingInterval = setInterval(async () => {
    const hasProcessing = consultations.value.some(c =>
      c.audioRecordings?.some((a: any) => a.transcriptionStatus === 'PROCESSING')
    )

    if (hasProcessing) {
      await fetchConsultations()
    }
  }, 3000)

  // Iniciar timer de transcrição
  startTranscriptionTimer()
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }

  if (transcriptionTimerInterval) {
    clearInterval(transcriptionTimerInterval)
    transcriptionTimerInterval = null
  }
}

function startTranscriptionTimer() {
  transcriptionTimerInterval = setInterval(() => {
    consultations.value.forEach(c => {
      c.audioRecordings?.forEach((audio: any) => {
        if (audio.transcriptionStatus === 'PROCESSING') {
          if (!transcriptionTimers.value[audio.id]) {
            transcriptionTimers.value[audio.id] = {
              startTime: Date.now(),
              elapsed: 0
            }
          } else {
            const timer = transcriptionTimers.value[audio.id]
            if (timer) {
              timer.elapsed = Math.floor((Date.now() - timer.startTime) / 1000)
            }
          }
        } else if (transcriptionTimers.value[audio.id]) {
          delete transcriptionTimers.value[audio.id]
        }
      })
    })
  }, 1000)
}

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function getTranscriptionElapsed(audioId: string): string {
  return transcriptionTimers.value[audioId]
    ? formatElapsedTime(transcriptionTimers.value[audioId].elapsed)
    : '00:00'
}

async function fetchConsultations() {
  loading.value = true
  try {
    const response = await axios.get(`/api/consultations/patient/${props.patientId}`)
    consultations.value = response.data.map((consultation: any) => ({
      ...consultation,
      audioRecordings: consultation.audioRecordings || [],
    }))
  } catch (error) {
    console.error('Erro ao buscar consultas:', error)
  } finally {
    loading.value = false
  }
}

async function createConsultation() {
  loading.value = true
  try {
    const response = await axios.post('/api/consultations', {
      patientId: props.patientId,
      ...newConsultation.value,
    })

    consultations.value.unshift({
      ...response.data,
      audioRecordings: response.data.audioRecordings || [],
    })
    showNewConsultationDialog.value = false
    resetForm()
  } catch (error: any) {
    console.error('Erro ao criar consulta:', error)
    alert('Erro ao criar consulta: ' + error.message)
  } finally {
    loading.value = false
  }
}

async function uploadAudio(consultationId: string, file: File) {
  uploadingAudio.value = true
  try {
    const formData = new FormData()
    formData.append('audio', file)

    const response = await axios.post(
      `/api/consultations/${consultationId}/upload-audio`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    alert(response.data?.message || 'Áudio enviado! Transcrição em andamento...')

    await fetchConsultations()
  } catch (error: any) {
    console.error('Erro ao fazer upload de áudio:', error)
    alert('Erro ao enviar áudio: ' + error.message)
  } finally {
    uploadingAudio.value = false
  }
}

function handleAudioFileSelected(event: Event, consultationId: string) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    uploadAudio(consultationId, input.files[0])
  }
}

function resetForm() {
  newConsultation.value = {
    chiefComplaint: '',
    symptoms: '',
    status: 'IN_PROGRESS',
  }
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    SCHEDULED: 'blue',
    IN_PROGRESS: 'orange',
    COMPLETED: 'green',
    CANCELLED: 'red',
  }
  return colors[status] || 'grey'
}

function getStatusText(status: string) {
  const texts: Record<string, string> = {
    SCHEDULED: 'Agendada',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
  }
  return texts[status] || status
}

function getTranscriptionStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'grey',
    PROCESSING: 'orange',
    COMPLETED: 'green',
    FAILED: 'red',
  }
  return colors[status] || 'grey'
}

function getTranscriptionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    PROCESSING: 'Transcrevendo',
    COMPLETED: 'Concluído',
    FAILED: 'Erro',
  }
  return labels[status] || status
}

function formatFileSize(size: number | null | undefined) {
  if (!size || size <= 0) return 'tamanho desconhecido'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

function cleanupMedia() {
  if (recordingTimer !== null) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }

  mediaRecorder = null
}

function resetRecordingState() {
  cleanupMedia()
  isRecording.value = false
  isPaused.value = false
  recordingDuration.value = 0
  recordingState.value = 'idle'
  recordingError.value = null
  recordedBlob.value = null
  recordedChunks = []

  if (recordingPreviewUrl.value) {
    URL.revokeObjectURL(recordingPreviewUrl.value)
    recordingPreviewUrl.value = null
  }
}

function openRecordingDialog(consultation: any) {
  currentRecordingConsultation.value = {
    id: consultation.id,
    title: `${new Date(consultation.date).toLocaleDateString('pt-BR')} ${new Date(consultation.date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
  }
  resetRecordingState()
  recordDialog.value = true
}

function closeRecordingDialog() {
  recordDialog.value = false
}

function handleRecordDialogUpdate(value: boolean) {
  if (!value) {
    currentRecordingConsultation.value = null
    resetRecordingState()
  }
}

async function startRecording() {
  recordingError.value = null

  if (!currentRecordingConsultation.value) {
    return
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    recordingError.value = 'Gravação não suportada neste navegador.'
    return
  }

  try {
    cleanupMedia()
    recordedChunks = []
    recordingDuration.value = 0
    recordingState.value = 'preparing'

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(mediaStream)

    mediaRecorder.ondataavailable = event => {
      if (event.data && event.data.size) {
        recordedChunks.push(event.data)
      }
    }

    mediaRecorder.onerror = event => {
      recordingError.value = `Erro na gravação: ${event.error?.message || event.error?.name || 'desconhecido'}`
      resetRecordingState()
    }

    mediaRecorder.onstart = () => {
      recordingState.value = 'recording'
      isRecording.value = true
      isPaused.value = false
      recordingDuration.value = 0
      recordingTimer = setInterval(() => {
        recordingDuration.value += 1
      }, 1000)
    }

    mediaRecorder.onpause = () => {
      recordingState.value = 'paused'
      isPaused.value = true
      if (recordingTimer !== null) {
        clearInterval(recordingTimer)
        recordingTimer = null
      }
    }

    mediaRecorder.onresume = () => {
      recordingState.value = 'recording'
      isPaused.value = false
      if (recordingTimer === null) {
        recordingTimer = setInterval(() => {
          recordingDuration.value += 1
        }, 1000)
      }
    }

    mediaRecorder.onstop = () => {
      if (recordingTimer !== null) {
        clearInterval(recordingTimer)
        recordingTimer = null
      }

      const stoppedRecorder = mediaRecorder
      cleanupMedia()
      isRecording.value = false
      isPaused.value = false

      if (!recordedChunks.length) {
        recordingError.value = 'Nenhum áudio foi capturado.'
        recordingState.value = 'idle'
        return
      }

      const mimeType = stoppedRecorder?.mimeType || 'audio/webm'
      const blob = new Blob(recordedChunks, { type: mimeType })
      recordedBlob.value = blob
      recordingState.value = 'review'

      if (recordingPreviewUrl.value) {
        URL.revokeObjectURL(recordingPreviewUrl.value)
      }
      recordingPreviewUrl.value = URL.createObjectURL(blob)
      recordedChunks = []
    }

    mediaRecorder.start()
  } catch (error: any) {
    console.error('Erro ao iniciar gravação:', error)
    recordingError.value = 'Não foi possível acessar o microfone: ' + (error.message || 'desconhecido')
    resetRecordingState()
  }
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause()
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume()
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    recordingState.value = 'processing'
    mediaRecorder.stop()
  }
}

function discardRecording() {
  resetRecordingState()
  recordingError.value = null
}

async function uploadRecordedAudio() {
  if (!recordedBlob.value || !currentRecordingConsultation.value) {
    recordingError.value = 'Nenhum áudio gravado para enviar.'
    return
  }

  try {
    recordingState.value = 'uploading'
    const mimeType = recordedBlob.value.type || 'audio/webm'
    const extension = mimeType.includes('mpeg')
      ? 'mp3'
      : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('wav')
      ? 'wav'
      : 'webm'

    const fileName = `consulta-${currentRecordingConsultation.value.id}-${Date.now()}.${extension}`
    const file = new File([recordedBlob.value], fileName, { type: mimeType })

    await uploadAudio(currentRecordingConsultation.value.id, file)
    closeRecordingDialog()
  } catch (error: any) {
    console.error('Erro ao enviar áudio gravado:', error)
    recordingError.value = 'Erro ao enviar áudio gravado: ' + (error.message || 'desconhecido')
    recordingState.value = 'review'
  }
}

function confirmDeleteAudio(consultationId: string, audioId: string, fileName?: string) {
  audioToDelete.value = { consultationId, audioId, fileName }
  showDeleteAudioDialog.value = true
}

async function handleDeleteAudio() {
  if (!audioToDelete.value) return

  deletingAudio.value = true
  try {
    await axios.delete(
      `/api/consultations/${audioToDelete.value.consultationId}/audios/${audioToDelete.value.audioId}`
    )

    showDeleteAudioDialog.value = false
    audioToDelete.value = null
    await fetchConsultations()
    // Áudio removido com sucesso - interface atualiza automaticamente
  } catch (error: any) {
    console.error('Erro ao deletar áudio:', error)
    // Manter diálogo aberto em caso de erro
    alert('Erro ao deletar áudio: ' + (error.message || 'Erro desconhecido'))
  } finally {
    deletingAudio.value = false
  }
}

onBeforeUnmount(() => {
  stopPolling()
  cleanupMedia()
  resetRecordingState()
})

function dismissRecordingError() {
  recordingError.value = null
}
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-clipboard-text" class="mr-2" color="primary"></v-icon>
        <span>Consultas</span>
      </div>
      <v-btn
        color="primary"
        size="small"
        prepend-icon="mdi-plus"
        @click="showNewConsultationDialog = true"
      >
        Nova Consulta
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text v-if="loading && consultations.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <p class="mt-4">Carregando consultas...</p>
    </v-card-text>

    <v-card-text v-else-if="consultations.length === 0" class="text-center py-12">
      <v-icon icon="mdi-clipboard-outline" size="64" color="grey"></v-icon>
      <p class="mt-4 text-grey">Nenhuma consulta registrada</p>
      <v-btn color="primary" class="mt-4" @click="showNewConsultationDialog = true">
        Criar Primeira Consulta
      </v-btn>
    </v-card-text>

    <div v-else>
      <v-alert
        v-if="recordingError"
        type="error"
        variant="tonal"
        class="mx-4 mt-4"
        closable
        @click:close="dismissRecordingError"
      >
        {{ recordingError }}
      </v-alert>

      <v-list>
        <v-list-item
          v-for="consultation in consultations"
          :key="consultation.id"
          class="py-4"
        >
          <template v-slot:prepend>
            <v-avatar :color="getStatusColor(consultation.status)">
              <v-icon icon="mdi-stethoscope"></v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold mb-2">
            {{ new Date(consultation.date).toLocaleDateString('pt-BR') }} -
            {{ new Date(consultation.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
          </v-list-item-title>

          <v-list-item-subtitle class="mb-2">
            <div class="d-flex align-center flex-wrap">
              <v-chip
                :color="getStatusColor(consultation.status)"
                size="small"
                class="mr-2"
              >
                {{ getStatusText(consultation.status) }}
              </v-chip>

              <v-chip
                v-if="consultation.audioRecordings?.length"
                size="small"
                class="mr-2"
                color="purple"
                variant="tonal"
              >
                <v-icon icon="mdi-microphone" start></v-icon>
                {{ consultation.audioRecordings.length }}
                {{ consultation.audioRecordings.length === 1 ? 'áudio' : 'áudios' }}
              </v-chip>
            </div>
          </v-list-item-subtitle>

          <v-list-item-subtitle v-if="consultation.chiefComplaint" class="mb-2">
            <strong>Queixa:</strong> {{ consultation.chiefComplaint }}
          </v-list-item-subtitle>

          <div
            v-if="consultation.audioRecordings && consultation.audioRecordings.length > 0"
            class="w-100 mt-3"
          >
            <div class="d-flex align-center mb-2">
              <v-icon icon="mdi-microphone" class="mr-2" color="primary"></v-icon>
              <span class="text-subtitle-2 font-weight-medium">Áudios anexados</span>
            </div>

            <v-expansion-panels variant="accordion">
              <v-expansion-panel
                v-for="audio in consultation.audioRecordings"
                :key="audio.id"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100">
                    <div>
                      <span class="font-weight-medium">{{ audio.fileName }}</span>
                      <span class="text-caption text-grey-darken-1 ml-2">
                        {{ formatFileSize(audio.fileSize) }}
                      </span>
                      <span
                        v-if="formatDuration(audio.duration)"
                        class="text-caption text-grey-darken-1 ml-2"
                      >
                        {{ formatDuration(audio.duration) }}
                      </span>
                    </div>
                    <div class="d-flex align-center">
                      <v-chip
                        :color="getTranscriptionStatusColor(audio.transcriptionStatus)"
                        size="x-small"
                        class="mr-2"
                      >
                        {{ getTranscriptionStatusLabel(audio.transcriptionStatus) }}
                      </v-chip>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        @click.stop="confirmDeleteAudio(consultation.id, audio.id, audio.fileName)"
                      >
                        <v-icon icon="mdi-delete" size="small"></v-icon>
                        <v-tooltip activator="parent">Excluir áudio</v-tooltip>
                      </v-btn>
                    </div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div v-if="audio.transcription">
                    {{ audio.transcription }}
                  </div>
                  <v-alert v-else-if="audio.transcriptionStatus === 'PROCESSING'" type="info" variant="tonal">
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="font-weight-medium mb-1">Transcrição em andamento...</div>
                        <div class="text-caption">
                          Tempo decorrido: {{ getTranscriptionElapsed(audio.id) }}
                        </div>
                      </div>
                      <v-progress-circular indeterminate size="24" width="3" color="info"></v-progress-circular>
                    </div>
                  </v-alert>
                  <v-alert v-else-if="audio.transcriptionStatus === 'FAILED'" type="error" variant="tonal">
                    {{ audio.transcriptionError || 'Falha ao transcrever este áudio.' }}
                  </v-alert>
                  <div v-else class="text-body-2 text-grey-darken-1">
                    Transcrição pendente.
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>

          <v-list-item-subtitle v-if="consultation.transcription" class="mb-2">
            <v-expansion-panels variant="accordion">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon icon="mdi-text" class="mr-2"></v-icon>
                  Ver Transcrição
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  {{ consultation.transcription }}
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-btn
              color="secondary"
              variant="tonal"
              size="small"
              class="mr-2"
              @click.stop="openRecordingDialog(consultation)"
            >
              <v-icon icon="mdi-record-circle" size="small" start></v-icon>
              Gravar áudio
            </v-btn>

            <v-btn
              icon
              variant="text"
              color="primary"
              size="small"
              :loading="uploadingAudio"
              :disabled="uploadingAudio"
              @click.stop="() => { ($refs[`audioInput-${consultation.id}`] as any)?.[0]?.click() }"
            >
              <v-icon icon="mdi-microphone" size="small"></v-icon>
              <v-tooltip activator="parent">Upload de Áudio</v-tooltip>
            </v-btn>

            <input
              :ref="`audioInput-${consultation.id}`"
              type="file"
              accept="audio/*"
              style="display: none"
              @change="(e) => handleAudioFileSelected(e, consultation.id)"
            />
          </template>
        </v-list-item>
      </v-list>
    </div>

    <!-- Dialog Nova Consulta -->
    <v-dialog v-model="showNewConsultationDialog" max-width="600">
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon icon="mdi-plus" class="mr-2"></v-icon>
          Nova Consulta
        </v-card-title>

        <v-card-text class="pa-6">
          <v-form @submit.prevent="createConsultation">
            <v-text-field
              v-model="newConsultation.chiefComplaint"
              label="Queixa Principal"
              prepend-inner-icon="mdi-comment-alert"
              variant="outlined"
              class="mb-4"
            ></v-text-field>

            <v-textarea
              v-model="newConsultation.symptoms"
              label="Sintomas"
              prepend-inner-icon="mdi-format-list-bulleted"
              variant="outlined"
              rows="4"
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn @click="showNewConsultationDialog = false" variant="text">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            @click="createConsultation"
            :loading="loading"
          >
            Criar Consulta
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Gravação de Áudio -->
    <v-dialog
      v-model="recordDialog"
      max-width="520"
      :persistent="recordingState === 'recording' || recordingState === 'paused' || recordingState === 'processing' || recordingState === 'uploading'"
      @update:model-value="handleRecordDialogUpdate"
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon icon="mdi-record-circle" class="mr-2" :color="recordingState === 'recording' ? 'error' : 'primary'"></v-icon>
            <span>Gravar áudio</span>
          </div>
          <v-chip
            v-if="currentRecordingConsultation"
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ currentRecordingConsultation.title }}
          </v-chip>
        </v-card-title>

        <v-card-text>
          <v-alert
            v-if="recordingError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ recordingError }}
          </v-alert>

          <div class="d-flex align-center mb-4">
            <div class="recording-indicator mr-3" :class="{ active: recordingState === 'recording' }"></div>
            <span class="text-h4 font-weight-medium">{{ formatTimer(recordingDuration) }}</span>
          </div>

          <div class="d-flex flex-wrap align-center mb-4">
            <v-btn
              color="primary"
              prepend-icon="mdi-record-circle"
              class="mr-2 mb-2"
              :disabled="recordingState !== 'idle'"
              @click="startRecording"
            >
              Iniciar
            </v-btn>

            <v-btn
              color="warning"
              prepend-icon="mdi-pause-circle"
              class="mr-2 mb-2"
              v-if="recordingState === 'recording'"
              @click="pauseRecording"
            >
              Pausar
            </v-btn>

            <v-btn
              color="primary"
              prepend-icon="mdi-play-circle"
              class="mr-2 mb-2"
              v-if="recordingState === 'paused'"
              @click="resumeRecording"
            >
              Retomar
            </v-btn>

            <v-btn
              color="error"
              prepend-icon="mdi-stop-circle"
              class="mr-2 mb-2"
              v-if="recordingState === 'recording' || recordingState === 'paused'"
              @click="stopRecording"
            >
              Finalizar
            </v-btn>

            <v-btn
              variant="text"
              color="secondary"
              prepend-icon="mdi-refresh"
              class="mr-2 mb-2"
              v-if="recordingState === 'review'"
              @click="discardRecording"
            >
              Regravar
            </v-btn>
          </div>

          <div v-if="recordingState === 'processing'" class="mb-4">
            <v-progress-linear indeterminate color="primary"></v-progress-linear>
            <p class="text-caption mt-2">Finalizando gravação...</p>
          </div>

          <div v-if="recordingState === 'uploading'" class="mb-4">
            <v-progress-linear indeterminate color="primary"></v-progress-linear>
            <p class="text-caption mt-2">Enviando áudio para a transcrição...</p>
          </div>

          <div v-if="recordedBlob && recordingPreviewUrl" class="mb-2">
            <p class="text-subtitle-2 mb-2">Pré-escuta da gravação</p>
            <audio :src="recordingPreviewUrl" controls class="w-100"></audio>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-btn
            variant="text"
            @click="closeRecordingDialog"
            :disabled="recordingState === 'recording' || recordingState === 'paused' || recordingState === 'processing' || recordingState === 'uploading'"
          >
            Fechar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            :disabled="!recordedBlob || recordingState !== 'review'"
            :loading="recordingState === 'uploading'"
            @click="uploadRecordedAudio"
          >
            Enviar gravação
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Confirmar Exclusão de Áudio -->
    <v-dialog v-model="showDeleteAudioDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon icon="mdi-alert" class="mr-2"></v-icon>
          Confirmar Exclusão
        </v-card-title>

        <v-card-text class="pa-6">
          <p class="text-h6 mb-4">Tem certeza que deseja excluir este áudio e sua transcrição?</p>
          <p v-if="audioToDelete?.fileName" class="text-body-2 mb-2">
            Arquivo: <strong>{{ audioToDelete.fileName }}</strong>
          </p>
          <p class="text-body-2 text-grey-darken-1">
            Esta ação não pode ser desfeita. O arquivo de áudio e a transcrição serão removidos permanentemente.
          </p>
        </v-card-text>

        <v-card-actions class="pa-6">
          <v-spacer></v-spacer>
          <v-btn @click="showDeleteAudioDialog = false" :disabled="deletingAudio">
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            @click="handleDeleteAudio"
            :loading="deletingAudio"
          >
            Excluir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.v-list-item:last-child {
  border-bottom: none;
}

.recording-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.26);
  transition: background-color 0.3s ease, transform 0.3s ease;
}

.recording-indicator.active {
  background-color: var(--v-theme-error);
  animation: recording-pulse 1.2s infinite;
}

@keyframes recording-pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
