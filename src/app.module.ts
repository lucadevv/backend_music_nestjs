import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { oauthConfig } from './config/oauth.config';
import { externalApiConfig } from './config/external-api.config';
import { throttlerConfig } from './config/throttler.config';
import { validationSchema } from './config/validation.schema';
import { HealthController } from './health/health.controller';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './common/entities/refresh-token.entity';
import { Song } from './music/entities/song.entity';
import { Playlist } from './music/entities/playlist.entity';
import { Genre } from './music/entities/genre.entity';
import { RecentSearch } from './music/entities/recent-search.entity';
import { FavoriteSong } from './library/entities/favorite-song.entity';
import { FavoritePlaylist } from './library/entities/favorite-playlist.entity';
import { FavoriteGenre } from './library/entities/favorite-genre.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MusicModule } from './music/music.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Disponible en toda la aplicación sin importar
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, oauthConfig, externalApiConfig, throttlerConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true, // Detener en el primer error
        allowUnknown: true, // Permitir otras variables de entorno
      },
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
      ],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => {
        const redisHost = configService.get<string>('redis.host');
        const redisPort = configService.get<number>('redis.port');
        const redisPassword = configService.get<string>('redis.password');
        const redisUrl = configService.get<string>('redis.url');

        // Si hay URL de Redis, usarla; si no, usar host/port
        if (redisUrl) {
          return {
            store: redisStore as any,
            url: redisUrl,
            ttl: configService.get<number>('redis.ttl') || 3600,
          };
        }

        return {
          store: redisStore as any,
          host: redisHost || 'localhost',
          port: redisPort || 6379,
          password: redisPassword || undefined,
          ttl: configService.get<number>('redis.ttl') || 3600,
        };
      },
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('throttler.ttl') || 60) * 1000, // convertir a milisegundos
            limit: configService.get<number>('throttler.limit') || 100,
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [
          User,
          RefreshToken,
          Song,
          Playlist,
          Genre,
          RecentSearch,
          FavoriteSong,
          FavoritePlaylist,
          FavoriteGenre,
        ],
        synchronize: configService.get<string>('app.environment') === 'development',
        logging: configService.get<string>('app.environment') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      Song,
      Playlist,
      Genre,
      RecentSearch,
      FavoriteSong,
      FavoritePlaylist,
      FavoriteGenre,
    ]),
    UsersModule,
    AuthModule,
    MusicModule,
    LibraryModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
