import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Song } from './entities/song.entity';
import { Playlist } from './entities/playlist.entity';
import { Genre } from './entities/genre.entity';
import { RecentSearch } from './entities/recent-search.entity';
import { MusicController } from './music.controller';
import { MusicApiService } from './services/music-api.service';
import { RecentSearchService } from './services/recent-search.service';
import { LibraryModule } from '../library/library.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Song, Playlist, Genre, RecentSearch]),
    forwardRef(() => LibraryModule),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('externalApi.musicServiceTimeout') || 30000,
        maxRedirects: 5,
      }),
    }),
  ],
  controllers: [MusicController],
  providers: [MusicApiService, RecentSearchService],
  exports: [TypeOrmModule, MusicApiService, RecentSearchService],
})
export class MusicModule { }
