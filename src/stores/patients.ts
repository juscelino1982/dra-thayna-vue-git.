import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export interface Patient {
  id: string
  fullName: string
  email?: string
  phone: string
  birthDate?: Date
  bloodType?: string
  city?: string
  state?: string
  allergies?: string
  currentMedications?: string
  medicalHistory?: string
  consultations?: any[]
  reports?: any[]
  exams?: any[]
  createdAt: Date
}

export const usePatientsStore = defineStore('patients', () => {
  const patients = ref<Patient[]>([])
  const currentPatient = ref<Patient | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPatients() {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get('/api/patients')
      patients.value = response.data
    } catch (err: any) {
      error.value = err.message
      console.error('Erro ao buscar pacientes:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchPatient(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get(`/api/patients/${id}`)
      currentPatient.value = response.data
    } catch (err: any) {
      error.value = err.message
      console.error('Erro ao buscar paciente:', err)
    } finally {
      loading.value = false
    }
  }

  async function createPatient(patientData: Partial<Patient>) {
    loading.value = true
    error.value = null
    try {
      const response = await axios.post('/api/patients', patientData)
      patients.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.message
      console.error('Erro ao criar paciente:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function uploadExam(patientId: string, file: File) {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('patientId', patientId)

      const response = await axios.post('/api/exams/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      await fetchPatient(patientId)
      return response.data
    } catch (err: any) {
      error.value = err.message
      console.error('Erro ao fazer upload do exame:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchExamById(examId: string) {
    try {
      const response = await axios.get(`/api/exams/${examId}`)
      return response.data
    } catch (err: any) {
      console.error('Erro ao buscar exame:', err)
      throw err
    }
  }

  async function deleteExam(patientId: string, examId: string) {
    loading.value = true
    error.value = null
    try {
      await axios.delete(`/api/exams/${examId}`)
      await fetchPatient(patientId)
    } catch (err: any) {
      error.value = err.message
      console.error('Erro ao deletar exame:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function reprocessExam(patientId: string, examId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await axios.post(`/api/exams/${examId}/reprocess`)
      await fetchPatient(patientId)
      return response.data
    } catch (err: any) {
      error.value = err.message
      console.error('Erro ao reprocessar exame:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    patients,
    currentPatient,
    loading,
    error,
    fetchPatients,
    fetchPatient,
    createPatient,
    uploadExam,
    deleteExam,
    reprocessExam,
    fetchExamById,
  }
})
