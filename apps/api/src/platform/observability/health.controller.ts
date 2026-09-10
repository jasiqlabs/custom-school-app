import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrivateFileService } from '../files/private-file.service';
@Controller('health')
export class HealthController {
  constructor(private readonly prisma:PrismaService,private readonly files:PrivateFileService){}
  @Get('live') live(){return{status:'ok'};}
  @Get('ready') async ready(){try{await this.prisma.$queryRaw`SELECT 1`;await this.files.client.bucketExists(process.env.MINIO_BUCKET||'gdys-private');return{status:'ready'};}catch{throw new ServiceUnavailableException({code:'ERR_NOT_READY',message:'Required dependency unavailable'});}}
}
