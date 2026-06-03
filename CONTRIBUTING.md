# Guia de Contribucion

Gracias por tu interes en contribuir a InmoGest Frontend. Para mantener una interfaz coherente y evitar romper la comunicacion con la API, se recomienda seguir estas pautas.

## Como Contribuir

1. **Reportar un problema**
   - Si encuentras un error visual o funcional, abre un issue en GitHub.
   - Indica pasos para reproducirlo, navegador utilizado, resolucion de pantalla y capturas si son utiles.

2. **Crear una rama de trabajo**
   - No trabajes directamente sobre `main`.
   - Crea una rama con un nombre claro:

     ```bash
     git checkout -b feature/nombre-funcionalidad
     ```

3. **Realizar cambios**
   - Mantener la estructura del proyecto:
     - `src/views` para vistas principales.
     - `src/components` para componentes reutilizables.
     - `src/stores` para estado global con Pinia.
     - `src/services` para comunicacion con la API.
     - `src/utils` para utilidades.
   - Mantener el estilo visual de la aplicacion.
   - Usar Bootstrap y los estilos existentes antes de crear soluciones nuevas.
   - Evitar duplicar logica que ya exista en stores, servicios o utilidades.

4. **Validaciones**
   - Usar vee-validate y Yup para formularios.
   - Mantener mensajes de error claros para el usuario.
   - Recordar que la validacion final tambien debe existir en backend.

5. **Pruebas**
   - Ejecutar las pruebas unitarias antes de abrir una Pull Request:

     ```bash
     npm run test:unit
     ```

   - Comprobar que la aplicacion compila correctamente:

     ```bash
     npm run build
     ```

6. **Pull Request**
   - Explicar claramente que se ha cambiado.
   - Indicar si afecta a rutas, formularios, stores, servicios de API o estilos.
   - Incluir capturas si el cambio afecta a la interfaz.

## Estilo de Codigo

- Mantener componentes y vistas con nombres claros.
- Evitar codigo duplicado.
- Mantener las llamadas a la API centralizadas en servicios.
- Usar Pinia para datos compartidos entre vistas.
- Respetar el modo oscuro y el diseño responsive.

## Seguridad

- No guardar credenciales en el repositorio.
- No exponer tokens manualmente.
- Mantener protegidas las rutas privadas desde el router.
- No confiar solo en el frontend para permisos: el backend debe validar siempre.

## Documentacion

Si un cambio afecta a instalacion, variables de entorno, scripts, rutas o despliegue, actualiza el README o la documentacion correspondiente.

## Contacto

Para dudas o incidencias, usar los issues del repositorio.
