# Docker Setup - Music App Backend

## 🚀 Inicio Rápido

### 1. Solo Base de Datos y Redis (Recomendado para desarrollo local)

Si prefieres correr la aplicación NestJS localmente pero usar Docker para PostgreSQL y Redis:

```bash
# Levantar solo PostgreSQL y Redis (por defecto solo levanta estos)
docker-compose up -d

# O explícitamente:
docker-compose up -d postgres redis

# Ver logs
docker-compose logs -f postgres redis

# Detener servicios
docker-compose down
```

**Configuración en `.env` para app local:**
```env
# Database (PostgreSQL)
DB_HOST=localhost  # ← localhost porque la app corre fuera de Docker
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_app

# Redis
REDIS_HOST=localhost  # ← localhost porque la app corre fuera de Docker
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 2. Todo en Docker (Aplicación + Base de Datos + Redis)

```bash
# Levantar todos los servicios (incluyendo la app NestJS)
docker-compose --profile app up -d

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f app

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ elimina datos)
docker-compose down -v
```

**Configuración en `.env` para todo en Docker:**
```env
# Database (PostgreSQL)
DB_HOST=postgres  # ← nombre del servicio en docker-compose
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_app

# Redis
REDIS_HOST=redis  # ← nombre del servicio en docker-compose
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 📝 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto. La configuración depende de cómo corras la aplicación:

#### Opción A: App NestJS Local + Docker para DB/Redis (Recomendado)

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# PostgreSQL
DB_HOST=localhost  # ← localhost porque la app corre fuera de Docker
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_app

# Redis
REDIS_HOST=localhost  # ← localhost porque la app corre fuera de Docker
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600
```

**Uso:**
```bash
# 1. Levantar solo PostgreSQL y Redis
docker-compose up -d

# 2. En otra terminal, correr la app NestJS localmente
npm run start:dev
```

#### Opción B: Todo en Docker

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# PostgreSQL
DB_HOST=postgres  # ← nombre del servicio en docker-compose
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=music_app

# Redis
REDIS_HOST=redis  # ← nombre del servicio en docker-compose
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600
```

**Uso:**
```bash
# Levantar todo incluyendo la app
docker-compose --profile app up -d
```

## 🔧 Comandos Útiles

### Base de Datos

```bash
# Conectar a PostgreSQL
docker-compose exec postgres psql -U postgres -d music_app

# Backup de la base de datos
docker-compose exec postgres pg_dump -U postgres music_app > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres music_app < backup.sql
```

### Redis

```bash
# Conectar a Redis CLI
docker-compose exec redis redis-cli

# Con password (si está configurado)
docker-compose exec redis redis-cli -a tu_password

# Limpiar Redis
docker-compose exec redis redis-cli FLUSHALL
```

### Aplicación

```bash
# Rebuild de la imagen
docker-compose build app

# Rebuild sin cache
docker-compose build --no-cache app

# Ver logs en tiempo real
docker-compose logs -f app

# Ejecutar comandos dentro del contenedor
docker-compose exec app npm run build
docker-compose exec app sh
```

## 🏥 Health Checks

Los servicios tienen health checks configurados:

- **PostgreSQL**: Verifica que esté listo para conexiones
- **Redis**: Verifica que responda a ping
- **App**: Verifica el endpoint `/api/health`

Puedes verificar el estado con:

```bash
docker-compose ps
```

## 📊 Monitoreo

### Ver uso de recursos

```bash
docker stats music_app_postgres music_app_redis music_app_backend
```

### Ver logs de todos los servicios

```bash
docker-compose logs --tail=100 -f
```

## 🔒 Seguridad

### Producción

Para producción, asegúrate de:

1. Cambiar todas las contraseñas por defecto
2. Usar secrets de Docker o variables de entorno seguras
3. Configurar redes internas apropiadas
4. Habilitar SSL/TLS para PostgreSQL si es necesario
5. Configurar firewall y restricciones de acceso

### Ejemplo de override para producción

Crea `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

  redis:
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

secrets:
  db_password:
    external: true
```

Luego usa:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Puerto ya en uso

Si los puertos están ocupados, puedes:

1. Cambiar los puertos en `.env`:
   ```env
   DB_PORT=5433
   REDIS_PORT=6380
   ```

2. O usar `docker-compose.override.yml` (se carga automáticamente)

### La app no puede conectar a la base de datos

- Verifica que los servicios estén corriendo: `docker-compose ps`
- Verifica que uses el nombre del servicio como host: `DB_HOST=postgres`
- Revisa los logs: `docker-compose logs postgres`

### Limpiar todo y empezar de nuevo

```bash
# Detener y eliminar contenedores, redes y volúmenes
docker-compose down -v

# Eliminar imágenes también
docker-compose down -v --rmi all
```

## 📚 Recursos

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
