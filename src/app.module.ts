import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TcpModule } from './tcp/tcp.module.js';
import { ProbeModule } from './probe/probe.module.js';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    TcpModule,
    ProbeModule,
  ],
})
export class AppModule { }