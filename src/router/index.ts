import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/pacientes',
      name: 'patients',
      component: () => import('@/views/PatientsPage.vue'),
    },
    {
      path: '/pacientes/:id',
      name: 'patient-detail',
      component: () => import('@/views/PatientDetailPage.vue'),
    },
  ],
})

export default router
