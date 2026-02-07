# 📋 Documentación de Respuestas de la API

Este documento describe qué retorna cada endpoint de la API (excepto `/music/stream/:videoId` que tiene errores).

---

## 🎵 Endpoints de Música (`/api/music`)

### 1. `GET /api/music/explore`

**Descripción**: Explorar contenido: moods, géneros y charts

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "moods": [
    {
      "name": "Happy",
      "params": "happy"
    }
  ],
  "genres": [
    {
      "name": "Rock",
      "params": "rock"
    }
  ],
  "charts": {
    "top_songs": [
      {
        "videoId": "rMbATaj7Il8",
        "title": "Song Title",
        "artist": "Artist Name",
        "stream_url": "https://rr5---sn-...",
        "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
      }
    ],
    "trending": [
      {
        "videoId": "lDK9QqIzhwk",
        "title": "Trending Song",
        "artist": "Artist Name",
        "stream_url": "https://rr5---sn-...",
        "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
      }
    ]
  }
}
```

**Campos importantes**:
- `moods[]`: Array de moods disponibles con `name` y `params`
- `genres[]`: Array de géneros disponibles con `name` y `params`
- `charts.top_songs[]`: Canciones top con `videoId`, `title`, `artist`, `stream_url`, `thumbnail`
- `charts.trending[]`: Canciones trending con `videoId`, `title`, `artist`, `stream_url`, `thumbnail`

---

### 2. `GET /api/music/explore/moods/:params`

**Descripción**: Obtener playlists de un mood específico

**Autenticación**: ✅ Requerida (JWT)

**Parámetros**:
- `params` (path): Parámetros del mood (ej: "happy")

**Respuesta (200 OK)**:
```json
[
  {
    "playlistId": "PLxxxxx",
    "title": "Happy Playlist",
    "description": "Playlist description",
    "songs": [
      {
        "videoId": "rMbATaj7Il8",
        "title": "Song Title",
        "artist": "Artist Name",
        "duration": 180,
        "stream_url": "https://rr5---sn-...",
        "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
      }
    ]
  }
]
```

**Campos importantes**:
- Array de playlists
- Cada playlist tiene `playlistId`, `title`, `description`
- `songs[]`: Canciones con `videoId`, `title`, `artist`, `duration`, `stream_url`, `thumbnail`

---

### 3. `GET /api/music/explore/genres/:params`

**Descripción**: Obtener playlists de un género específico

**Autenticación**: ✅ Requerida (JWT)

**Parámetros**:
- `params` (path): Parámetros del género (ej: "rock")

**Respuesta (200 OK)**:
```json
[
  {
    "playlistId": "PLxxxxx",
    "title": "Rock Playlist",
    "description": "Playlist description",
    "songs": [
      {
        "videoId": "rMbATaj7Il8",
        "title": "Song Title",
        "artist": "Artist Name",
        "duration": 180,
        "stream_url": "https://rr5---sn-...",
        "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
      }
    ]
  }
]
```

**Campos importantes**:
- Misma estructura que `/explore/moods/:params`
- Cada canción incluye `stream_url` y `thumbnail`

---

### 4. `GET /api/music/playlists/:playlistId`

**Descripción**: Obtener detalles de una playlist

**Autenticación**: ✅ Requerida (JWT)

**Parámetros**:
- `playlistId` (path): ID de la playlist

**Respuesta (200 OK)**:
```json
{
  "playlistId": "PLxxxxx",
  "title": "Playlist Title",
  "description": "Playlist description",
  "songs": [
    {
      "videoId": "rMbATaj7Il8",
      "title": "Song Title",
      "artist": "Artist Name",
      "duration": 180,
      "stream_url": "https://rr5---sn-...",
      "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
    }
  ],
  "tracks": [
    {
      "videoId": "lDK9QqIzhwk",
      "title": "Track Title",
      "artists": [
        {
          "name": "Artist Name",
          "id": "artist_id"
        }
      ],
      "stream_url": "https://rr5---sn-...",
      "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
    }
  ]
}
```

**Campos importantes**:
- `playlistId`: ID de la playlist
- `title`: Título de la playlist
- `description`: Descripción (opcional)
- `songs[]` o `tracks[]`: Canciones con `videoId`, `title`, `artist`/`artists`, `duration`, `stream_url`, `thumbnail`

---

### 5. `GET /api/music/search?q={query}&filter={filter}`

**Descripción**: Buscar música y guardar búsqueda en historial

**Autenticación**: ✅ Requerida (JWT)

**Query Parameters**:
- `q` (required): Término de búsqueda
- `filter` (optional): Filtro de búsqueda (default: "songs")

**Respuesta (200 OK)**:
```json
{
  "results": [
    {
      "videoId": "rMbATaj7Il8",
      "title": "Song Title",
      "artists": [
        {
          "name": "Artist Name",
          "id": "artist_id"
        }
      ],
      "album": {
        "name": "Album Name",
        "id": "album_id"
      },
      "duration": "3:45",
      "duration_seconds": 225,
      "views": "1M",
      "thumbnails": [
        {
          "url": "https://i.ytimg.com/vi/.../default.jpg",
          "width": 120,
          "height": 120
        }
      ],
      "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg",
      "stream_url": "https://rr5---sn-...",
      "category": "Songs",
      "resultType": "song"
    }
  ],
  "query": "search query"
}
```

**Campos importantes**:
- `results[]`: Array de resultados de búsqueda
- Cada resultado incluye: `videoId`, `title`, `artists[]`, `album`, `duration`, `duration_seconds`, `views`, `thumbnails[]`, `thumbnail`, `stream_url`
- `query`: Término de búsqueda utilizado

**Nota**: Este endpoint guarda automáticamente la búsqueda en el historial del usuario.

---

### 6. `GET /api/music/recent-searches?limit={limit}`

**Descripción**: Obtener búsquedas recientes del usuario

**Autenticación**: ✅ Requerida (JWT)

**Query Parameters**:
- `limit` (optional): Número máximo de búsquedas a retornar (default: 10)

**Respuesta (200 OK)**:
```json
[
  {
    "id": "uuid",
    "videoId": "rMbATaj7Il8",
    "songData": {
      "category": "Songs",
      "resultType": "song",
      "title": "Song Title",
      "album": {
        "name": "Album Name",
        "id": "album_id"
      },
      "videoId": "rMbATaj7Il8",
      "artists": [
        {
          "name": "Artist Name",
          "id": "artist_id"
        }
      ],
      "duration": "3:45",
      "duration_seconds": 225,
      "views": "1M",
      "thumbnails": [
        {
          "url": "https://i.ytimg.com/vi/.../default.jpg",
          "width": 120,
          "height": 120
        }
      ],
      "stream_url": "https://rr5---sn-...",
      "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
    },
    "createdAt": "2026-01-25T03:14:33.749Z",
    "lastSearchedAt": "2026-01-25T03:14:33.749Z"
  }
]
```

**Campos importantes**:
- `id`: UUID de la búsqueda
- `videoId`: videoId de la primera canción encontrada
- `songData`: Información completa de la primera canción (incluye `stream_url` y `thumbnail` si están disponibles)
- `createdAt`: Fecha de creación
- `lastSearchedAt`: Última vez que se buscó

---

### 7. `DELETE /api/music/recent-searches/:searchId`

**Descripción**: Eliminar una búsqueda específica del historial

**Autenticación**: ✅ Requerida (JWT)

**Parámetros**:
- `searchId` (path): ID de la búsqueda a eliminar

**Respuesta (200 OK)**:
```json
{
  "message": "Search deleted successfully"
}
```

---

### 8. `DELETE /api/music/recent-searches`

**Descripción**: Limpiar todas las búsquedas recientes del usuario

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "message": "All recent searches cleared"
}
```

