import { logger } from './utils/logger.js';

logger.info('app', 'Application starting');

export function main(): void {
  logger.info('app', 'Hello from Liquor Stores!');
}

main();
