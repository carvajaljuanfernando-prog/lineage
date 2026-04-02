import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { PatientsModule } from './patients/patients.module';
import { SurveysModule } from './surveys/surveys.module';
import { PedigreeModule } from './pedigree/pedigree.module';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    TenantsModule,
    PatientsModule,
    SurveysModule,
    PedigreeModule,
  ],
})
export class AppModule {}
