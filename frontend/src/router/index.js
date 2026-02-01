import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Auth views
import LoginView from '../views/auth/LoginView.vue'
import SignupView from '../views/auth/SignupView.vue'
import InviteAcceptView from '../views/auth/InviteAcceptView.vue'

// Main views
import DashboardView from '../views/DashboardView.vue'
import FilesView from '../views/FilesView.vue'
import RecordsView from '../views/RecordsView.vue'
import ClientsView from '../views/ClientsView.vue'
import MergeJobsView from '../views/MergeJobsView.vue'
import MergeResultView from '../views/MergeResultView.vue'
import ProfileView from '../views/ProfileView.vue'

const routes = [
  // Public routes
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true }
  },
  {
    path: '/signup',
    name: 'signup',
    component: SignupView,
    meta: { guest: true }
  },
  {
    path: '/invite/:token',
    name: 'invite-accept',
    component: InviteAcceptView,
    meta: { guest: true }
  },

  // Protected routes
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/files',
    name: 'files',
    component: FilesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/records',
    name: 'records',
    component: RecordsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/records/:fileId',
    name: 'file-records',
    component: RecordsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/clients',
    name: 'clients',
    component: ClientsView,
    meta: { requiresAuth: true, requiresRole: 'accountant' }
  },
  {
    path: '/merge',
    name: 'merge-jobs',
    component: MergeJobsView,
    meta: { requiresAuth: true, requiresRole: 'accountant' }
  },
  {
    path: '/merge/:jobId',
    name: 'merge-result',
    component: MergeResultView,
    meta: { requiresAuth: true, requiresRole: 'accountant' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },

  // Catch-all redirect
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth to initialize on first load
  if (authStore.loading && !authStore.user) {
    await authStore.initialize()
  }

  const isAuthenticated = authStore.isAuthenticated
  const userRole = authStore.profile?.role

  // Check if route requires authentication
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // Check if route requires specific role
  if (to.meta.requiresRole && userRole !== to.meta.requiresRole) {
    // Redirect to dashboard if wrong role
    return next({ name: 'dashboard' })
  }

  // Redirect authenticated users away from guest-only pages
  if (to.meta.guest && isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
