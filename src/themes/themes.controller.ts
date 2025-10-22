import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ThemesService } from './themes.service';
import { ThemeVersionDto, UploadThemeDto } from './dto/theme-version.dto';
import { StreamableFile } from '@nestjs/common';

@ApiTags('themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current theme version' })
  @ApiResponse({
    status: 200,
    description: 'Current theme version information',
    type: ThemeVersionDto,
  })
  @ApiResponse({ status: 404, description: 'No current theme found' })
  async getCurrentVersion(): Promise<ThemeVersionDto> {
    return this.themesService.getCurrentVersion();
  }

  @Get('versions')
  @ApiOperation({ summary: 'List all theme versions' })
  @ApiResponse({
    status: 200,
    description: 'List of all theme versions',
    type: [ThemeVersionDto],
  })
  async getAllVersions(): Promise<ThemeVersionDto[]> {
    return this.themesService.getAllVersions();
  }

  @Get('data')
  @ApiOperation({ summary: 'Get data.json manifest for current version' })
  @ApiResponse({
    status: 200,
    description: 'Data.json manifest file',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Theme not found' })
  async getCurrentDataJson(@Res() res: Response): Promise<void> {
    const currentVersion = await this.themesService.getCurrentVersion();
    const filePath = await this.themesService.getDataJsonPath(currentVersion.version);
    res.download(filePath, `data.json`);
  }

  @Get('data/:version')
  @ApiOperation({ summary: 'Get data.json manifest for specific version' })
  @ApiParam({ name: 'version', description: 'Theme version number', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Data.json manifest file',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Theme version not found' })
  async getDataJson(@Param('version') version: string, @Res() res: Response): Promise<void> {
    const filePath = await this.themesService.getDataJsonPath(version);
    res.download(filePath, `data.json`);
  }

  @Get('download')
  @ApiOperation({ summary: 'Download latest theme version' })
  @ApiResponse({
    status: 200,
    description: 'Theme zip file',
    content: {
      'application/zip': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Theme not found' })
  async downloadLatest(@Res() res: Response): Promise<void> {
    const currentVersion = await this.themesService.getCurrentVersion();
    const filePath = await this.themesService.downloadTheme(currentVersion.version);
    
    res.download(filePath, `theme-v${currentVersion.version}.zip`);
  }

  @Get('download/:version')
  @ApiOperation({ summary: 'Download specific theme version' })
  @ApiParam({ name: 'version', description: 'Theme version number', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Theme zip file',
    content: {
      'application/zip': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Theme version not found' })
  async downloadVersion(
    @Param('version') version: string,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = await this.themesService.downloadTheme(version);
    res.download(filePath, `theme-v${version}.zip`);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload new theme version' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Theme zip file',
        },
        changelog: {
          type: 'string',
          description: 'Changelog for this version',
          example: 'Updated icons and colors',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Theme uploaded successfully',
    type: ThemeVersionDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadTheme(
    @UploadedFile() file: Express.Multer.File,
    @Body('changelog') changelog?: string,
  ): Promise<ThemeVersionDto> {
    return this.themesService.uploadTheme(file, changelog);
  }
}

