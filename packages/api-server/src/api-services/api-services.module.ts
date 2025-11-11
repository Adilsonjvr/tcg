import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeService } from './stripe.service';
import { RapidApiService } from './rapidapi.service';
import { JustTcgService } from './justtcg.service';
import { RoboflowService } from './roboflow.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { StreamChatService } from './stream.service';
import { PokemonTcgService } from './pokemon-tcg.service';

@Module({
  imports: [PrismaModule],
  providers: [
    StripeService,
    RapidApiService,
    JustTcgService,
    RoboflowService,
    FirebaseAdminService,
    StreamChatService,
    PokemonTcgService,
  ],
  exports: [
    StripeService,
    RapidApiService,
    JustTcgService,
    RoboflowService,
    FirebaseAdminService,
    StreamChatService,
    PokemonTcgService,
  ],
})
export class ApiServicesModule {}
