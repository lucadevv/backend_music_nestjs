import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
}

export enum AuthProvider {
    EMAIL = 'email',
    GOOGLE = 'google',
    APPLE = 'apple',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['provider', 'providerId'], { unique: true, where: 'provider IS NOT NULL' })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    email: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    password: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    firstName: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    lastName: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    avatar: string | null;

    @Column({
        type: 'enum',
        enum: AuthProvider,
        default: AuthProvider.EMAIL,
    })
    provider: AuthProvider;

    @Column({ type: 'varchar', length: 255, nullable: true })
    providerId: string | null; // ID del proveedor OAuth (Google, Apple)

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'boolean', default: false })
    isEmailVerified: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date | null;

    // Configuraciones de usuario
    @Column({ type: 'varchar', length: 10, default: 'en' })
    language: string; // 'en', 'es', etc.

    @Column({ type: 'varchar', length: 20, default: 'high' })
    streamingQuality: string; // 'low', 'medium', 'high', 'hd'

    @Column({ type: 'varchar', length: 20, default: 'high' })
    downloadQuality: string; // 'low', 'medium', 'high', 'hd'

    @Column({ type: 'boolean', default: true })
    autoPlay: boolean;

    @Column({ type: 'boolean', default: false })
    showLyrics: boolean;

    @Column({ type: 'varchar', length: 50, default: 'flat' })
    equalizerPreset: string; // 'flat', 'rock', 'pop', 'bass_boost', 'treble_boost', 'vocal', 'classical'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
