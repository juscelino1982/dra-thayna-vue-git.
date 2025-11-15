<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { usePatientsStore } from '@/stores/patients'
import { useRouter } from 'vue-router'
import NewPatientDialog from '@/components/NewPatientDialog.vue'

const store = usePatientsStore()
const router = useRouter()
const search = ref('')
const showNewPatientDialog = ref(false)

onMounted(() => {
  store.fetchPatients()
})

const filteredPatients = computed(() => {
  if (!search.value) return store.patients
  const searchLower = search.value.toLowerCase()
  return store.patients.filter(p =>
    p.fullName.toLowerCase().includes(searchLower) ||
    p.phone.includes(searchLower) ||
    p.email?.toLowerCase().includes(searchLower)
  )
})

function viewPatient(id: string) {
  router.push(`/pacientes/${id}`)
}

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

function handlePatientCreated(patient: any) {
  viewPatient(patient.id)
}
</script>

<template>
  <v-container fluid class="pa-6">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-6">
          <div>
            <h1 class="text-h3 font-weight-bold mb-2">Pacientes</h1>
            <p class="text-subtitle-1 text-grey-darken-1">
              {{ store.patients.length }} pacientes cadastrados
            </p>
          </div>
          <v-btn color="primary" size="large" prepend-icon="mdi-account-plus" @click="showNewPatientDialog = true">
            Novo Paciente
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title>
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Buscar paciente"
              single-line
              hide-details
              clearable
              variant="outlined"
              density="comfortable"
            ></v-text-field>
          </v-card-title>

          <v-divider></v-divider>

          <v-card-text v-if="store.loading" class="text-center pa-12">
            <v-progress-circular
              indeterminate
              color="primary"
              size="64"
            ></v-progress-circular>
            <p class="mt-4 text-grey-darken-1">Carregando pacientes...</p>
          </v-card-text>

          <v-card-text v-else-if="store.error" class="text-center pa-12">
            <v-icon icon="mdi-alert-circle" size="64" color="error"></v-icon>
            <p class="mt-4 text-error">{{ store.error }}</p>
          </v-card-text>

          <v-card-text v-else-if="filteredPatients.length === 0" class="text-center pa-12">
            <v-icon icon="mdi-account-search" size="64" color="grey"></v-icon>
            <p class="mt-4 text-grey-darken-1">
              {{ search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado' }}
            </p>
          </v-card-text>

          <v-list v-else lines="three">
            <template v-for="(patient, index) in filteredPatients" :key="patient.id">
              <v-list-item @click="viewPatient(patient.id)" class="py-4">
                <template v-slot:prepend>
                  <v-avatar color="primary" size="56">
                    <span class="text-h6 font-weight-bold">{{ getInitials(patient.fullName) }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title class="text-h6 font-weight-bold mb-1">
                  {{ patient.fullName }}
                </v-list-item-title>

                <v-list-item-subtitle class="mb-2">
                  <v-icon icon="mdi-phone" size="small" class="mr-1"></v-icon>
                  {{ patient.phone }}
                  <span v-if="patient.email" class="ml-4">
                    <v-icon icon="mdi-email" size="small" class="mr-1"></v-icon>
                    {{ patient.email }}
                  </span>
                </v-list-item-subtitle>

                <v-list-item-subtitle>
                  <v-chip
                    v-if="calculateAge(patient.birthDate)"
                    size="small"
                    class="mr-2"
                    prepend-icon="mdi-cake"
                  >
                    {{ calculateAge(patient.birthDate) }} anos
                  </v-chip>
                  <v-chip
                    v-if="patient.bloodType"
                    size="small"
                    class="mr-2"
                    prepend-icon="mdi-water"
                    color="error"
                  >
                    {{ patient.bloodType }}
                  </v-chip>
                  <v-chip
                    v-if="patient.city"
                    size="small"
                    prepend-icon="mdi-map-marker"
                  >
                    {{ patient.city }}, {{ patient.state }}
                  </v-chip>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    icon="mdi-chevron-right"
                    variant="text"
                  ></v-btn>
                </template>
              </v-list-item>

              <v-divider v-if="index < filteredPatients.length - 1"></v-divider>
            </template>
          </v-list>
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
.v-list-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.v-list-item:hover {
  background-color: rgba(16, 185, 129, 0.05);
}
</style>
