<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { usePatientsStore } from '@/stores/patients'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'patient-created': [patient: any]
}>()

const store = usePatientsStore()

const formData = ref({
  fullName: '',
  email: '',
  phone: '',
  birthDate: '',
  bloodType: '',
  city: '',
  state: '',
  allergies: '',
  currentMedications: '',
  medicalHistory: '',
})

const valid = ref(false)
const saving = ref(false)

const calculatedAge = computed(() => {
  if (!formData.value.birthDate) return null
  const birth = new Date(formData.value.birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
})

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

const rules = {
  required: (v: string) => !!v || 'Campo obrigatório',
  email: (v: string) => !v || /.+@.+\..+/.test(v) || 'Email inválido',
  phone: (v: string) => !!v || 'Telefone obrigatório',
}

function resetForm() {
  formData.value = {
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    bloodType: '',
    city: '',
    state: '',
    allergies: '',
    currentMedications: '',
    medicalHistory: '',
  }
  valid.value = false
}

async function handleSubmit() {
  if (!valid.value) return

  saving.value = true
  try {
    const patientData: any = {
      fullName: formData.value.fullName,
      phone: formData.value.phone,
    }

    if (formData.value.email) patientData.email = formData.value.email
    if (formData.value.birthDate) patientData.birthDate = new Date(formData.value.birthDate)
    if (formData.value.bloodType) patientData.bloodType = formData.value.bloodType
    if (formData.value.city) patientData.city = formData.value.city
    if (formData.value.state) patientData.state = formData.value.state
    if (formData.value.allergies) patientData.allergies = formData.value.allergies
    if (formData.value.currentMedications) patientData.currentMedications = formData.value.currentMedications
    if (formData.value.medicalHistory) patientData.medicalHistory = formData.value.medicalHistory

    const newPatient = await store.createPatient(patientData)

    emit('patient-created', newPatient)
    emit('update:modelValue', false)
    resetForm()
  } catch (error) {
    console.error('Erro ao criar paciente:', error)
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('update:modelValue', false)
  resetForm()
}

watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="800" persistent>
    <v-card>
      <v-card-title class="bg-primary text-white d-flex align-center">
        <v-icon icon="mdi-account-plus" class="mr-2"></v-icon>
        Novo Paciente
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form v-model="valid" @submit.prevent="handleSubmit">
          <v-row>
            <v-col cols="12">
              <h3 class="text-h6 mb-4">Informações Básicas</h3>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.fullName"
                label="Nome Completo *"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                :rules="[rules.required]"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.phone"
                label="Telefone *"
                prepend-inner-icon="mdi-phone"
                variant="outlined"
                :rules="[rules.phone]"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.email"
                label="Email"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                :rules="[rules.email]"
                type="email"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.birthDate"
                label="Data de Nascimento"
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                type="date"
              >
                <template v-slot:append-inner v-if="calculatedAge">
                  <v-chip size="small" color="primary" prepend-icon="mdi-cake">
                    {{ calculatedAge }} anos
                  </v-chip>
                </template>
              </v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.bloodType"
                label="Tipo Sanguíneo"
                prepend-inner-icon="mdi-water"
                variant="outlined"
                :items="bloodTypes"
                clearable
              ></v-select>
            </v-col>

            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.city"
                label="Cidade"
                prepend-inner-icon="mdi-city"
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="formData.state"
                label="Estado"
                variant="outlined"
                :items="brazilianStates"
                clearable
              ></v-select>
            </v-col>

            <v-col cols="12">
              <v-divider class="my-4"></v-divider>
              <h3 class="text-h6 mb-4">Informações Médicas</h3>
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.allergies"
                label="Alergias"
                prepend-inner-icon="mdi-alert"
                variant="outlined"
                rows="2"
              ></v-textarea>
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.currentMedications"
                label="Medicações Atuais"
                prepend-inner-icon="mdi-pill"
                variant="outlined"
                rows="2"
              ></v-textarea>
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.medicalHistory"
                label="Histórico Médico"
                prepend-inner-icon="mdi-file-document"
                variant="outlined"
                rows="3"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-form>

        <v-alert v-if="store.error" type="error" class="mt-4">
          {{ store.error }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-6">
        <v-spacer></v-spacer>
        <v-btn
          @click="handleCancel"
          :disabled="saving"
          variant="text"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          @click="handleSubmit"
          :loading="saving"
          :disabled="!valid"
        >
          Criar Paciente
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
</style>
