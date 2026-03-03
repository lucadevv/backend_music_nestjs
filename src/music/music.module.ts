import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Song } from './entities/song.entity';
import { Playlist } from './entities/playlist.entity';
import { Genre } from './entities/genre.entity';
import { RecentSearch } from './entities/recent-search.entity';
import { MusicController } from './music.controller';
import { MusicApiService } from './services/music-api.service';
import { RecentSearchService } from './services/recent-search.service';
import { LibraryModule } from '../library/library.module';

@Module({
    imports: [
        HttpModule.register({
            timeout: 60000,
            maxRedirects: 5,
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret') || 'default-secret',
                signOptions: { 
                    expiresIn: 3600 * 24 * 7, // 7 days in seconds
                },
            }),
        }),
        TypeOrmModule.forFeature([Song, Playlist, Genre, RecentSearch]),
        LibraryModule,
    ],
    controllers: [MusicController],
    providers: [MusicApiService, RecentSearchService],
    exports: [MusicApiService, RecentSearchService],
})
export class MusicModule {}
