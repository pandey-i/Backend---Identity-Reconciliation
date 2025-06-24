import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ContactService } from './services/ContactService.js';
import { DatabaseManager } from './database/DatabaseManager.js';
import { ErrorHandler } from './middleware/ErrorHandler.js';
import { Logger } from './utils/Logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and services
const dbManager = new DatabaseManager();
const contactService = new ContactService(dbManager);
const logger = new Logger();

// Security middleware - operating under the radar
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// Rate limiting to avoid detection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Service temporarily unavailable',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Covert logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });
  
  next();
});

// Health check endpoint - appears as standard service
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    service: 'contact-management'
  });
});

// Main identity reconciliation endpoint
app.post('/identify', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    
    // Validate input with covert error messages
    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: 'Invalid request format',
        code: 'MISSING_CONTACT_INFO',
        message: 'At least one contact method required'
      });
    }
    
    // Email validation (if provided)
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Phone validation (if provided)
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        error: 'Invalid phone format',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Process the identity reconciliation
    const result = await contactService.identifyContact(email, phoneNumber);
    
    // Return consolidated contact information
    res.status(200).json({
      contact: {
        primaryContactId: result.primaryContactId,
        emails: result.emails,
        phoneNumbers: result.phoneNumbers,
        secondaryContactIds: result.secondaryContactIds
      }
    });
    
  } catch (error) {
    logger.logError('Identity reconciliation failed', error);
    
    // Covert error response - doesn't reveal internal structure
    res.status(500).json({
      error: 'Service temporarily unavailable',
      code: 'INTERNAL_ERROR',
      requestId: generateRequestId()
    });
  }
});

// Covert admin endpoint for database status (hidden functionality)
app.get('/admin/status', async (req, res) => {
  try {
    const stats = await contactService.getDatabaseStats();
    res.status(200).json({
      database: 'operational',
      contacts: stats.totalContacts,
      primaryContacts: stats.primaryContacts,
      secondaryContacts: stats.secondaryContacts,
      lastUpdate: stats.lastUpdate
    });
  } catch (error) {
    res.status(503).json({
      error: 'Service unavailable',
      code: 'MAINTENANCE_MODE'
    });
  }
});

// 404 handler - misleading response
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    suggestion: 'Check API documentation'
  });
});

// Global error handler
app.use(ErrorHandler.handle);

// Utility functions for validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phoneNumber) {
  // Accept various phone number formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
}

function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Initialize database and start server
async function startServer() {
  try {
    await dbManager.initialize();
    logger.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      logger.log(`Identity Reconciliation Service operational on port ${PORT}`);
      logger.log('Mission parameters loaded. Standing by for contact reconciliation requests.');
    });
  } catch (error) {
    logger.logError('Failed to initialize service', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.log('Received SIGTERM. Initiating graceful shutdown...');
  await dbManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.log('Received SIGINT. Shutting down service...');
  await dbManager.close();
  process.exit(0);
});

startServer();