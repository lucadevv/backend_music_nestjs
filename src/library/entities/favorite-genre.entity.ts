import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Genre } from '../../music/entities/genre.entity';

@Entity('favorite_genres')
@Unique(['userId', 'genreId'])
@Index(['userId'])
@Index(['genreId'])
export class FavoriteGenre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  genreId: string;

  @ManyToOne(() => Genre, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'genreId' })
  genre: Genre;

  @CreateDateColumn()
  createdAt: Date;
}
