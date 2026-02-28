import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh'])
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'hd', 'uhd'])
  streamingQuality?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'hd', 'uhd'])
  downloadQuality?: string;

  @IsOptional()
  @IsBoolean()
  autoPlay?: boolean;

  @IsOptional()
  @IsBoolean()
  showLyrics?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['flat', 'rock', 'pop', 'bass_boost', 'treble_boost', 'vocal', 'classical', 'jazz', 'electronic', 'custom'])
  equalizerPreset?: string;
}

export class UserSettingsResponseDto {
  language: string;
  streamingQuality: string;
  downloadQuality: string;
  autoPlay: boolean;
  showLyrics: boolean;
  equalizerPreset: string;
}
