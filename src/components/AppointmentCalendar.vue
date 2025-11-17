<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Agenda</span>
      <v-btn color="primary" @click="openNewAppointmentDialog">
        <v-icon start>mdi-plus</v-icon>
        Novo Agendamento
      </v-btn>
    </v-card-title>

    <v-card-text>
      <!-- Filtros -->
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-select
            v-model="selectedView"
            :items="viewOptions"
            label="Visualização"
            density="compact"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="selectedStatus"
            :items="statusOptions"
            label="Status"
            density="compact"
            variant="outlined"
            clearable
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-autocomplete
            v-model="selectedPatient"
            :items="patients"
            item-title="fullName"
            item-value="id"
            label="Paciente"
            density="compact"
            variant="outlined"
            clearable
          />
        </v-col>
      </v-row>

      <!-- Navegação de Data -->
      <v-row class="mb-4 align-center">
        <v-col cols="auto">
          <v-btn icon variant="text" @click="previousPeriod">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
        </v-col>
        <v-col class="text-center">
          <h3>{{ currentPeriodLabel }}</h3>
        </v-col>
        <v-col cols="auto">
          <v-btn icon variant="text" @click="nextPeriod">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn variant="outlined" size="small" @click="goToToday">
            Hoje
          </v-btn>
        </v-col>
      </v-row>

      <!-- Lista de Agendamentos -->
      <v-timeline side="end" align="start" truncate-line="both">
        <v-timeline-item
          v-for="appointment in filteredAppointments"
          :key="appointment.id"
          :dot-color="getStatusColor(appointment.status)"
          size="small"
        >
          <template #opposite>
            <div class="text-caption">
              {{ formatTime(appointment.startTime) }}
            </div>
          </template>

          <v-card @click="openAppointmentDetails(appointment)">
            <v-card-title class="text-body-1">
              {{ appointment.title }}
              <v-chip
                :color="getTypeColor(appointment.type)"
                size="x-small"
                class="ml-2"
              >
                {{ getTypeLabel(appointment.type) }}
              </v-chip>
            </v-card-title>

            <v-card-subtitle>
              <v-icon size="small">mdi-account</v-icon>
              {{ appointment.patient?.fullName }}
            </v-card-subtitle>

            <v-card-text>
              <div class="d-flex gap-2 flex-wrap">
                <v-chip size="small" variant="outlined">
                  <v-icon start size="small">mdi-clock-outline</v-icon>
                  {{ appointment.duration }} min
                </v-chip>

                <v-chip
                  v-if="appointment.location"
                  size="small"
                  variant="outlined"
                >
                  <v-icon start size="small">
                    {{ appointment.isOnline ? 'mdi-video' : 'mdi-map-marker' }}
                  </v-icon>
                  {{ appointment.location }}
                </v-chip>

                <v-chip
                  v-if="appointment.googleEventId"
                  size="small"
                  color="blue"
                  variant="outlined"
                >
                  <v-icon start size="small">mdi-google</v-icon>
                  Google
                </v-chip>

                <v-chip
                  v-if="appointment.appleEventId"
                  size="small"
                  color="grey"
                  variant="outlined"
                >
                  <v-icon start size="small">mdi-apple</v-icon>
                  Apple
                </v-chip>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-btn
                size="small"
                variant="text"
                color="primary"
                @click.stop="editAppointment(appointment)"
              >
                Editar
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                @click.stop="downloadICS(appointment.id)"
              >
                <v-icon start size="small">mdi-download</v-icon>
                .ICS
              </v-btn>
              <v-spacer />
              <v-btn
                size="small"
                variant="text"
                color="error"
                @click.stop="deleteAppointment(appointment)"
              >
                Cancelar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-timeline-item>
      </v-timeline>

      <!-- Empty State -->
      <v-alert v-if="filteredAppointments.length === 0" type="info" variant="tonal">
        Nenhum agendamento encontrado para este período.
      </v-alert>
    </v-card-text>

    <!-- Dialog de Novo/Editar Agendamento -->
    <v-dialog v-model="appointmentDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          {{ editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="form">
            <v-autocomplete
              v-model="appointmentForm.patientId"
              :items="patients"
              item-title="fullName"
              item-value="id"
              label="Paciente *"
              :rules="[v => !!v || 'Paciente é obrigatório']"
              variant="outlined"
              required
            />

            <v-text-field
              v-model="appointmentForm.title"
              label="Título *"
              :rules="[v => !!v || 'Título é obrigatório']"
              variant="outlined"
              required
            />

            <v-textarea
              v-model="appointmentForm.description"
              label="Descrição"
              variant="outlined"
              rows="3"
            />

            <v-select
              v-model="appointmentForm.type"
              :items="typeOptions"
              label="Tipo"
              variant="outlined"
            />

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="appointmentForm.startDate"
                  label="Data *"
                  type="date"
                  :rules="[v => !!v || 'Data é obrigatória']"
                  variant="outlined"
                  required
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="appointmentForm.startTime"
                  label="Horário *"
                  type="time"
                  :rules="[v => !!v || 'Horário é obrigatório']"
                  variant="outlined"
                  required
                />
              </v-col>
            </v-row>

            <v-text-field
              v-model.number="appointmentForm.duration"
              label="Duração (minutos) *"
              type="number"
              :rules="[v => !!v || 'Duração é obrigatória']"
              variant="outlined"
              required
            />

            <v-text-field
              v-model="appointmentForm.location"
              label="Localização"
              variant="outlined"
            />

            <v-switch
              v-model="appointmentForm.isOnline"
              label="Consulta Online"
              color="primary"
            />

            <v-textarea
              v-model="appointmentForm.notes"
              label="Notas"
              variant="outlined"
              rows="2"
            />

            <v-divider class="my-4" />

            <div class="text-subtitle-2 mb-2">Sincronizar com:</div>
            <v-switch
              v-model="appointmentForm.syncWithGoogle"
              label="Google Calendar"
              color="blue"
              density="compact"
            />
            <v-switch
              v-model="appointmentForm.syncWithApple"
              label="Apple Calendar (iCloud)"
              color="grey"
              density="compact"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeAppointmentDialog">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            @click="saveAppointment"
          >
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

