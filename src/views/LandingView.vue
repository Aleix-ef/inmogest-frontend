<template>
  <main class="landing-page">
    <section class="landing-hero">
      <div class="row align-items-center g-4">
        <div class="col-lg-6">
          <span class="badge rounded-pill text-bg-success mb-3">Gestión inmobiliaria integral</span>
          <h1>Controla propiedades, contratos, pagos y documentos desde un solo panel</h1>
          <p class="lead text-secondary">
            InmoGest ayuda a propietarios y gestores a organizar alquileres, inquilinos, cobros y documentación con una interfaz clara y segura.
          </p>
          <div class="d-flex flex-wrap gap-2 mt-4">
            <RouterLink class="btn btn-success btn-lg" to="/register">Crear cuenta</RouterLink>
            <RouterLink class="btn btn-outline-success btn-lg" to="/login">Iniciar sesión</RouterLink>
          </div>
        </div>

        <div class="col-lg-6">
          <div id="landingCarousel" class="carousel slide landing-carousel" data-bs-ride="carousel">
            <div class="carousel-indicators">
              <button type="button" data-bs-target="#landingCarousel" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Propiedades"></button>
              <button type="button" data-bs-target="#landingCarousel" data-bs-slide-to="1" aria-label="Contratos"></button>
              <button type="button" data-bs-target="#landingCarousel" data-bs-slide-to="2" aria-label="Documentos"></button>
            </div>

            <div class="carousel-inner rounded-3">
              <div class="carousel-item active">
                <div class="carousel-panel panel-properties">
                  <div class="dashboard-card wide"></div>
                  <div class="dashboard-card"></div>
                  <div class="dashboard-card"></div>
                  <h2>Propiedades siempre localizadas</h2>
                  <p>Estado, precio, dirección y detalles de cada inmueble en una vista rápida.</p>
                </div>
              </div>

              <div class="carousel-item">
                <div class="carousel-panel panel-contracts">
                  <div class="timeline-line"></div>
                  <div class="timeline-dot dot-1"></div>
                  <div class="timeline-dot dot-2"></div>
                  <div class="timeline-dot dot-3"></div>
                  <h2>Contratos y pagos bajo control</h2>
                  <p>Relaciona contratos con inquilinos, propiedades y pagos sin perder trazabilidad.</p>
                </div>
              </div>

              <div class="carousel-item">
                <div class="carousel-panel panel-documents">
                  <div class="document-stack doc-a"></div>
                  <div class="document-stack doc-b"></div>
                  <div class="document-stack doc-c"></div>
                  <h2>Documentación ordenada</h2>
                  <p>Guarda archivos asociados a propiedades, contratos o inquilinos.</p>
                </div>
              </div>
            </div>

            <button class="carousel-control-prev" type="button" data-bs-target="#landingCarousel" data-bs-slide="prev">
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Anterior</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#landingCarousel" data-bs-slide="next">
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Siguiente</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="row g-3 landing-features">
      <div class="col-md-4">
        <article class="feature-card">
          <h2>Roles y seguridad</h2>
          <p>Acceso con Sanctum y permisos diferenciados entre propietarios y gestores.</p>
        </article>
      </div>
      <div class="col-md-4">
        <article class="feature-card">
          <h2>Flujo completo</h2>
          <p>Desde el inmueble hasta el contrato, sus pagos y la documentación asociada.</p>
        </article>
      </div>
      <div class="col-md-4">
        <article class="feature-card">
          <h2>Datos claros</h2>
          <p>Estadísticas básicas para consultar ocupación, cobros y actividad general.</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.landing-page {
  gap: 28px;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.landing-hero {
  padding: 42px;
  color: var(--color-text);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 62%),
    var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.landing-hero h1 {
  max-width: 680px;
  color: var(--color-text);
  font-size: clamp(2.3rem, 4vw, 4.4rem);
  line-height: 1.02;
}

.landing-hero :deep(.text-secondary),
.feature-card p {
  color: var(--color-muted) !important;
}

.landing-carousel {
  min-height: 390px;
}

.landing-carousel .carousel-inner,
.landing-carousel .carousel-item,
.landing-carousel .carousel-panel {
  height: 390px;
}

.landing-carousel .carousel-indicators {
  gap: 8px;
  margin-bottom: 16px;
}

.landing-carousel .carousel-indicators [data-bs-target] {
  width: 34px;
  height: 4px;
  min-height: 4px;
  padding: 0;
  margin: 0;
  background-color: rgba(255, 255, 255, 0.58);
  border: 0;
  border-radius: 999px;
  opacity: 1;
}

.landing-carousel .carousel-indicators .active {
  background-color: #ffffff;
}

.carousel-panel {
  position: relative;
  padding: 34px;
  color: #ffffff;
  background: #1f2937;
}

.carousel-panel::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: '';
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.38) 55%, rgba(0, 0, 0, 0.68) 100%);
}

