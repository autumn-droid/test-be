import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ThemeVersionDto } from './dto/theme-version.dto';

interface Metadata {
  currentVersion: string;
  versions: ThemeVersionDto[];
}

@Injectable()
export class ThemesService {
  private readonly storagePath = path.join(process.cwd(), 'storage', 'themes');
  private readonly metadataPath = path.join(this.storagePath, 'metadata.json');

  async getCurrentVersion(): Promise<ThemeVersionDto> {
    const metadata = await this.readMetadata();
    const currentVersion = metadata.versions.find(
      (v) => v.version === metadata.currentVersion,
    );

    if (!currentVersion) {
      throw new NotFoundException('No current theme version found');
    }

    return currentVersion;
  }

  async getVersionMetadata(version: string): Promise<ThemeVersionDto> {
    const metadata = await this.readMetadata();
    const versionData = metadata.versions.find((v) => v.version === version);

    if (!versionData) {
      throw new NotFoundException(`Theme version ${version} not found`);
    }

    return versionData;
  }

  async getAllVersions(): Promise<ThemeVersionDto[]> {
    const metadata = await this.readMetadata();
    return metadata.versions;
  }

  async downloadTheme(version: string): Promise<string> {
    const themePath = path.join(this.storagePath, 'versions', `v${version}`, 'theme.zip');

    try {
      await fs.access(themePath);
      return themePath;
    } catch {
      throw new NotFoundException(`Theme version ${version} not found`);
    }
  }

  async getDataJsonPath(version: string): Promise<string> {
    const dataJsonPath = path.join(this.storagePath, 'versions', `v${version}`, 'data.json');

    try {
      await fs.access(dataJsonPath);
      return dataJsonPath;
    } catch {
      throw new NotFoundException(`Data.json not found for version ${version}`);
    }
  }

  async uploadTheme(file: Express.Multer.File, changelog?: string): Promise<ThemeVersionDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is a zip by checking mimetype or extension
    const isZip = file.mimetype.includes('zip') || 
                  file.mimetype.includes('octet-stream') ||
                  file.originalname.toLowerCase().endsWith('.zip');
    
    if (!isZip) {
      throw new BadRequestException('File must be a zip archive');
    }

    const metadata = await this.readMetadata();
    const newVersion = this.incrementVersion(metadata.currentVersion);

    const versionDir = path.join(this.storagePath, 'versions', `v${newVersion}`);
    await fs.mkdir(versionDir, { recursive: true });

    // Save the original zip file as-is
    const destinationPath = path.join(versionDir, 'theme.zip');
    await fs.writeFile(destinationPath, file.buffer);

    // Extract data.json from the uploaded zip if it exists
    const dataJson = await this.extractDataJson(destinationPath);
    
    if (dataJson) {
      // Save the extracted data.json
      await fs.writeFile(
        path.join(versionDir, 'data.json'),
        JSON.stringify(dataJson, null, 2)
      );
    }

    const stats = await fs.stat(destinationPath);
    const versionData: ThemeVersionDto = {
      version: newVersion,
      releaseDate: new Date().toISOString(),
      size: stats.size,
      changelog: changelog || 'No changelog provided',
    };

    metadata.versions.push(versionData);
    metadata.currentVersion = newVersion;

    await this.writeMetadata(metadata);

    return versionData;
  }

  private async extractDataJson(zipPath: string): Promise<Record<string, string> | null> {
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      const dataJsonEntry = zip.getEntry('data.json');
      
      if (dataJsonEntry) {
        const dataJsonContent = dataJsonEntry.getData().toString('utf-8');
        return JSON.parse(dataJsonContent);
      }
      
      return null;
    } catch (error) {
      // If extraction fails, return null
      return null;
    }
  }

  private async readMetadata(): Promise<Metadata> {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { currentVersion: '0', versions: [] };
    }
  }

  private async writeMetadata(metadata: Metadata): Promise<void> {
    await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2));
  }

  private incrementVersion(currentVersion: string): string {
    const version = parseInt(currentVersion, 10);
    return (version + 1).toString();
  }
}

