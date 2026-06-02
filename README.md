# Beach Manager

Aplicación de gestión de tumbonas para playa. PWA mobile-first con backend Node.js, base de datos SQLite y exportación PDF.

## Requisitos

- Synology DS120j con **Docker** y **Docker Compose** instalados (desde el Centro de Paquetes del DSM)
- Acceso SSH al NAS

## Instalación en el DS120j

### 1. Copiar los archivos al NAS

Desde tu ordenador, copia la carpeta del proyecto al NAS (por ejemplo vía File Station o SCP):

```bash
scp -r beach-manager/ admin@<IP-DEL-NAS>:/volume1/docker/beach-manager
```

### 2. Configurar las variables de entorno

Conéctate al NAS por SSH y entra en la carpeta:

```bash
ssh admin@<IP-DEL-NAS>
cd /volume1/docker/beach-manager
cp .env.example .env
vi .env
```

Edita el `.env` con tus valores:

```env
JWT_SECRET=una_clave_larga_y_aleatoria_aqui
ADMIN_PASSWORD=tu_contraseña_segura
PORT=3000
```

### 3. Arrancar la aplicación

```bash
cd /volume1/docker/beach-manager
docker-compose up -d --build
```

La primera vez tardará unos minutos en descargar las imágenes base y compilar el frontend.

### 4. Acceder a la app

Abre el navegador en tu móvil y ve a:

```
http://<IP-DEL-NAS>:3000
```

Introduce la contraseña que configuraste en `ADMIN_PASSWORD`.

---

## Instalar como app en el móvil (PWA)

**Android (Chrome):**
1. Abre la URL en Chrome
2. Menú (⋮) → "Añadir a pantalla de inicio"

**iOS (Safari):**
1. Abre la URL en Safari
2. Botón compartir → "Añadir a pantalla de inicio"

---

## Uso diario

| Pantalla | Función |
|----------|---------|
| **Playa** | Vista general de todas las tumbonas. Toca una para gestionarla |
| **Resumen** | Ingresos del día actual + exportar PDF |
| **Historial** | Ver y exportar días anteriores |
| **Ajustes** | Precio diario, carta de consumiciones, nombre de la playa |

### Estados de una tumbona

- 🛏️ **Libre** → Se puede ocupar directamente o reservar
- 📋 **Reservada** → Esperando al cliente. Al llegar, hacer check-in
- 👤 **Ocupada** → Añadir consumiciones, aplicar reembolso parcial, liberar

### Reembolso parcial

Disponible siempre en tumbonas ocupadas. Se registra el importe devuelto y el motivo (opcional). El resumen descuenta automáticamente los reembolsos del total.

---

## Operaciones de mantenimiento

### Ver logs

```bash
docker-compose logs -f backend
```

### Reiniciar

```bash
docker-compose restart
```

### Backup de la base de datos

La base de datos está en un volumen Docker. Para hacer backup:

```bash
docker run --rm \
  -v beach-manager_beach-data:/data \
  -v /volume1/backup:/backup \
  alpine tar czf /backup/beach-db-$(date +%Y%m%d).tar.gz /data
```

### Actualizar la aplicación

```bash
cd /volume1/docker/beach-manager
git pull  # o copia los nuevos archivos
docker-compose up -d --build
```

### Parar la aplicación

```bash
docker-compose down
```

---

## Estructura del proyecto

```
beach-manager/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js          # Entry point Express
│       ├── db/index.js       # SQLite + schema
│       ├── middleware/auth.js # JWT
│       └── routes/
│           ├── auth.js
│           ├── settings.js
│           ├── products.js
│           ├── rentals.js    # Lógica principal
│           └── pdf.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── vite.config.js
    └── src/
        ├── api.js            # Cliente HTTP
        ├── App.jsx           # Router
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── BeachPage.jsx    # Mapa de tumbonas
        │   ├── SummaryPage.jsx  # Resumen del día
        │   ├── HistoryPage.jsx  # Histórico
        │   └── SettingsPage.jsx
        └── components/
            ├── UmbrellaCell.jsx   # Tumbona individual
            ├── UmbrellaModal.jsx  # Gestión completa
            ├── BottomNav.jsx
            └── ProtectedRoute.jsx
```

---

## Notas técnicas

- **Base de datos**: SQLite con WAL mode (mayor rendimiento en lecturas concurrentes)
- **Auth**: JWT con expiración de 12h — al llegar a la playa, abre la app y listo
- **PDF**: Generado en el servidor con pdfkit, descarga directa
- **Sin internet**: Una vez cargada, la PWA funciona offline para consulta (las escrituras requieren conexión al NAS)
