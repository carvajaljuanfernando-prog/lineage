import { Module } from '@nestjs/common';
import { PedigreeController } from './pedigree.controller';
import { PedigreeService } from './pedigree.service';

@Module({
  controllers: [PedigreeController],
  providers: [PedigreeService],
  exports: [PedigreeService],
})
export class PedigreeModule {}
