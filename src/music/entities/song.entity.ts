import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Genre } from './genre.entity';

@Entity('songs')
@Index(['title', 'artist'])
@Index(['videoId'], { unique: true, where: '"videoId" IS NOT NULL' })
@Index(['createdAt'])
@Index(['likeCount'])
@Index(['playCount'])
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  videoId: string | null; // ID del servicio externo

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  artist: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  album: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  thumbnail: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioUrl: string | null;

  @Column({ type: 'int', default: 0 })
  duration: number; // Duración en segundos

  @Column({ type: 'uuid', nullable: true })
  genreId: string | null;

  @ManyToOne(() => Genre, { nullable: true })
  @JoinColumn({ name: 'genreId' })
  genre: Genre | null;

  @Column({ type: 'int', default: 0 })
  playCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
