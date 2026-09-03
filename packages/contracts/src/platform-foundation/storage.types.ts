export type FileCategory = 'LOGO' | 'SIGNATURE' | 'RECEIPT' | 'EXPORT' | 'DOCUMENT';

export interface UploadSchoolFileDto {
  schoolId: string;
  category: FileCategory;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  contentBuffer: Buffer;
  uploadedBy: string;
}

export interface SchoolFileRecord {
  id: string;
  schoolId: string;
  category: FileCategory;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
  uploadedBy: string;
  createdAt: Date;
  status: 'ACTIVE' | 'DELETED';
}
