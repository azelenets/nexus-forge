import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'NEXUS-FORGE Core API' })
  @IsString()
  @Length(3, 140)
  name!: string;

  @ApiProperty({ example: 'Core service for commands, queries, and domain events' })
  @IsString()
  @Length(3, 2000)
  description!: string;
}