.carousel-panel h2,
.carousel-panel p {
  position: relative;
  z-index: 2;
  max-width: 330px;
}

.carousel-panel h2 {
  margin-top: 210px;
  color: #ffffff;
  font-size: 1.65rem;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.42);
}

.carousel-panel p {
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

.panel-properties {
  background: linear-gradient(135deg, #0f766e, #1f2937);
}

.panel-contracts {
  background: linear-gradient(135deg, #2563eb, #172554);
}

.panel-documents {
  background: linear-gradient(135deg, #4c1d95, #1f2937);
}

.dashboard-card {
  position: absolute;
  top: 72px;
  right: 40px;
  width: 150px;
  height: 92px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  backdrop-filter: blur(6px);
}

.dashboard-card.wide {
  top: 42px;
  right: 124px;
  width: 240px;
  height: 124px;
}

.dashboard-card:nth-child(2) {
  top: 190px;
  right: 205px;
}

.timeline-line,
.timeline-dot {
  position: absolute;
  z-index: 1;
}

.timeline-line {
  top: 112px;
  right: 76px;
  left: 76px;
  height: 8px;
  background: rgba(255, 255, 255, 0.32);
  border-radius: 999px;
}

.timeline-dot {
  top: 88px;
  width: 56px;
  height: 56px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.25);
}

.dot-1 {
  left: 70px;
}

.dot-2 {
  left: 50%;
}

.dot-3 {
  right: 70px;
}

.document-stack {
  position: absolute;
  z-index: 0;
  width: 170px;
  height: 210px;
  background: rgba(255, 255, 255, 0.76);
  border-radius: 8px;
  box-shadow: 0 18px 35px rgba(0, 0, 0, 0.22);
}

.landing-carousel .carousel-control-prev,
.landing-carousel .carousel-control-next,
.landing-carousel .carousel-control-prev + .carousel-control-next {
  width: 48px;
  min-height: 48px;
  padding: 0;
  top: 50%;
  bottom: auto;
  margin: 0 12px;
  background: rgba(17, 24, 39, 0.42);
  border: 0;
  border-radius: 50%;
  color: #ffffff;
  opacity: 1;
  transform: translateY(-50%);
}

.landing-carousel .carousel-control-prev:hover,
.landing-carousel .carousel-control-next:hover {
  background: rgba(17, 24, 39, 0.64);
}

.landing-carousel .carousel-control-prev-icon,
.landing-carousel .carousel-control-next-icon {
  width: 1.3rem;
  height: 1.3rem;
}

.doc-a {
  top: 50px;
  right: 70px;
  transform: rotate(7deg);
}

.doc-b {
  top: 72px;
  right: 150px;
  transform: rotate(-8deg);
}

.doc-c {
  top: 96px;
  right: 230px;
  transform: rotate(4deg);
}

.feature-card {
  height: 100%;
  padding: 22px;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.feature-card h2 {
  color: var(--color-primary-dark);
}

@media (max-width: 760px) {
  .landing-hero {
    padding: 24px;
  }

  .carousel-panel {
    height: 340px;
  }

  .landing-carousel .carousel-inner,
  .landing-carousel .carousel-item,
  .landing-carousel .carousel-panel {
    height: 340px;
  }

  .carousel-panel h2 {
    margin-top: 185px;
  }

  .dashboard-card.wide,
  .document-stack {
    right: 42px;
  }
}
</style>
