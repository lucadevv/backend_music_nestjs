import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UserListenHistory } from '../entities/user-listen-history.entity';
import { Song } from '../entities/song.entity';

@Injectable()
export class ListenHistoryService {
  constructor(
    @InjectRepository(UserListenHistory)
    private listenHistoryRepository: Repository<UserListenHistory>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Registra una reproducción en el historial
   */
  async recordListen(userId: string, videoId: string): Promise<UserListenHistory | null> {
    if (!videoId) {
      console.log('videoId is null or empty, skipping');
      return null;
    }

    // Buscar la canción por videoId
    let song = await this.songRepository.findOne({ where: { videoId } });
    
    // Si la canción no existe, crearla con datos básicos del videoId
    if (!song) {
      console.log(`Creating new song entry for videoId: ${videoId}`);
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
    console.log(`[DEBUG recordListen] Created history record: id=${savedHistory.id}, userId=${userId}, songId=${song.id}`);
    
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
    console.log(`[DEBUG recordListen] Cache invalidated for userId=${userId}`);
    
    return savedHistory;
  }

  /**
   * Obtiene las canciones más escuchadas recientemente por un usuario
   */
  async getRecentlyListened(
    userId: string,
    limit: number = 20,
    startIndex: number = 0,
  ): Promise<{ songs: Song[]; total: number }> {
    // Obtener los registros de historial más recientes
    const historyRecords = await this.listenHistoryRepository.find({
      where: { userId },
      relations: ['song'],
      order: { createdAt: 'DESC' },
      skip: startIndex,
      take: limit,
    });

    console.log(`[DEBUG getRecentlyListened] userId=${userId}, found ${historyRecords.length} history records`);
    for (const record of historyRecords) {
      console.log(`[DEBUG getRecentlyListened] record: id=${record.id}, songId=${record.songId}, song=${record.song?.title || 'NULL'}`);
    }

    // Eliminar duplicados manteniendo el orden (primera vez que se escuchó)
    const seenSongIds = new Set<string>();
    const uniqueSongs: Song[] = [];
    
    for (const record of historyRecords) {
      if (record.song && !seenSongIds.has(record.song.id)) {
        seenSongIds.add(record.song.id);
        uniqueSongs.push(record.song);
      }
    }

    // Obtener el total de canciones únicas - forma simple
    const totalUnique = uniqueSongs.length;

    return { songs: uniqueSongs, total: totalUnique };
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