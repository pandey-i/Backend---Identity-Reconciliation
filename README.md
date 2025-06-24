# Identity Reconciliation Service 🕵️

A covert identity reconciliation web service designed for Zamazon.com integration. This service consolidates customer contact information across multiple purchases while maintaining operational security and discretion.

## 🎯 Mission Overview

Dr. Chandrashekar (Doc) uses different email addresses and phone numbers for each Zamazon purchase to maintain anonymity for his time machine project. This service identifies and links these separate identities to provide a unified customer profile.

## 🚀 Features

- **Identity Reconciliation**: Links contacts based on shared email addresses or phone numbers
- **Primary/Secondary Contact Management**: Maintains hierarchical contact relationships
- **Covert Operations**: Security-focused design with misleading error messages
- **Database Optimization**: Efficient SQLite operations with proper indexing
- **Comprehensive Testing**: Full test suite for validation
- **Production Ready**: Error handling, logging, and monitoring

## 📋 Requirements

- Node.js 18+ 
- SQLite3
- Express.js

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd identity-reconciliation-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   ```bash
   npm run db:setup
   ```

4. **Start the service**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

The service will be operational on `http://localhost:3000`

## 🔧 API Endpoints

### POST /identify
Main identity reconciliation endpoint.

**Request:**
```json
{
  "email": "doc@zamazon.com",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["doc@zamazon.com", "emmett@zamazon.com"],
    "phoneNumbers": ["1234567890", "0987654321"],
    "secondaryContactIds": [2, 3]
  }
}
```

### GET /health
Service health check endpoint.

### GET /admin/status
Database statistics and monitoring (covert admin endpoint).

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

The test suite validates:
- New contact creation
- Contact linking logic
- Primary contact merging
- Edge case handling
- Database operations

## 📊 Database Schema

```sql
Contact {
  id: INTEGER PRIMARY KEY
  phoneNumber: TEXT
  email: TEXT
  linkedId: INTEGER (Foreign Key)
  linkPrecedence: TEXT ('primary' | 'secondary')
  createdAt: DATETIME
  updatedAt: DATETIME
  deletedAt: DATETIME
}
```

## 🔍 How It Works

1. **New Contact**: If no existing contacts match, creates a new primary contact
2. **Existing Match**: If contacts exist, creates secondary contact or links to existing primary
3. **Primary Merging**: When multiple primaries are discovered, merges them intelligently
4. **Response Building**: Consolidates all linked contacts into unified response

## 🛡️ Security Features

- Rate limiting to prevent detection
- Misleading error messages for operational security
- Covert logging system
- Input validation and sanitization
- Helmet.js security headers

## 📁 Project Structure

```
src/
├── server.js              # Main server and routing
├── services/
│   └── ContactService.js   # Core business logic
├── database/
│   ├── DatabaseManager.js  # Database operations
│   └── setup.js            # Database initialization
├── middleware/
│   └── ErrorHandler.js     # Error handling
├── utils/
│   └── Logger.js           # Logging system
└── tests/
    └── test.js             # Test suite
```


## 🔧 Environment Variables

```bash
PORT=3000                   # Server port
NODE_ENV=development        # Environment mode
LOG_LEVEL=info             # Logging level
```

