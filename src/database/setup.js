import { DatabaseManager } from './DatabaseManager.js';
import { Logger } from '../utils/Logger.js';

/**
 * Database Setup Script
 * Initializes the production database with proper schema and indexes
 */
async function setupDatabase() {
  const logger = new Logger();
  const dbManager = new DatabaseManager();

  try {
    logger.log('Initializing database setup...');
    
    await dbManager.initialize();
    logger.log('Database schema created successfully');

    // Insert some test data for development
    if (process.env.NODE_ENV === 'development') {
      await insertTestData(dbManager, logger);
    }

    logger.log('Database setup completed successfully');
    
  } catch (error) {
    logger.logError('Database setup failed', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

async function insertTestData(dbManager, logger) {
  logger.log('Inserting test data...');

  // Create some sample contacts for testing
  const testContacts = [
    { email: 'doc.brown@zamazon.com', phone: '555-0101' },
    { email: 'emmett@zamazon.com', phone: '555-0102' },
    { email: 'marty@zamazon.com', phone: '555-0103' }
  ];

  for (const contact of testContacts) {
    await dbManager.createContact(contact.email, contact.phone, null, 'primary');
  }

  logger.log(`Inserted ${testContacts.length} test contacts`);
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}

export { setupDatabase };