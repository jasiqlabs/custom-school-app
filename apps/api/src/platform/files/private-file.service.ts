import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';
import { ApiError } from '../../common/http/api-error';
import type { FileType } from '@prisma/client';

@Injectable()
export class PrivateFileService implements OnModuleInit {
  readonly client:MinioClient;
  constructor(private readonly prisma:PrismaService,private readonly config:AppConfig){this.client=new MinioClient({endPoint:config.minio.endPoint,port:config.minio.port,useSSL:config.minio.useSSL,accessKey:config.minio.accessKey,secretKey:config.minio.secretKey});}
  async onModuleInit(){const exists=await this.client.bucketExists(this.config.minio.bucket).catch(()=>false); if(!exists)await this.client.makeBucket(this.config.minio.bucket);}
  private validateImage(buffer:Buffer,mime:string){if(buffer.length<8||buffer.length>5*1024*1024)throw new ApiError(413,'ERR_FILE_SIZE','Image must be <= 5 MB');const png=buffer.subarray(0,8).toString('hex')==='89504e470d0a1a0a';const jpg=buffer[0]===0xff&&buffer[1]===0xd8&&buffer[buffer.length-2]===0xff&&buffer[buffer.length-1]===0xd9;if(!(png||jpg))throw new ApiError(415,'ERR_FILE_TYPE','Only PNG/JPEG images are allowed');if((png&&mime!=='image/png')||(jpg&&!['image/jpeg','image/jpg'].includes(mime)))throw new ApiError(415,'ERR_FILE_TYPE','MIME and file signature do not match');}
  async storeImage(input:{schoolId:string;fileType:'LOGO'|'SIGNATURE';buffer:Buffer;mime:string;createdBy:string}){this.validateImage(input.buffer,input.mime);const id=randomUUID();const objectKey=`schools/${input.schoolId}/${input.fileType.toLowerCase()}/${id}`;const sha256=createHash('sha256').update(input.buffer).digest('hex');try{await this.client.putObject(this.config.minio.bucket,objectKey,input.buffer,input.buffer.length,{'Content-Type':input.mime,'Cache-Control':'private, no-store'});return await this.prisma.schoolFile.create({data:{id,schoolId:input.schoolId,fileType:input.fileType as FileType,objectKey,mime:input.mime,sizeBytes:input.buffer.length,sha256,status:'AVAILABLE',createdBy:input.createdBy}});}catch(err){await this.client.removeObject(this.config.minio.bucket,objectKey).catch(()=>undefined);throw err;}}
  async storeGenerated(input:{schoolId:string;fileType:'TC'|'RECEIPT'|'REPORT_XLSX';buffer:Buffer;mime:string;createdBy:string}){const id=randomUUID();const objectKey=`schools/${input.schoolId}/${input.fileType.toLowerCase()}/${id}`;const sha256=createHash('sha256').update(input.buffer).digest('hex');await this.client.putObject(this.config.minio.bucket,objectKey,input.buffer,input.buffer.length,{'Content-Type':input.mime,'Cache-Control':'private, no-store'});return await this.prisma.schoolFile.create({data:{id,schoolId:input.schoolId,fileType:input.fileType as FileType,objectKey,mime:input.mime,sizeBytes:input.buffer.length,sha256,status:'AVAILABLE',createdBy:input.createdBy}});}

  async metadata(fileId:string,schoolId:string,fileType?:FileType,tx:any=this.prisma){const file=await tx.schoolFile.findFirst({where:{id:fileId,schoolId,status:'AVAILABLE',...(fileType?{fileType}: {})}});if(!file)throw new ApiError(404,'ERR_FILE_NOT_FOUND','File not found');return file;}
  async signedUrl(fileId:string,schoolId:string){const file=await this.prisma.schoolFile.findFirst({where:{id:fileId,schoolId,status:'AVAILABLE'}});if(!file)throw new ApiError(404,'ERR_FILE_NOT_FOUND','File not found');return {url:await this.client.presignedGetObject(this.config.minio.bucket,file.objectKey,300),expiresInSeconds:300,mime:file.mime,sha256:file.sha256};}
  async readInternal(fileId:string,schoolId:string){const file=await this.prisma.schoolFile.findFirst({where:{id:fileId,schoolId,status:'AVAILABLE'}});if(!file)throw new Error('FILE_NOT_FOUND');const stream=await this.client.getObject(this.config.minio.bucket,file.objectKey);const chunks:Buffer[]=[];for await(const chunk of stream as any)chunks.push(Buffer.from(chunk));return {file,buffer:Buffer.concat(chunks)};}
}