---

### 9. `GET /api/music/for-you`

**Descripción**: Obtener contenido personalizado "Para ti" basado en favoritos

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "mixes": [
    {
      "title": "Mix basado en Rock",
      "type": "genre",
      "playlists": [
        {
          "playlistId": "PLxxxxx",
          "title": "Rock Playlist",
          "songs": [
            {
              "videoId": "rMbATaj7Il8",
              "title": "Song Title",
              "artist": "Artist Name",
              "stream_url": "https://rr5---sn-...",
              "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
            }
          ]
        }
      ]
    }
  ],
  "favoriteSongs": [
    {
      "id": "song_uuid",
      "song": {
        "id": "song_uuid",
        "title": "Song Title",
        "artist": "Artist Name",
        "videoId": "rMbATaj7Il8",
        "duration": 180
      },
      "createdAt": "2026-01-25T03:14:33.749Z"
    }
  ],
  "favoritePlaylists": [
    {
      "id": "playlist_uuid",
      "playlist": {
        "id": "playlist_uuid",
        "name": "Playlist Name",
        "externalPlaylistId": "PLxxxxx"
      },
      "createdAt": "2026-01-25T03:14:33.749Z"
    }
  ],
  "exploreContent": {
    "moods": [...],
    "genres": [...],
    "charts": {...}
  }
}
```

**Campos importantes**:
- `mixes[]`: Mixes personalizados basados en géneros favoritos
- `favoriteSongs[]`: Primeras 10 canciones favoritas
- `favoritePlaylists[]`: Primeras 5 playlists favoritas
- `exploreContent`: Contenido de exploración general

---

### 10. `GET /api/music/recently-listened`

**Descripción**: Obtener canciones recientemente escuchadas (favoritas más recientes)

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "songs": [
    {
      "id": "song_uuid",
      "title": "Song Title",
      "artist": "Artist Name",
      "videoId": "rMbATaj7Il8",
      "duration": 180,
      "addedAt": "2026-01-25T03:14:33.749Z"
    }
  ],
  "total": 20
}
```

