import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UserListenHistory } from '../entities/user-listen-history.entity';
import { Song } from '../entities/song.entity';
import { MusicApiService } from './music-api.service';

@Injectable()
export class ListenHistoryService {
  private readonly logger = new Logger(ListenHistoryService.name);

  constructor(
    @InjectRepository(UserListenHistory)
    private listenHistoryRepository: Repository<UserListenHistory>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly musicApiService: MusicApiService,
  ) {}

  /**
   * Registra una reproducción en el historial
   */
  async recordListen(userId: string, videoId: string): Promise<UserListenHistory | null> {
    if (!videoId) {
      this.logger.warn('videoId is null or empty, skipping recordListen');
      return null;
    }

    // Buscar la canción por videoId
    let song = await this.songRepository.findOne({ where: { videoId } });
    
    // Si la canción no existe, crearla con datos básicos del videoId
    if (!song) {
      this.logger.debug(`Creating new song entry for videoId: ${videoId}`);
      song = this.songRepository.create({
        videoId,
        title: `Song ${videoId}`, // Título genérico hasta que se actualice
        artist: 'Unknown Artist',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration: 0,
        playCount: 0,
        likeCount: 0,
        isActive: true,
      });
      song = await this.songRepository.save(song);
    }

    // Crear registro de historial
    const history = this.listenHistoryRepository.create({
      userId,
      songId: song.id,
    });

    const savedHistory = await this.listenHistoryRepository.save(history);
    this.logger.debug(`Created history record: id=${savedHistory.id}, userId=${userId}, songId=${song.id}`);
    
    // Invalidar TODOS los cache de recently-listened para este usuario (diferentes query params)
    // El cache-manager de NestJS no soporta wildcards, así que invalidamos los más comunes
    const cacheKeys = [
      `cache:/api/music/recently-listened:user:${userId}`,
      `cache:/api/music/recently-listened?start_index=0&limit=20:user:${userId}`,
      `cache:/api/music/recently-listened?start_index=0&limit=50:user:${userId}`,
      `cache:/api/music/recently-listened?include_stream_urls=false:user:${userId}`,
    ];
    for (const key of cacheKeys) {
      await this.cacheManager.del(key).catch(() => {});
    }
    this.logger.debug(`Cache invalidated for userId=${userId}`);
    
    return savedHistory;
  }

  /**
   * Obtiene las canciones más escuchadas recientemente por un usuario
   * Utiliza QueryBuilder para realizar el filtrado de canciones únicas a nivel de BD,
   * mejorando drásticamente el rendimiento para usuarios con mucho historial.
   */
  async getRecentlyListened(
    userId: string,
    limit: number = 20,
    startIndex: number = 0,
  ): Promise<{ songs: Song[]; total: number }> {
    this.logger.debug(`Fetching recently listened for userId=${userId}, limit=${limit}, offset=${startIndex}`);

    // Obtenemos el total de canciones únicas escuchadas por el usuario
    const countQuery = await this.listenHistoryRepository
      .createQueryBuilder('history')
      .select('COUNT(DISTINCT history.songId)', 'count')
      .where('history.userId = :userId', { userId })
      .getRawOne();
      
    const totalUnique = parseInt(countQuery.count, 10) || 0;

    if (totalUnique === 0) {
      return { songs: [], total: 0 };
    }

    // Usamos una subconsulta o agrupamiento para obtener la fecha más reciente de cada canción
    // y luego paginamos sobre esos resultados.
    const recentSongsIdsWithDates = await this.listenHistoryRepository
      .createQueryBuilder('history')
      .select('history.songId', 'songId')
      .addSelect('MAX(history.createdAt)', 'lastListenedAt')
      .where('history.userId = :userId', { userId })
      .groupBy('history.songId')
      .orderBy('"lastListenedAt"', 'DESC')
      .offset(startIndex)
      .limit(limit)
      .getRawMany();

    if (recentSongsIdsWithDates.length === 0) {
      return { songs: [], total: totalUnique };
    }

    const songIds = recentSongsIdsWithDates.map(record => record.songId);
    
    // Obtenemos los detalles de las canciones
    const songs = await this.songRepository
      .createQueryBuilder('song')
      .whereInIds(songIds)
      .getMany();

    // Mantenemos el orden devuelto por la consulta agrupada
    const orderedSongs = recentSongsIdsWithDates.map(record => 
      songs.find(s => s.id === record.songId)
    ).filter((s): s is Song => !!s);

    return { songs: orderedSongs, total: totalUnique };
  }

  /**
   * Obtiene las canciones con sus streamUrls usando el MusicApiService.
   * Centraliza la lógica delegada previamente en el controlador.
   */
  async getRecentlyListenedWithStreams(
    userId: string,
    limit: number = 20,
    startIndex: number = 0,
  ): Promise<{ songs: any[]; total: number }> {
    const { songs, total } = await this.getRecentlyListened(userId, limit, startIndex);

    const videoIds = songs
      .map((s) => s.videoId)
      .filter((v): v is string => !!v);

    let streamUrlsMap: Record<string, string> = {};
    if (videoIds.length > 0) {
      try {
        const streams = await this.musicApiService.getBatchStreamUrls(videoIds);
        streams.results.forEach((s) => {
          if (s.url) {
            streamUrlsMap[s.videoId] = s.url;
          }
        });
      } catch (e) {
        this.logger.warn('Failed to fetch batch stream URLs, continuing without them');
      }
    }

    const songsWithStreams = songs.map((song) => ({
      ...song,
      stream_url: song.videoId ? streamUrlsMap[song.videoId] : undefined,
    }));

    return { songs: songsWithStreams, total };
  }

  /**
   * Obtiene solo los IDs de canciones escuchadas (sin relación)
   */
  async getRecentlyListenedIds(
    userId: string,
    limit: number = 20,
  ): Promise<string[]> {
    const records = await this.listenHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['song'],
    });

    const seen = new Set<string>();
    const songIds: string[] = [];
    
    for (const record of records) {
      if (record.songId && !seen.has(record.songId)) {
        seen.add(record.songId);
        songIds.push(record.songId);
      }
    }

    return songIds;
  }
}