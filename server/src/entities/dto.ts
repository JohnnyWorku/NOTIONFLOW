import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRecordDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) priority?: string;
  @ApiPropertyOptional({ description: 'ISO 8601 date' }) @IsOptional() @IsISO8601() due?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() done?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional({ description: 'Generic number (pages read, minutes, reps…)' }) @IsOptional() @IsNumber() @Min(-1_000_000) @Max(1_000_000_000) amount?: number;
}

export class UpdateRecordDto {
  @ApiProperty({ description: 'lastEdited value the client last saw; used for conflict detection' })
  @IsISO8601() expectedLastEdited: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(300) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) priority?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsISO8601() due?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() done?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-1_000_000) @Max(1_000_000_000) amount?: number;
}

export class ListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional({ default: 25 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ description: 'only not-done records with due date before today' })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() overdue?: boolean;
  @ApiPropertyOptional({ description: 'date on or after (YYYY-MM-DD)' }) @IsOptional() @IsISO8601() dueFrom?: string;
  @ApiPropertyOptional({ description: 'date on or before (YYYY-MM-DD)' }) @IsOptional() @IsISO8601() dueTo?: string;
  @ApiPropertyOptional({ description: 'exclude done / completed records' })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() open?: boolean;
}
