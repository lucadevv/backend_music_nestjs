# Guía de Testing - Music App API

## Optimizaciones Implementadas

### 1. Caché Redis
- **Configurado**: Caché global con Redis
- **TTL por endpoint**:
  - `/explore`, `/categories`, `/genres`: 30 minutos
  - `/for-you`, `/recently-listened`: 5 minutos
  - Otros endpoints: 10 minutos
- **Clave de caché**: Incluye URL, query params y userId (si está autenticado)

### 2. Rate Limiting
- **Configurado**: ThrottlerModule global
- **Límite**: 100 requests por minuto por IP
- **TTL**: 60 segundos
- **Protección**: Aplicada a todos los endpoints

### 3. Índices de Base de Datos
- **Songs**: `title+artist`, `videoId`, `createdAt`, `likeCount`, `playCount`
- **RecentSearch**: `userId+query`, `userId+createdAt`, `userId+lastSearchedAt`, `lastSearchedAt`
- **Favorites**: Índices en `userId` y relaciones

## Scripts de Testing

### Script Automatizado (Bash)

```bash
./test-api.sh
```

Este script prueba:
1. ✅ Endpoints públicos (health, register, login, refresh)
2. ✅ Endpoints de autenticación protegidos (me, logout)
3. ✅ Endpoints de música protegidos
4. ✅ Endpoints de biblioteca protegidos
5. ✅ Manejo de errores (sin token, token inválido)

### Testing Manual con cURL

#### 1. Health Check (Público)
```bash
curl -X GET http://localhost:3000/api/health
```

#### 2. Registrar Usuario (Público)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### 3. Login (Público)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Guarda el `accessToken` y `refreshToken` de la respuesta**

#### 4. Obtener Perfil (Protegido)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 5. Explorar Música (Protegido)
```bash
curl -X GET http://localhost:3000/api/music/explore \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 6. Buscar Música (Protegido)
```bash
curl -X GET "http://localhost:3000/api/music/search?q=rock&filter=songs" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 7. Obtener Búsquedas Recientes (Protegido)
```bash
curl -X GET "http://localhost:3000/api/music/recent-searches?limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 8. Agregar Canción a Favoritos (Protegido)
```bash
curl -X POST http://localhost:3000/api/library/songs \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ"
  }'
```

#### 9. Obtener Canciones Favoritas (Protegido)
```bash
curl -X GET "http://localhost:3000/api/library/songs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 10. Refresh Token (Público)
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 11. Logout (Protegido)
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Testing de Errores

#### Sin Token (Debería retornar 401)
```bash
curl -X GET http://localhost:3000/api/auth/me
```

#### Token Inválido (Debería retornar 401)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid_token_12345"
```

## Testing con Swagger UI

1. Inicia la aplicación
2. Abre tu navegador en: `http://localhost:3000/api/docs`
3. Haz clic en "Authorize" (botón verde arriba)
4. Ingresa tu token JWT: `Bearer YOUR_ACCESS_TOKEN`
5. Prueba todos los endpoints desde la interfaz

## Endpoints Disponibles

### Públicos (Sin autenticación)
- `GET /health` - Health check
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Renovar token
- `GET /auth/google` - OAuth Google
- `GET /auth/apple` - OAuth Apple

### Protegidos (Requieren JWT)
- `GET /auth/me` - Obtener perfil
- `POST /auth/logout` - Cerrar sesión
- `GET /music/explore` - Explorar música
- `GET /music/search` - Buscar música
- `GET /music/recent-searches` - Búsquedas recientes
- `GET /music/for-you` - Contenido personalizado
- `GET /music/recently-listened` - Recién escuchadas
- `GET /music/categories` - Categorías
- `GET /music/genres` - Géneros
- `GET /library/summary` - Resumen de biblioteca
- `GET /library/songs` - Canciones favoritas
- `POST /library/songs` - Agregar canción favorita
- Y más...

## Verificar Caché

Para verificar que el caché está funcionando:

1. Primera petición (sin caché):
```bash
time curl -X GET http://localhost:3000/api/music/explore \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

2. Segunda petición (con caché, debería ser más rápida):
```bash
time curl -X GET http://localhost:3000/api/music/explore \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Verificar Rate Limiting

Intenta hacer más de 100 requests en un minuto:

```bash
for i in {1..110}; do
  curl -X GET http://localhost:3000/api/health
  echo "Request $i"
done
```

Después de 100 requests, deberías recibir un error 429 (Too Many Requests).

## Notas

- Asegúrate de que Redis esté corriendo: `docker-compose up -d redis`
- Asegúrate de que PostgreSQL esté corriendo: `docker-compose up -d postgres`
- El caché se limpia automáticamente después del TTL configurado
- Los tokens JWT expiran después de 15 minutos (configurable en `.env`)