// Data
const appointments = ref<any[]>([])
const patients = ref<any[]>([])
const selectedView = ref('week')
const selectedStatus = ref(null)
const selectedPatient = ref(null)
const currentDate = ref(new Date())
const appointmentDialog = ref(false)
const editingAppointment = ref<any>(null)
const saving = ref(false)

const appointmentForm = ref({
  patientId: '',
  userId: 'default-user-id', // TODO: Pegar do contexto de autenticação
  title: '',
  description: '',
  startDate: '',
  startTime: '',
  duration: 60,
  type: 'CONSULTATION',
  location: '',
  isOnline: false,
  notes: '',
  syncWithGoogle: false,
  syncWithApple: false,
})

// Options
const viewOptions = [
  { title: 'Dia', value: 'day' },
  { title: 'Semana', value: 'week' },
  { title: 'Mês', value: 'month' },
]

const statusOptions = [
  { title: 'Agendado', value: 'SCHEDULED' },
  { title: 'Confirmado', value: 'CONFIRMED' },
  { title: 'Concluído', value: 'COMPLETED' },
  { title: 'Cancelado', value: 'CANCELLED' },
  { title: 'Faltou', value: 'NO_SHOW' },
]

const typeOptions = [
  { title: 'Consulta', value: 'CONSULTATION' },
  { title: 'Exame', value: 'EXAM' },
  { title: 'Retorno', value: 'FOLLOWUP' },
  { title: 'Outro', value: 'OTHER' },
]

// Computed
const currentPeriodLabel = computed(() => {
  const date = currentDate.value
  if (selectedView.value === 'day') {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } else if (selectedView.value === 'week') {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
  } else {
    return date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
  }
})

const filteredAppointments = computed(() => {
  let filtered = appointments.value

  // Filtrar por período
  const { startDate, endDate } = getPeriodRange()
  filtered = filtered.filter(app => {
    const appDate = new Date(app.startTime)
    return appDate >= startDate && appDate <= endDate
  })

  // Filtrar por status
  if (selectedStatus.value) {
    filtered = filtered.filter(app => app.status === selectedStatus.value)
  }

  // Filtrar por paciente
  if (selectedPatient.value) {
    filtered = filtered.filter(app => app.patientId === selectedPatient.value)
  }

  // Ordenar por data/hora
  filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  return filtered
})

// Methods
function getPeriodRange() {
  const date = new Date(currentDate.value)
  let startDate = new Date(date)
  let endDate = new Date(date)

  if (selectedView.value === 'day') {
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
  } else if (selectedView.value === 'week') {
    startDate.setDate(date.getDate() - date.getDay())
    startDate.setHours(0, 0, 0, 0)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)
  } else {
    startDate = new Date(date.getFullYear(), date.getMonth(), 1)
    endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  return { startDate, endDate }
}

