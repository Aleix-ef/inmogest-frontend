# InmoGest Frontend

# Descripcion

InmoGest Frontend es la interfaz web de la aplicacion InmoGest, una plataforma para gestionar alquileres, propiedades, inquilinos, contratos, pagos, documentos y usuarios.

El frontend esta desarrollado con Vue y funciona como una SPA. Consume la API REST del backend Laravel mediante peticiones HTTP y utiliza autenticacion mediante token para acceder a las rutas privadas.

# Tabla de Contenidos

1. [Tecnologias utilizadas](#tecnologias-utilizadas)
2. [Puesta en marcha](#puesta-en-marcha)
3. [Variables de entorno](#variables-de-entorno)
4. [Entornos](#entornos)
5. [Scripts disponibles](#scripts-disponibles)
6. [Despliegue](#despliegue)
7. [Guia de Contribucion](#guia-de-contribucion)
8. [Documentacion de desarrollo](#documentacion-de-desarrollo)
9. [Licencia](#licencia)

## Tecnologias utilizadas

- **JavaScript**, **HTML** y **CSS** como base del frontend.
- **Vue** para crear la interfaz de usuario.
- **Vite** como herramienta de desarrollo y compilacion.
- **Vue Router** para la navegacion entre vistas.
- **Pinia** para la gestion del estado global.
- **Axios** para la comunicacion con el backend.
- **Bootstrap** para estilos y componentes responsive.
- **vee-validate** y **Yup** para validacion de formularios.
- **Vitest** para pruebas unitarias.

## Puesta en marcha

Antes de arrancar el frontend, el backend debe estar disponible en `http://127.0.0.1:8001/api` o se debe ajustar la variable `VITE_API_BASE_URL`.

Para instalar y ejecutar el frontend en local:

```bash
git clone git@github.com:Aleix-ef/inmogest-frontend.git
cd inmogest-frontend
npm install
cp .env.example .env
npm run dev
```

El frontend quedara disponible normalmente en:

```text
http://localhost:5173
```

## Variables de entorno

El frontend necesita conocer la URL base de la API:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
```

En produccion la API esta disponible en:

```text
https://api.inmogestsaas.com/api
```

## Entornos

- **Desarrollo local**: http://localhost:5173
- **Backend local**: http://127.0.0.1:8001/api
- **Produccion frontend**: https://inmogestsaas.com
- **Produccion API**: https://api.inmogestsaas.com/api

## Scripts disponibles

```bash
npm run dev
```

Levanta el servidor de desarrollo.

```bash
npm run build
```

Compila la aplicacion para produccion.

```bash
npm run preview
```

Sirve localmente la version compilada.

```bash
npm run test:unit
```

Ejecuta las pruebas unitarias.

## Despliegue

El frontend se despliega en una instancia EC2 de AWS. El proceso de produccion compila la aplicacion con Vite y Nginx sirve los archivos generados en la carpeta `dist`.

El despliegue automatico se realiza mediante GitHub Actions al hacer push sobre la rama `main`. El workflow se conecta por SSH al servidor, actualiza el codigo, instala dependencias, ejecuta `npm run build` y recarga Nginx.

## Guia de Contribucion

Cualquier contribucion al proyecto debera seguir las [normas de contribucion](CONTRIBUTING.md).

## Documentacion de desarrollo

- [Vue Docs](https://vuejs.org/guide/introduction.html)
- [Vite Docs](https://vite.dev/guide/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Axios](https://axios-http.com/docs/intro)
- [Bootstrap](https://getbootstrap.com/docs/5.3/)
- [vee-validate](https://vee-validate.logaretm.com/)
- [Yup](https://github.com/jquense/yup)
- [Vitest](https://vitest.dev/)

## Licencia

Proyecto desarrollado con finalidad academica para el Proyecto Final del ciclo de Desarrollo de Aplicaciones Web.
