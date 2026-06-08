import { Command } from 'commander';
import { generateCommand } from '../commands/generate';
import { initCommand } from '../commands/init';
import { validateCommand } from '../commands/validate';

const program = new Command();

program
  .name('seo-assist')
  .description('CLI для автоматической настройки SEO в веб-проектах')
  .version('0.1.0');

program
  .command('init')
  .description('Инициализировать seo.config.json в проекте')
  .action(async () => {
    await initCommand();
  });

program
  .command('generate')
  .description('Сгенерировать robots.txt, sitemap.xml, метатеги и интегрировать в код')
  .action(async () => {
    await generateCommand();
  });

program
  .command('validate')
  .description('Проверить текущий SEO-статус проекта')
  .action(async () => {
    await validateCommand();
  });

program.parse(process.argv);
