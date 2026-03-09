import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CaixaService } from '../caixa/caixa.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const caixaService = app.get(CaixaService);

  console.log('Seeding default caixas...');
  const results = await caixaService.seedDefaults();
  console.log('Seeding complete.');
  results.forEach((r) => console.log(r));

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seeding failed', err);
  process.exit(1);
});