**Campos importantes**:
- `songs[]`: Array de canciones favoritas más recientes (máximo 20)
- Cada canción incluye `videoId` y `addedAt` (fecha en que se agregó a favoritos)
- `total`: Número total de canciones favoritas

---

### 11. `GET /api/music/categories`

**Descripción**: Obtener todas las categorías disponibles

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "moods": [
    {
      "name": "Happy",
      "params": "happy"
    }
  ],
  "genres": [
    {
      "name": "Rock",
      "params": "rock"
    }
  ],
  "charts": {
    "top_songs": [
      {
        "videoId": "rMbATaj7Il8",
        "title": "Song Title",
        "artist": "Artist Name",
        "stream_url": "https://rr5---sn-...",
        "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg"
      }
    ],
    "trending": [...]
  }
}
```

**Campos importantes**:
- `moods[]`: Array de moods disponibles
- `genres[]`: Array de géneros disponibles
- `charts`: Charts con `top_songs` y `trending` (incluyen `stream_url` y `thumbnail`)

---

### 12. `GET /api/music/genres`

**Descripción**: Obtener todos los géneros y moods disponibles

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "genres": [
    {
      "name": "Rock",
      "params": "rock"
    }
  ],
  "moods": [
    {
      "name": "Happy",
      "params": "happy"
    }
  ]
}
```

**Campos importantes**:
- `genres[]`: Array de géneros con `name` y `params`
- `moods[]`: Array de moods con `name` y `params`

---

## 📚 Endpoints de Biblioteca (`/api/library`)

### 13. `POST /api/library/songs`

**Descripción**: Agregar canción a favoritos

**Autenticación**: ✅ Requerida (JWT)

**Body**:
```json
{
  "songId": "uuid", // Opcional: ID local
  "videoId": "rMbATaj7Il8" // Opcional: ID del servicio externo
}
```

**Respuesta (201 Created)**:
```json
{
  "id": "favorite_uuid",
  "userId": "user_uuid",
  "song": {
    "id": "song_uuid",
    "title": "Song Title",
    "artist": "Artist Name",
    "videoId": "rMbATaj7Il8",
    "duration": 180
  },
  "createdAt": "2026-01-25T03:14:33.749Z"
}
```

**Nota**: Si se usa `videoId`, la canción se sincroniza automáticamente desde el servicio externo.

---

### 14. `DELETE /api/library/songs/:songId`

**Descripción**: Eliminar canción de favoritos

**Autenticación**: ✅ Requerida (JWT)

**Parámetros**:
- `songId` (path): ID de la canción

**Respuesta (200 OK)**:
```json
{
  "message": "Song removed from favorites"
}
```

---

### 15. `GET /api/library/songs?page={page}&limit={limit}`

**Descripción**: Obtener canciones favoritas del usuario

**Autenticación**: ✅ Requerida (JWT)

**Query Parameters**:
- `page` (optional): Número de página (default: 1)
- `limit` (optional): Elementos por página (default: 20)

**Respuesta (200 OK)**:
```json
{
  "data": [
    {
      "id": "favorite_uuid",
      "userId": "user_uuid",
      "song": {
        "id": "song_uuid",
        "title": "Song Title",
        "artist": "Artist Name",
        "videoId": "rMbATaj7Il8",
        "duration": 180
      },
      "createdAt": "2026-01-25T03:14:33.749Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

**Campos importantes**:
- `data[]`: Array de canciones favoritas con paginación
- Cada item incluye `song` con `videoId`
- `total`: Total de canciones favoritas
- `page`, `limit`, `totalPages`: Información de paginación

---

### 16. `GET /api/library/songs/:songId/check`

**Descripción**: Verificar si una canción está en favoritos

**Autenticación**: ✅ Requerida (JWT)

**Parámetros**:
- `songId` (path): ID de la canción

**Respuesta (200 OK)**:
```json
{
  "isFavorite": true
}
```

---

### 17. `POST /api/library/playlists`

**Descripción**: Agregar playlist a favoritos

**Autenticación**: ✅ Requerida (JWT)

**Body**:
```json
{
  "playlistId": "uuid", // Opcional: ID local
  "externalPlaylistId": "PLxxxxx" // Opcional: ID del servicio externo
}
```

**Respuesta (201 Created)**:
```json
{
  "id": "favorite_uuid",
  "userId": "user_uuid",
  "playlist": {
    "id": "playlist_uuid",
    "name": "Playlist Name",
    "description": "Description",
    "externalPlaylistId": "PLxxxxx"
  },
  "createdAt": "2026-01-25T03:14:33.749Z"
}
```

**Nota**: Si se usa `externalPlaylistId`, la playlist y sus canciones se sincronizan automáticamente.

---

### 18. `DELETE /api/library/playlists/:playlistId`

**Descripción**: Eliminar playlist de favoritos

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "message": "Playlist removed from favorites"
}
```

