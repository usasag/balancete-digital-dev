import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

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
  private readonly driveRootFolderId: string;
  private readonly driveClient: drive_v3.Drive | null;
  private readonly driveEnabled: boolean;
  private readonly folderCache = new Map<string, string>();

  constructor(private configService: ConfigService) {
    this.testMode =
      this.configService.get<string>('FILE_STORAGE_TEST_MODE', 'true') ===
      'true';
    this.uploadDir = this.configService.get<string>(
      'LOCAL_UPLOAD_DIR',
      './uploads',
    );
    this.driveRootFolderId =
      this.configService.get<string>('GOOGLE_DRIVE_ROOT_FOLDER_ID') || 'root';
    this.driveClient = this.createDriveClient();
    this.driveEnabled = !this.testMode && this.driveClient !== null;

    if (this.testMode || !this.driveEnabled) {
      this.logger.log(
        'FileStorageService running in TEST MODE (local storage)',
      );
      this.ensureUploadDir();
    } else {
      this.logger.log('FileStorageService configured for Google Drive');
    }
  }

  isDriveConfigured(): boolean {
    return this.driveEnabled;
  }

  getProviderName(): 'LOCAL_TEST' | 'GOOGLE_DRIVE' {
    return this.driveEnabled ? 'GOOGLE_DRIVE' : 'LOCAL_TEST';
  }

  async checkEvidenceReference(params: {
    driveFileId?: string | null;
    url?: string | null;
  }): Promise<{
    status: 'HEALTHY' | 'BROKEN' | 'MISSING' | 'UNKNOWN';
    message: string;
  }> {
    const driveFileId = params.driveFileId || this.extractDriveFileId(params.url);
    const url = params.url || '';

    if (!driveFileId && !url) {
      return {
        status: 'MISSING',
        message: 'Registro sem evidência vinculada.',
      };
    }

    if (driveFileId) {
      if (!this.driveEnabled || !this.driveClient) {
        return {
          status: 'UNKNOWN',
          message: 'Provider em modo local; validação no Drive indisponível.',
        };
      }

      try {
        const result = await this.driveClient.files.get({
          fileId: driveFileId,
          fields: 'id,trashed',
        });

        if (!result.data.id || result.data.trashed) {
          return {
            status: 'BROKEN',
            message: 'Arquivo removido ou enviado para lixeira no Drive.',
          };
        }

        return {
          status: 'HEALTHY',
          message: 'Arquivo de evidência disponível.',
        };
      } catch {
        return {
          status: 'BROKEN',
          message: 'Arquivo não encontrado no Drive ou sem acesso.',
        };
      }
    }

    if (url.startsWith('/uploads/')) {
      const filePath = path.resolve('.', url);
      const exists = fs.existsSync(filePath);
      return exists
        ? {
            status: 'HEALTHY',
            message: 'Arquivo local de evidência disponível.',
          }
        : {
            status: 'BROKEN',
            message: 'Arquivo local não encontrado.',
          };
    }

    return {
      status: 'UNKNOWN',
      message: 'Evidência externa sem validação automática.',
    };
  }

  private extractDriveFileId(url?: string | null): string | null {
    if (!url) return null;
    const directMatch = url.match(/\/d\/([^/]+)/);
    if (directMatch?.[1]) return directMatch[1];

    const idParamMatch = url.match(/[?&]id=([^&]+)/);
    if (idParamMatch?.[1]) return idParamMatch[1];

    return null;
  }

  private createDriveClient(): drive_v3.Drive | null {
    const serviceAccountRaw = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_JSON',
    );

    if (!serviceAccountRaw) {
      if (!this.testMode) {
        this.logger.warn('GOOGLE_SERVICE_ACCOUNT_JSON não configurado.');
      }
      return null;
    }

    try {
      const parsed = JSON.parse(serviceAccountRaw) as {
        client_email: string;
        private_key: string;
      };

      const auth = new google.auth.JWT({
        email: parsed.client_email,
        key: parsed.private_key?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      return google.drive({ version: 'v3', auth });
    } catch (error) {
      this.logger.error('Falha ao carregar credencial do Google Drive.', error);
      return null;
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
  async uploadFileWithMetadata(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    nucleoId: string,
    options?: {
      tipo?: 'RECEITA' | 'DESPESA';
      dataMovimento?: Date;
      domain?: 'lancamento' | 'mensalidade';
    },
  ): Promise<{
    url: string;
    driveFileId: string | null;
    driveFolderId: string | null;
    webViewLink: string | null;
  }> {
    const filename = this.buildStandardizedFilename(
      originalFilename,
      mimeType,
      nucleoId,
      options,
    );

    if (!this.driveEnabled || !this.driveClient) {
      return {
        url: this.uploadLocal(buffer, filename, nucleoId),
        driveFileId: null,
        driveFolderId: null,
        webViewLink: null,
      };
    }

    return this.uploadToDrive(
      buffer,
      originalFilename,
      mimeType,
      nucleoId,
      options,
    );
  }

  private async uploadToDrive(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    nucleoId: string,
    options?: {
      tipo?: 'RECEITA' | 'DESPESA';
      dataMovimento?: Date;
      domain?: 'lancamento' | 'mensalidade';
    },
  ) {
    if (!this.driveClient) {
      throw new Error('Google Drive client indisponível.');
    }

    const movementDate = options?.dataMovimento || new Date();
    const yyyy = String(movementDate.getFullYear());
    const mm = String(movementDate.getMonth() + 1).padStart(2, '0');
    const tipo = options?.tipo || 'DESPESA';
    const domain = options?.domain || 'lancamento';
    const folderPath = [
      `Nucleo-${nucleoId}`,
      yyyy,
      mm,
      domain,
      tipo,
    ];
    const filename = this.buildStandardizedFilename(
      originalFilename,
      mimeType,
      nucleoId,
      options,
    );

    const folderId = await this.ensureDriveFolderPath(folderPath);
    const uploaded = await this.driveClient.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
    });

    const driveFileId = uploaded.data.id || null;
    const webViewLink = uploaded.data.webViewLink || null;

    return {
      url: webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`,
      driveFileId,
      driveFolderId: folderId,
      webViewLink,
    };
  }

  private async ensureDriveFolderPath(pathParts: string[]): Promise<string> {
    let currentParent = this.driveRootFolderId;

    for (const part of pathParts) {
      const cacheKey = `${currentParent}/${part}`;
      const cached = this.folderCache.get(cacheKey);
      if (cached) {
        currentParent = cached;
        continue;
      }

      const existingId = await this.findFolderByName(part, currentParent);
      if (existingId) {
        this.folderCache.set(cacheKey, existingId);
        currentParent = existingId;
        continue;
      }

      const created = await this.driveClient!.files.create({
        requestBody: {
          name: part,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [currentParent],
        },
        fields: 'id',
      });

      const folderId = created.data.id;
      if (!folderId) {
        throw new Error(`Falha ao criar pasta ${part} no Google Drive.`);
      }
      this.folderCache.set(cacheKey, folderId);
      currentParent = folderId;
    }

    return currentParent;
  }

  private async findFolderByName(
    name: string,
    parentId: string,
  ): Promise<string | null> {
    if (!this.driveClient) return null;

    const escapedName = name.replace(/'/g, "\\'");
    const query = [
      `name = '${escapedName}'`,
      `'${parentId}' in parents`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      'trashed = false',
    ].join(' and ');

    const result = await this.driveClient.files.list({
      q: query,
      fields: 'files(id,name)',
      pageSize: 1,
    });

    return result.data.files?.[0]?.id || null;
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

  private buildStandardizedFilename(
    originalFilename: string,
    mimeType: string,
    nucleoId: string,
    options?: {
      tipo?: 'RECEITA' | 'DESPESA';
      dataMovimento?: Date;
      domain?: 'lancamento' | 'mensalidade';
    },
  ): string {
    const ext = path.extname(originalFilename) || this.getExtFromMime(mimeType);
    const movementDate = options?.dataMovimento || new Date();
    const yyyy = String(movementDate.getFullYear());
    const mm = String(movementDate.getMonth() + 1).padStart(2, '0');
    const dd = String(movementDate.getDate()).padStart(2, '0');
    const tipo = (options?.tipo || 'DESPESA').toLowerCase();
    const domain = (options?.domain || 'lancamento').toLowerCase();
    const safeNucleo = nucleoId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = uuidv4();

    return `${domain}_${tipo}_${safeNucleo}_${yyyy}${mm}${dd}_${unique}${ext}`;
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
