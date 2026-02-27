import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { FavoriteSong } from './entities/favorite-song.entity';
import { FavoritePlaylist } from './entities/favorite-playlist.entity';
import { FavoriteGenre } from './entities/favorite-genre.entity';
import { Song } from '../music/entities/song.entity';
import { Playlist } from '../music/entities/playlist.entity';
import { Genre } from '../music/entities/genre.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            FavoriteSong,
            FavoritePlaylist,
            FavoriteGenre,
            Song,
            Playlist,
            Genre,
        ]),
    ],
    controllers: [LibraryController],
    providers: [LibraryService],
    exports: [LibraryService],
})
export class LibraryModule {}