---

### 19. `GET /api/library/playlists?page={page}&limit={limit}`

**Descripción**: Obtener playlists favoritas del usuario

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "data": [
    {
      "id": "favorite_uuid",
      "userId": "user_uuid",
      "playlist": {
        "id": "playlist_uuid",
        "name": "Playlist Name",
        "externalPlaylistId": "PLxxxxx"
      },
      "createdAt": "2026-01-25T03:14:33.749Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 20. `GET /api/library/playlists/:playlistId/check`

**Descripción**: Verificar si una playlist está en favoritos

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "isFavorite": true
}
```

---

### 21. `POST /api/library/genres`

**Descripción**: Agregar género a favoritos

**Autenticación**: ✅ Requerida (JWT)

**Body**:
```json
{
  "genreId": "uuid", // Opcional: ID local
  "externalParams": "rock", // Opcional: Params del servicio externo
  "genreName": "Rock" // Requerido si se usa externalParams
}
```

**Respuesta (201 Created)**:
```json
{
  "id": "favorite_uuid",
  "userId": "user_uuid",
  "genre": {
    "id": "genre_uuid",
    "name": "Rock",
    "externalParams": "rock"
  },
  "createdAt": "2026-01-25T03:14:33.749Z"
}
```

---

### 22. `DELETE /api/library/genres/:genreId`

**Descripción**: Eliminar género de favoritos

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "message": "Genre removed from favorites"
}
```

---

### 23. `GET /api/library/genres?page={page}&limit={limit}`

**Descripción**: Obtener géneros favoritos del usuario

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "data": [
    {
      "id": "favorite_uuid",
      "userId": "user_uuid",
      "genre": {
        "id": "genre_uuid",
        "name": "Rock",
        "externalParams": "rock"
      },
      "createdAt": "2026-01-25T03:14:33.749Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 24. `GET /api/library/genres/:genreId/check`

**Descripción**: Verificar si un género está en favoritos

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "isFavorite": true
}
```

---

### 25. `GET /api/library/summary`

**Descripción**: Obtener resumen de la biblioteca del usuario

**Autenticación**: ✅ Requerida (JWT)

**Respuesta (200 OK)**:
```json
{
  "favoriteSongs": 50,
  "favoritePlaylists": 10,
  "favoriteGenres": 5
}
```

---

## 🔑 Campos Importantes en Todas las Respuestas

### Campos de Canciones (`stream_url` y `thumbnail`)

Todos los endpoints que retornan canciones ahora incluyen:

- **`stream_url`**: URL directa de stream de audio (disponible cuando `include_stream_urls=true`)
- **`thumbnail`**: URL del thumbnail en mejor calidad (disponible cuando `include_stream_urls=true`)

Estos campos están disponibles en:
- ✅ `/music/explore` → `charts.top_songs[]`, `charts.trending[]`
- ✅ `/music/explore/moods/:params` → `songs[]`
- ✅ `/music/explore/genres/:params` → `songs[]`
- ✅ `/music/playlists/:playlistId` → `songs[]`, `tracks[]`
- ✅ `/music/search` → `results[]`
- ✅ `/music/recent-searches` → `songData`

### Campos de Identificación

- **`videoId`**: ID del video/canción del servicio externo (YouTube)
- **`playlistId`**: ID de la playlist del servicio externo
- **`externalParams`**: Parámetros del género/mood del servicio externo

---

## ⚠️ Nota sobre `/api/music/stream/:videoId`

Este endpoint **NO está documentado** en este archivo debido a errores actuales relacionados con rate limiting de YouTube. El endpoint está implementado pero puede fallar cuando YouTube aplica rate limiting.

---

## 📝 Notas Generales

1. **Autenticación**: Todos los endpoints requieren JWT Bearer token (excepto los endpoints públicos de auth)
2. **Base URL**: Todos los endpoints están bajo `/api/`
3. **Caché**: Los endpoints de música tienen caché Redis configurado
4. **Rate Limiting**: Todos los endpoints tienen rate limiting global configurado
5. **Paginación**: Los endpoints de biblioteca soportan paginación con `page` y `limit`
