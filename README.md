# Beach Manager

Aplicación web de gestión de sombrillas y tumbonas de playa. Desarrollada por Claude (Anthropic) como herramienta de uso interno para un trabajador de playa.

PWA mobile-first con backend Node.js, base de datos SQLite y exportación PDF.

---

## Requisitos

- Docker y Docker Compose instalados
- Puerto 3000 disponible (configurable)

---

## Instalación

### 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el `.env` con tus valores:

```env
JWT_SECRET=una_clave_larga_y_aleatoria
ADMIN_PASSWORD=tu_contraseña
PORT=3000
```

### 2. Levantar la aplicación

```bash
docker-compose up -d --build
```

La primera vez tardará unos minutos en descargar las imágenes base y compilar el frontend.

### 3. Acceder

```
http://localhost:3000
```

O desde otro dispositivo en la misma red:

```
http://<IP-del-servidor>:3000
```

---

## Instalar como app en el móvil (PWA)

**Android (Chrome):** Menú → "Añadir a pantalla de inicio"

**iOS (Safari):** Botón compartir → "Añadir a pantalla de inicio"

---

## Uso

| Pantalla | Función |
|----------|---------|
| **Playa** | Vista general de todas las sombrillas. Toca una para abrir su comanda |
| **Resumen** | Ingresos del día actual y exportar PDF |
| **Historial** | Consultar y exportar días anteriores |
| **Ajustes** | Precio por defecto, carta de consumiciones, nombre de la playa |

### Estados de una comanda

- **Reservado** — cliente con reserva, aún no ha llegado
- **Pendiente** — ocupada, pendiente de cobro
- **Pagado** — cobrado directamente
- **Pagado en mesa** — cobrado junto con consumición en mesa
- **Invitado** — sin cargo, no computa en ingresos

### Sombrillas

- 500–530: sombrillas normales ☂️
- 531–539: balinesas 🛏️ (precio libre por comanda)

Una misma sombrilla puede tener varios turnos en el mismo día. Al cerrar un turno los ingresos se conservan y la sombrilla queda libre para el siguiente cliente.

---

## Mantenimiento

### Ver logs

```bash
docker-compose logs -f backend
```

### Reiniciar

```bash
docker-compose restart
```

### Parar

```bash
docker-compose down
```

### Backup de la base de datos

Los datos se guardan en `./data/beach.db`. Basta con copiar ese archivo.

### Restablecer contraseña

Edita el `.env` y reinicia el backend:

```bash
docker-compose restart backend
```

### Empezar desde cero

```bash
docker-compose down
rm -rf ./data
docker-compose up -d
```

---

## Stack

- **Frontend:** React + Tailwind CSS + Vite (servido con Nginx)
- **Backend:** Node.js + Express
- **Base de datos:** SQLite (via better-sqlite3)
- **PDF:** pdfkit
- **Auth:** JWT