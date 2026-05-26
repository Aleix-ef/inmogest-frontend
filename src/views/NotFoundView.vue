<template>
  <main class="not-found-page text-center">
    <section>
      <p class="display-1 fw-bold text-success mb-0">404</p>
      <h1>Página no encontrada</h1>
      <p class="text-secondary">La ruta que buscas no existe o ya no está disponible.</p>
      <RouterLink class="btn btn-success" to="/">Volver al inicio</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.not-found-page {
  min-height: 420px;
  place-items: center;
}
</style>
