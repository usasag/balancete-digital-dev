import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * FileStorageService - Handles file uploads.
 *
 * Currently operates in "testMode" (local storage).
 * When Google Drive integration is needed:
 * 1. Set FILE_STORAGE_TEST_MODE=false in .env
 * 2. Install googleapis: npm install googleapis
 * 3. Configure GOOGLE_DRIVE_FOLDER_ID and GOOGLE_SERVICE_ACCOUNT_JSON
 * 4. Uncomment the Google Drive code below
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly testMode: boolean;
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.testMode =
      this.configService.get<string>('FILE_STORAGE_TEST_MODE', 'true') ===
      'true';
    this.uploadDir = this.configService.get<string>(
      'LOCAL_UPLOAD_DIR',
      './uploads',
    );

    if (this.testMode) {
      this.logger.log(
        'FileStorageService running in TEST MODE (local storage)',
      );
      this.ensureUploadDir();
    } else {
      // TODO: Initialize Google Drive client here when ready
      this.logger.log(
        'FileStorageService configured for Google Drive (not yet implemented)',
      );
      this.ensureUploadDir(); // Fallback to local
    }
  }

  private ensureUploadDir(): void {
    const dir = path.resolve(this.uploadDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.log(`Created upload directory: ${dir}`);
    }
  }

  /**
   * Upload a file. Returns the URL/path to access the file.
   */
  uploadFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    nucleoId: string,
  ): string {
    const ext = path.extname(originalFilename) || this.getExtFromMime(mimeType);
    const filename = `${uuidv4()}${ext}`;

    if (this.testMode) {
      return this.uploadLocal(buffer, filename, nucleoId);
    } else {
      // TODO: When Google Drive is configured, call uploadToDrive here
      // For now, fallback to local
      return this.uploadLocal(buffer, filename, nucleoId);
    }
  }

  private uploadLocal(
    buffer: Buffer,
    filename: string,
    nucleoId: string,
  ): string {
    const dir = path.resolve(this.uploadDir, nucleoId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    // Return a relative URL that can be served by the backend
    const relativePath = `/uploads/${nucleoId}/${filename}`;
    this.logger.log(`File saved locally: ${relativePath}`);
    return relativePath;
  }

  private getExtFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mimeType] || '.bin';
  }

  /**
   * Delete a file (local only for now)
   */
  deleteFile(fileUrl: string): void {
    if (fileUrl.startsWith('/uploads/')) {
      const filePath = path.resolve('.', fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted local file: ${filePath}`);
      }
    }
    // TODO: Add Google Drive deletion when implemented
  }
}
