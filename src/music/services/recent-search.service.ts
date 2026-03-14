import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RecentSearch } from '../entities/recent-search.entity';

@Injectable()
export class RecentSearchService {
  constructor(
    @InjectRepository(RecentSearch)
    private readonly recentSearchRepository: Repository<RecentSearch>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Guarda una búsqueda (solo la query, sin canción seleccionada)
   * Se llama cuando el usuario realiza una búsqueda
   */
  async saveSearch(
    userId: string,
    query: string,
    filter: string = 'songs',
  ): Promise<RecentSearch> {
    const normalizedQuery = query.trim().toLowerCase();

    // Upsert atómico - incrementa contador y actualiza lastSearchedAt
    // NO actualiza videoId/songData (eso se hace cuando el usuario selecciona)
    await this.dataSource.query(
      `INSERT INTO recent_searches ("userId", query, filter, "searchCount", "lastSearchedAt", "createdAt")
       VALUES ($1, $2, $3, 1, NOW(), NOW())
       ON CONFLICT ("userId", query) DO UPDATE SET
         "searchCount" = recent_searches."searchCount" + 1,
         "lastSearchedAt" = NOW(),
         filter = EXCLUDED.filter`,
      [userId, normalizedQuery, filter],
    );

    const savedSearch = await this.recentSearchRepository.findOne({
      where: { userId, query: normalizedQuery },
    });

    if (!savedSearch) {
      throw new Error('Failed to save or retrieve recent search');
    }

    return savedSearch;
  }

  /**
   * Actualiza la canción seleccionada en una búsqueda reciente
   * Se llama cuando el usuario toca una canción de los resultados
   */
  async updateSelectedSong(
    userId: string,
    query: string,
    videoId: string,
    songData: any,
  ): Promise<RecentSearch> {
    const normalizedQuery = query.trim().toLowerCase();

    // Upsert atómico - actualiza videoId y songData
    await this.dataSource.query(
      `INSERT INTO recent_searches ("userId", query, filter, "videoId", "songData", "searchCount", "lastSearchedAt", "createdAt")
       VALUES ($1, $2, 'songs', $3, $4, 1, NOW(), NOW())
       ON CONFLICT ("userId", query) DO UPDATE SET
         "videoId" = EXCLUDED."videoId",
         "songData" = EXCLUDED."songData",
         "lastSearchedAt" = NOW()`,
      [userId, normalizedQuery, videoId, JSON.stringify(songData)],
    );

    const savedSearch = await this.recentSearchRepository.findOne({
      where: { userId, query: normalizedQuery },
    });

    if (!savedSearch) {
      throw new Error('Failed to update or retrieve recent search');
    }

    return savedSearch;
  }

  async getRecentSearches(
    userId: string,
    startIndex: number = 0,
    limit: number = 10,
  ): Promise<RecentSearch[]> {
    return this.recentSearchRepository.find({
      where: { userId },
      order: { lastSearchedAt: 'DESC' },
      skip: startIndex,
      take: limit,
    });
  }

  async deleteSearch(userId: string, searchId: string): Promise<void> {
    const search = await this.recentSearchRepository.findOne({
      where: { id: searchId, userId },
    });

    if (search) {
      await this.recentSearchRepository.remove(search);
    }
  }

  async clearRecentSearches(userId: string): Promise<void> {
    await this.recentSearchRepository.delete({ userId });
  }
}
