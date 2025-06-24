import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DatabaseManager - Handles all database operations with covert efficiency
 * Manages SQLite database for contact storage and reconciliation
 */
export class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/contacts.db');
  }

  /**
   * Initialize database connection and create tables if needed
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Database connection failed: ${err.message}`));
          return;
        }
        
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * Create the Contact table with proper schema
   */
  async createTables() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS Contact (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phoneNumber TEXT,
        email TEXT,
        linkedId INTEGER,
        linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        deletedAt DATETIME,
        FOREIGN KEY (linkedId) REFERENCES Contact(id)
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_email ON Contact(email)',
      'CREATE INDEX IF NOT EXISTS idx_phone ON Contact(phoneNumber)',
      'CREATE INDEX IF NOT EXISTS idx_linked ON Contact(linkedId)',
      'CREATE INDEX IF NOT EXISTS idx_precedence ON Contact(linkPrecedence)'
    ];

    return new Promise((resolve, reject) => {
      this.db.run(createTableSQL, (err) => {
        if (err) {
          reject(new Error(`Table creation failed: ${err.message}`));
          return;
        }

        // Create indexes for optimized queries
        Promise.all(createIndexes.map(sql => this.run(sql)))
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * Execute a SQL query with parameters
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get a single row from database
   */
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get multiple rows from database
   */
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Find contacts by email or phone number
   */
  async findContactsByEmailOrPhone(email, phoneNumber) {
    const conditions = [];
    const params = [];

    if (email) {
      conditions.push('email = ?');
      params.push(email);
    }

    if (phoneNumber) {
      conditions.push('phoneNumber = ?');
      params.push(phoneNumber);
    }

    if (conditions.length === 0) {
      return [];
    }

    const sql = `
      SELECT * FROM Contact 
      WHERE (${conditions.join(' OR ')}) 
      AND deletedAt IS NULL
      ORDER BY createdAt ASC
    `;

    return this.all(sql, params);
  }

  /**
   * Create a new contact entry
   */
  async createContact(email, phoneNumber, linkedId = null, linkPrecedence = 'primary') {
    const sql = `
      INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const result = await this.run(sql, [email, phoneNumber, linkedId, linkPrecedence]);
    return this.get('SELECT * FROM Contact WHERE id = ?', [result.id]);
  }

  /**
   * Update contact's link precedence and linked ID
   */
  async updateContactLink(contactId, linkedId, linkPrecedence) {
    const sql = `
      UPDATE Contact 
      SET linkedId = ?, linkPrecedence = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.run(sql, [linkedId, linkPrecedence, contactId]);
    return this.get('SELECT * FROM Contact WHERE id = ?', [contactId]);
  }

  /**
   * Get all contacts in a linked group
   */
  async getLinkedContacts(primaryId) {
    const sql = `
      SELECT * FROM Contact 
      WHERE (id = ? OR linkedId = ?) 
      AND deletedAt IS NULL
      ORDER BY linkPrecedence DESC, createdAt ASC
    `;

    return this.all(sql, [primaryId, primaryId]);
  }

  /**
   * Get database statistics for monitoring
   */
  async getStats() {
    const totalContacts = await this.get('SELECT COUNT(*) as count FROM Contact WHERE deletedAt IS NULL');
    const primaryContacts = await this.get('SELECT COUNT(*) as count FROM Contact WHERE linkPrecedence = "primary" AND deletedAt IS NULL');
    const secondaryContacts = await this.get('SELECT COUNT(*) as count FROM Contact WHERE linkPrecedence = "secondary" AND deletedAt IS NULL');
    const lastUpdate = await this.get('SELECT MAX(updatedAt) as lastUpdate FROM Contact');

    return {
      totalContacts: totalContacts.count,
      primaryContacts: primaryContacts.count,
      secondaryContacts: secondaryContacts.count,
      lastUpdate: lastUpdate.lastUpdate
    };
  }

  /**
   * Close database connection
   */
  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}