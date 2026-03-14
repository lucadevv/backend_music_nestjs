import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class OAuthRequestDto {
  @ApiProperty({ description: 'OAuth provider', enum: ['google', 'apple'] })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ description: 'OAuth access token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ description: 'OAuth ID token', required: false })
  @IsString()
  @IsOptional()
  idToken?: string;

  @ApiProperty({ description: 'User email', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'User name', required: false })
  @IsString()
  @IsOptional()
  name?: string;
}
