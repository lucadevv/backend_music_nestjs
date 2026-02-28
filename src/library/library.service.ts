import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { FavoriteSong } from './entities/favorite-song.entity';
import { FavoritePlaylist } from './entities/favorite-playlist.entity';
import { FavoriteGenre } from './entities/favorite-genre.entity';
import { Song } from '../music/entities/song.entity';
import { Playlist } from '../music/entities/playlist.entity';
import { Genre } from '../music/entities/genre.entity';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(FavoriteSong)
    private readonly favoriteSongRepository: Repository<FavoriteSong>,
    @InjectRepository(FavoritePlaylist)
    private readonly favoritePlaylistRepository: Repository<FavoritePlaylist>,
    @InjectRepository(FavoriteGenre)
    private readonly favoriteGenreRepository: Repository<FavoriteGenre>,
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  private async syncGenreFromExternal(
    externalParams: string,
    genreName?: string,
  ): Promise<Genre> {
    // Buscar si ya existe
    let genre = await this.genreRepository.findOne({
      where: { externalParams },
    });

    if (genre) {
      return genre;
    }

    // Crear género
    genre = this.genreRepository.create({
      externalParams,
      name: genreName || `Genre ${externalParams}`,
    });

    return this.genreRepository.save(genre);
  }

  // Favorite Songs
  async addFavoriteSong(
    userId: string,
    songId?: string,
    videoId?: string,
    metadata?: { title?: string; artist?: string; thumbnail?: string; duration?: number },
  ): Promise<FavoriteSong> {
    if (!songId && !videoId) {
      throw new BadRequestException('Either songId or videoId must be provided');
    }

    let song: Song | null = null;

    if (videoId) {
      // Buscar si ya existe por videoId
      song = await this.songRepository.findOne({ where: { videoId } });

      if (!song) {
        // Crear canción con metadata proporcionada
        song = this.songRepository.create({
          videoId,
          title: metadata?.title || `Song ${videoId}`,
          artist: metadata?.artist || 'Unknown',
          thumbnail: metadata?.thumbnail || null,
          duration: metadata?.duration || 0,
        });
        song = await this.songRepository.save(song);
      } else if (metadata && (metadata.title || metadata.artist || metadata.thumbnail || metadata.duration)) {
        // Actualizar si tenemos mejor metadata
        await this.songRepository.update(song.id, {
          title: metadata.title || song.title,
          artist: metadata.artist || song.artist,
          thumbnail: metadata.thumbnail || song.thumbnail,
          duration: metadata.duration || song.duration,
        });
        song = await this.songRepository.findOne({ where: { id: song.id } });
      }
      if (song) {
        songId = song.id;
      }
    } else if (songId) {
      song = await this.songRepository.findOne({ where: { id: songId } });
      if (!song) {
        throw new NotFoundException(`Song with ID ${songId} not found`);
      }
    }

    if (!song || !songId) {
      throw new NotFoundException('Song not found');
    }

    // Verificar si ya está en favoritos
    const existing = await this.favoriteSongRepository.findOne({
      where: { userId, songId },
    });
    if (existing) {
      throw new ConflictException('Song is already in favorites');
    }

    // Crear favorito
    const favorite = this.favoriteSongRepository.create({ userId, songId });
    const saved = await this.favoriteSongRepository.save(favorite);

    // Incrementar contador de likes
    await this.songRepository.increment({ id: songId }, 'likeCount', 1);

    return this.favoriteSongRepository.findOne({
      where: { id: saved.id },
      relations: ['song', 'song.genre'],
    }) as Promise<FavoriteSong>;
  }

  async removeFavoriteSong(userId: string, songIdOrVideoId: string): Promise<void> {
    let favorite: FavoriteSong | null = null;
    let actualSongId: string | null = null;

    // Primero, intentar encontrar la canción por videoId
    const song = await this.songRepository.findOne({
      where: { videoId: songIdOrVideoId },
    });

    if (song) {
      // Si encontramos la canción por videoId, buscar el favorito usando el songId (UUID)
      actualSongId = song.id;
      favorite = await this.favoriteSongRepository.findOne({
        where: { userId, songId: actualSongId },
      });
    } else {
      // Si no es un videoId, asumir que es un songId (UUID) y buscar directamente
      favorite = await this.favoriteSongRepository.findOne({
        where: { userId, songId: songIdOrVideoId },
      });
      actualSongId = songIdOrVideoId;
    }

    if (!favorite) {
      throw new NotFoundException('Song is not in favorites');
    }

    await this.favoriteSongRepository.remove(favorite);

    // Decrementar contador de likes
    await this.songRepository.decrement({ id: actualSongId }, 'likeCount', 1);
  }

  async getFavoriteSongs(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: FavoriteSong[]; total: number }> {
    const [data, total] = await this.favoriteSongRepository.findAndCount({
      where: { userId },
      relations: ['song', 'song.genre'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async isSongFavorite(userId: string, songId: string): Promise<boolean> {
    const favorite = await this.favoriteSongRepository.findOne({
      where: { userId, songId },
    });
    return !!favorite;
  }

  // Favorite Playlists
  async addFavoritePlaylist(
    userId: string,
    playlistId?: string,
    externalPlaylistId?: string,
    metadata?: { name?: string; thumbnail?: string; description?: string; trackCount?: number },
  ): Promise<FavoritePlaylist> {
    if (!playlistId && !externalPlaylistId) {
      throw new BadRequestException(
        'Either playlistId or externalPlaylistId must be provided',
      );
    }

    let playlist: Playlist | null = null;
    let trackCount = metadata?.trackCount ?? 0;

    if (externalPlaylistId) {
      // Buscar si ya existe por externalPlaylistId
      playlist = await this.playlistRepository.findOne({
        where: { externalPlaylistId },
      });

      if (playlist) {
        // Si ya existe y tenemos metadata, actualizarla
        if (metadata && (metadata.name || metadata.thumbnail || metadata.description)) {
          await this.playlistRepository.update(playlist.id, {
            name: metadata.name || playlist.name,
            thumbnail: metadata.thumbnail || playlist.thumbnail,
            description: metadata.description || playlist.description,
          });
          playlist = await this.playlistRepository.findOne({
            where: { id: playlist.id },
          });
        }
        playlistId = playlist!.id;
      } else {
        // Crear playlist con metadata proporcionada
        // IMPORTANTE: Las playlists de YouTube NO tienen userId
        // Solo se guardan en favorite_playlists, no en playlists del usuario
        playlist = this.playlistRepository.create({
          externalPlaylistId,
          name: metadata?.name || `Playlist ${externalPlaylistId}`,
          thumbnail: metadata?.thumbnail || null,
          description: metadata?.description || null,
          userId: null, // Nullable - YouTube playlists don't have a userId
          isPublic: false,
        });
        playlist = await this.playlistRepository.save(playlist);
        playlistId = playlist.id;
      }
    } else if (playlistId) {
      // Usar playlist local existente
      playlist = await this.playlistRepository.findOne({
        where: { id: playlistId },
      });
      if (!playlist) {
        throw new NotFoundException(`Playlist with ID ${playlistId} not found`);
      }
    }

    if (!playlist || !playlistId) {
      throw new NotFoundException('Playlist not found');
    }

    // Guardar el track count en la tabla de favoritos
    const existing = await this.favoritePlaylistRepository.findOne({
      where: { userId, playlistId },
    });
    if (existing) {
      throw new ConflictException('Playlist is already in favorites');
    }

    const favorite = this.favoritePlaylistRepository.create({
      userId,
      playlistId,
      cachedTrackCount: trackCount > 0 ? trackCount : null,
    });
    const saved = await this.favoritePlaylistRepository.save(favorite);

    await this.playlistRepository.increment({ id: playlistId }, 'likeCount', 1);

    return this.favoritePlaylistRepository.findOne({
      where: { id: saved.id },
      relations: ['playlist'],
    }) as Promise<FavoritePlaylist>;
  }

  async removeFavoritePlaylist(
    userId: string,
    playlistIdOrExternalId: string,
  ): Promise<void> {
    let favorite: FavoritePlaylist | null = null;
    let actualPlaylistId: string | null = null;

    // Primero, intentar encontrar la playlist por externalPlaylistId
    const playlist = await this.playlistRepository.findOne({
      where: { externalPlaylistId: playlistIdOrExternalId },
    });

    if (playlist) {
      // Si encontramos la playlist por externalPlaylistId, buscar el favorito usando el playlistId (UUID)
      actualPlaylistId = playlist.id;
      favorite = await this.favoritePlaylistRepository.findOne({
        where: { userId, playlistId: actualPlaylistId },
      });
    } else {
      // Si no es un externalPlaylistId, asumir que es un playlistId (UUID) y buscar directamente
      favorite = await this.favoritePlaylistRepository.findOne({
        where: { userId, playlistId: playlistIdOrExternalId },
      });
      actualPlaylistId = playlistIdOrExternalId;
    }

    if (!favorite) {
      throw new NotFoundException('Playlist is not in favorites');
    }

    await this.favoritePlaylistRepository.remove(favorite);
    await this.playlistRepository.decrement({ id: actualPlaylistId }, 'likeCount', 1);
  }

  async getFavoritePlaylists(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: FavoritePlaylist[]; total: number }> {
    const [data, total] = await this.favoritePlaylistRepository.findAndCount({
      where: { userId },
      relations: ['playlist', 'playlist.user', 'playlist.songs'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async isPlaylistFavorite(
    userId: string,
    playlistId: string,
  ): Promise<boolean> {
    const favorite = await this.favoritePlaylistRepository.findOne({
      where: { userId, playlistId },
    });
    return !!favorite;
  }

  // Favorite Genres
  async addFavoriteGenre(
    userId: string,
    genreId?: string,
    externalParams?: string,
    genreName?: string,
  ): Promise<FavoriteGenre> {
    if (!genreId && !externalParams) {
      throw new BadRequestException(
        'Either genreId or externalParams must be provided',
      );
    }

    let genre: Genre | null = null;

    if (externalParams) {
      // Sincronizar desde servicio externo
      genre = await this.syncGenreFromExternal(externalParams, genreName);
      genreId = genre.id;
    } else if (genreId) {
      // Usar género local existente
      genre = await this.genreRepository.findOne({ where: { id: genreId } });
      if (!genre) {
        throw new NotFoundException(`Genre with ID ${genreId} not found`);
      }
    }

    if (!genre || !genreId) {
      throw new NotFoundException('Genre not found');
    }

    const existing = await this.favoriteGenreRepository.findOne({
      where: { userId, genreId },
    });
    if (existing) {
      throw new ConflictException('Genre is already in favorites');
    }

    const favorite = this.favoriteGenreRepository.create({ userId, genreId });
    const saved = await this.favoriteGenreRepository.save(favorite);

    return this.favoriteGenreRepository.findOne({
      where: { id: saved.id },
      relations: ['genre'],
    }) as Promise<FavoriteGenre>;
  }

  async removeFavoriteGenre(userId: string, genreId: string): Promise<void> {
    const favorite = await this.favoriteGenreRepository.findOne({
      where: { userId, genreId },
    });

    if (!favorite) {
      throw new NotFoundException('Genre is not in favorites');
    }

    await this.favoriteGenreRepository.remove(favorite);
  }

  async getFavoriteGenres(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: FavoriteGenre[]; total: number }> {
    const [data, total] = await this.favoriteGenreRepository.findAndCount({
      where: { userId },
      relations: ['genre'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async isGenreFavorite(userId: string, genreId: string): Promise<boolean> {
    const favorite = await this.favoriteGenreRepository.findOne({
      where: { userId, genreId },
    });
    return !!favorite;
  }

  // Get complete library summary
  async getLibrarySummary(userId: string) {
    const [favoriteSongsCount, favoritePlaylistsCount, favoriteGenresCount] =
      await Promise.all([
        this.favoriteSongRepository.count({ where: { userId } }),
        this.favoritePlaylistRepository.count({ where: { userId } }),
        this.favoriteGenreRepository.count({ where: { userId } }),
      ]);

    return {
      favoriteSongs: favoriteSongsCount,
      favoritePlaylists: favoritePlaylistsCount,
      favoriteGenres: favoriteGenresCount,
    };
  }

  // ============ User Playlists (Playlists creadas por el usuario) ============

  async createUserPlaylist(
    userId: string,
    data: { name: string; description?: string; thumbnail?: string; isPublic?: boolean },
  ) {
    const playlist = this.playlistRepository.create({
      name: data.name,
      description: data.description || null,
      thumbnail: data.thumbnail || null,
      userId,
      isPublic: data.isPublic || false,
      songs: [],
    });

    const saved = await this.playlistRepository.save(playlist);
    return this.getUserPlaylist(userId, saved.id);
  }

  async getUserPlaylists(
    _userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    // Solo mostrar playlists CREADAS POR EL USUARIO (userId no null/vacío)
    const [data, total] = await this.playlistRepository.findAndCount({
      where: { userId: Not(IsNull()) },  // Solo playlists con userId (creadas por usuarios)
      relations: ['songs'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        thumbnail: p.thumbnail,
        songCount: p.songs?.length || 0,
        createdAt: p.createdAt,
      })),
      total,
    };
  }

  async getUserPlaylist(userId: string, playlistId: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
      relations: ['songs'],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${playlistId} not found`);
    }

    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      thumbnail: playlist.thumbnail,
      isPublic: playlist.isPublic,
      songs: playlist.songs.map((s) => ({
        id: s.id,
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        duration: s.duration,
      })),
      createdAt: playlist.createdAt,
    };
  }

  async updateUserPlaylist(
    userId: string,
    playlistId: string,
    data: { name?: string; description?: string; thumbnail?: string; isPublic?: boolean },
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${playlistId} not found`);
    }

    if (data.name) playlist.name = data.name;
    if (data.description !== undefined) playlist.description = data.description;
    if (data.thumbnail !== undefined) playlist.thumbnail = data.thumbnail;
    if (data.isPublic !== undefined) playlist.isPublic = data.isPublic;

    await this.playlistRepository.save(playlist);
    return this.getUserPlaylist(userId, playlistId);
  }

  async deleteUserPlaylist(userId: string, playlistId: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${playlistId} not found`);
    }

    await this.playlistRepository.remove(playlist);
  }

  async addSongToUserPlaylist(
    userId: string,
    playlistId: string,
    data: { videoId: string; title?: string; artist?: string; thumbnail?: string; duration?: number },
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
      relations: ['songs'],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${playlistId} not found`);
    }

    // Buscar o crear la canción
    let song = await this.songRepository.findOne({
      where: { videoId: data.videoId },
    });

    if (!song) {
      song = this.songRepository.create({
        videoId: data.videoId,
        title: data.title || data.videoId,
        artist: data.artist || 'Unknown Artist',
        thumbnail: data.thumbnail || null,
        duration: data.duration || 0,
      });
      song = await this.songRepository.save(song);
    }

    // Agregar a la playlist si no existe
    const exists = playlist.songs.some((s) => s.id === song!.id);
    if (!exists) {
      playlist.songs.push(song);
      await this.playlistRepository.save(playlist);
    }

    return this.getUserPlaylist(userId, playlistId);
  }

  async removeSongFromUserPlaylist(userId: string, playlistId: string, songId: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
      relations: ['songs'],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${playlistId} not found`);
    }

    playlist.songs = playlist.songs.filter((s) => s.id !== songId);
    await this.playlistRepository.save(playlist);
  }
}
