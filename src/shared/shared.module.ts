import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { RecentSearch } from '../music/entities/recent-search.entity';
import { RecentSearchService } from '../music/services/recent-search.service';
import { MusicApiService } from '../music/services/music-api.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([RecentSearch]),
        HttpModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                timeout: configService.get<number>('externalApi.musicServiceTimeout') || 30000,
                maxRedirects: 5,
            }),
        }),
    ],
    providers: [RecentSearchService, MusicApiService],
    exports: [RecentSearchService, MusicApiService, TypeOrmModule],
})
export class SharedModule {}