function previousPeriod() {
  const date = new Date(currentDate.value)
  if (selectedView.value === 'day') {
    date.setDate(date.getDate() - 1)
  } else if (selectedView.value === 'week') {
    date.setDate(date.getDate() - 7)
  } else {
    date.setMonth(date.getMonth() - 1)
  }
  currentDate.value = date
}

function nextPeriod() {
  const date = new Date(currentDate.value)
  if (selectedView.value === 'day') {
    date.setDate(date.getDate() + 1)
  } else if (selectedView.value === 'week') {
    date.setDate(date.getDate() + 7)
  } else {
    date.setMonth(date.getMonth() + 1)
  }
  currentDate.value = date
}

function goToToday() {
  currentDate.value = new Date()
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    SCHEDULED: 'blue',
    CONFIRMED: 'green',
    COMPLETED: 'grey',
    CANCELLED: 'red',
    NO_SHOW: 'orange',
  }
  return colors[status] || 'grey'
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    CONSULTATION: 'primary',
    EXAM: 'purple',
    FOLLOWUP: 'teal',
    OTHER: 'grey',
  }
  return colors[type] || 'grey'
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    CONSULTATION: 'Consulta',
    EXAM: 'Exame',
    FOLLOWUP: 'Retorno',
    OTHER: 'Outro',
  }
  return labels[type] || type
}

function openNewAppointmentDialog() {
  editingAppointment.value = null
  appointmentForm.value = {
    patientId: '',
    userId: 'default-user-id',
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    duration: 60,
    type: 'CONSULTATION',
    location: '',
    isOnline: false,
    notes: '',
    syncWithGoogle: false,
    syncWithApple: false,
  }
  appointmentDialog.value = true
}

function openAppointmentDetails(appointment: any) {
  console.log('Detalhes do agendamento:', appointment)
}

function editAppointment(appointment: any) {
  editingAppointment.value = appointment
  const startDate = new Date(appointment.startTime)
  appointmentForm.value = {
    patientId: appointment.patientId,
    userId: appointment.userId,
    title: appointment.title,
    description: appointment.description || '',
    startDate: startDate.toISOString().split('T')[0],
    startTime: startDate.toTimeString().slice(0, 5),
    duration: appointment.duration,
    type: appointment.type,
    location: appointment.location || '',
    isOnline: appointment.isOnline,
    notes: appointment.notes || '',
    syncWithGoogle: !!appointment.googleEventId,
    syncWithApple: !!appointment.appleEventId,
  }
  appointmentDialog.value = true
}

function closeAppointmentDialog() {
  appointmentDialog.value = false
  editingAppointment.value = null
}

async function saveAppointment() {
  saving.value = true
  try {
    const startDateTime = new Date(`${appointmentForm.value.startDate}T${appointmentForm.value.startTime}`)
    const endDateTime = new Date(startDateTime.getTime() + appointmentForm.value.duration * 60000)

    const payload = {
      ...appointmentForm.value,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    }

    if (editingAppointment.value) {
      await axios.put(`${API_URL}/appointments/${editingAppointment.value.id}`, payload)
    } else {
      await axios.post(`${API_URL}/appointments`, payload)
    }

    await loadAppointments()
    closeAppointmentDialog()
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error)
    alert('Erro ao salvar agendamento')
  } finally {
    saving.value = false
  }
}

async function deleteAppointment(appointment: any) {
  if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return

  try {
    await axios.delete(`${API_URL}/appointments/${appointment.id}`)
    await loadAppointments()
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error)
    alert('Erro ao cancelar agendamento')
  }
}

async function downloadICS(appointmentId: string) {
  try {
    const response = await axios.get(`${API_URL}/appointments/${appointmentId}/ics`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `agendamento-${appointmentId}.ics`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Erro ao baixar arquivo .ics:', error)
    alert('Erro ao baixar arquivo de calendário')
  }
}

async function loadAppointments() {
  try {
    const response = await axios.get(`${API_URL}/appointments`)
    appointments.value = response.data
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error)
  }
}

async function loadPatients() {
  try {
    const response = await axios.get(`${API_URL}/patients`)
    patients.value = response.data
  } catch (error) {
    console.error('Erro ao carregar pacientes:', error)
  }
}

onMounted(() => {
  loadAppointments()
  loadPatients()
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
