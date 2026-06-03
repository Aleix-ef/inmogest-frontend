import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/StatsView.vue'),
      meta: { roles: ['owner', 'manager'] },
    },
    {
      path: '/properties',
      name: 'properties',
      component: () => import('../views/PropertiesView.vue'),
      meta: { roles: ['owner', 'manager'] },
    },
    {
      path: '/tenants',
      name: 'tenants',
      component: () => import('../views/TenantsView.vue'),
      meta: { roles: ['owner', 'manager'] },
    },
    {
      path: '/owners',
      name: 'owners',
      component: () => import('../views/OwnersView.vue'),
      meta: { roles: ['manager'] },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
      meta: { roles: ['manager'] },
    },
    {
      path: '/contracts',
      name: 'contracts',
      component: () => import('../views/ContractsView.vue'),
      meta: { roles: ['owner', 'manager'] },
    },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('../views/PaymentsView.vue'),
      meta: { roles: ['owner', 'manager'] },
    },
    {
      path: '/documents',
      name: 'documents',
      component: () => import('../views/DocumentsView.vue'),
      meta: { roles: ['owner', 'manager'] },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const publicRoutes = ['landing', 'login', 'register', 'not-found']
  const isPublicRoute = publicRoutes.includes(to.name)
  const authStore = useAuthStore()
  const hasUser = authStore.isLoggedIn

  // Los guards del frontend mejoran la UX; el backend sigue aplicando los permisos reales.
  if (!hasUser && !isPublicRoute) {
    return { name: 'login' }
  }

  if (hasUser && isPublicRoute) {
    return { name: 'dashboard' }
  }

  if (hasUser && to.meta.roles && !to.meta.roles.includes(authStore.role)) {
    return { name: 'dashboard' }
  }
})

export default router
