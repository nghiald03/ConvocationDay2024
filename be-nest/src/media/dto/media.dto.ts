import { IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RenameMediaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  originalName!: string;
}

export class DeleteMediaDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}
