import { CustomError } from '../utils/CustomError.js';
/**
 * ContactService - Core identity reconciliation logic
 * Handles the complex task of linking contacts while maintaining operational security
 */
export class ContactService {
  constructor(databaseManager) {
    this.db = databaseManager;
  }

  /**
   * Main identity reconciliation method
   * Processes incoming contact information and consolidates existing records
   */
  async identifyContact(email, phoneNumber) {
    if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
      throw new CustomError('Invalid phone number format', 400, 'INVALID_PHONE_NUMBER');
    }
    // Step 1: Find existing contacts with matching email or phone
    const existingContacts = await this.db.findContactsByEmailOrPhone(email, phoneNumber);
    
    if (existingContacts.length === 0) {
      // No existing contacts - create new primary contact
      return this.createNewPrimaryContact(email, phoneNumber);
    }

    // Step 2: Analyze existing contacts and determine consolidation strategy
    const consolidationPlan = this.analyzeContacts(existingContacts, email, phoneNumber);
    
    // Step 3: Execute consolidation based on the plan
    return this.executeConsolidation(consolidationPlan, email, phoneNumber);
  }

  /**
   * Create a new primary contact when no matches are found
   */
  async createNewPrimaryContact(email, phoneNumber) {
    const newContact = await this.db.createContact(email, phoneNumber, null, 'primary');
    
    return {
      primaryContactId: newContact.id,
      emails: email ? [email] : [],
      phoneNumbers: phoneNumber ? [phoneNumber] : [],
      secondaryContactIds: []
    };
  }

  /**
   * Analyze existing contacts to determine the best consolidation strategy
   */
  analyzeContacts(existingContacts, email, phoneNumber) {
    // Find primary contacts
    const primaryContacts = existingContacts.filter(c => c.linkPrecedence === 'primary');
    const secondaryContacts = existingContacts.filter(c => c.linkPrecedence === 'secondary');

    // Determine if we have exact matches
    const exactEmailMatch = existingContacts.find(c => c.email === email);
    const exactPhoneMatch = existingContacts.find(c => c.phoneNumber === phoneNumber);

    // If we have an exact match for both email and phone, no new contact needed
    if (exactEmailMatch && exactPhoneMatch && exactEmailMatch.id === exactPhoneMatch.id) {
      return {
        action: 'return_existing',
        primaryContact: this.findPrimaryInChain(exactEmailMatch, existingContacts)
      };
    }

    // If we have multiple primary contacts, we need to merge them
    if (primaryContacts.length > 1) {
      return {
        action: 'merge_primaries',
        primaryContacts: primaryContacts,
        secondaryContacts: secondaryContacts
      };
    }

    // If we have one primary contact, create secondary
    if (primaryContacts.length === 1) {
      return {
        action: 'create_secondary',
        primaryContact: primaryContacts[0],
        needsNewInfo: this.determineNewInfo(existingContacts, email, phoneNumber)
      };
    }

    // If we only have secondary contacts, find their primary
    if (secondaryContacts.length > 0) {
      const primaryId = secondaryContacts[0].linkedId;
      return {
        action: 'link_to_existing_primary',
        primaryId: primaryId,
        needsNewInfo: this.determineNewInfo(existingContacts, email, phoneNumber)
      };
    }

    // Fallback - create new primary
    return {
      action: 'create_new_primary'
    };
  }

  /**
   * Find the primary contact in a chain of linked contacts
   */
  findPrimaryInChain(contact, allContacts) {
    if (contact.linkPrecedence === 'primary') {
      return contact;
    }
    
    return allContacts.find(c => c.id === contact.linkedId && c.linkPrecedence === 'primary');
  }

  /**
   * Determine what new information needs to be stored
   */
  determineNewInfo(existingContacts, email, phoneNumber) {
    const existingEmails = existingContacts.map(c => c.email).filter(Boolean);
    const existingPhones = existingContacts.map(c => c.phoneNumber).filter(Boolean);

    return {
      needsEmail: email && !existingEmails.includes(email),
      needsPhone: phoneNumber && !existingPhones.includes(phoneNumber)
    };
  }

  /**
   * Execute the consolidation plan
   */
  async executeConsolidation(plan, email, phoneNumber) {
    switch (plan.action) {
      case 'return_existing':
        return this.buildResponse(plan.primaryContact.id);

      case 'merge_primaries':
        return this.mergePrimaryContacts(plan.primaryContacts, plan.secondaryContacts, email, phoneNumber);

      case 'create_secondary':
        return this.createSecondaryContact(plan.primaryContact, plan.needsNewInfo, email, phoneNumber);

      case 'link_to_existing_primary':
        return this.linkToExistingPrimary(plan.primaryId, plan.needsNewInfo, email, phoneNumber);

      case 'create_new_primary':
        return this.createNewPrimaryContact(email, phoneNumber);

      default:
        throw new Error('Unknown consolidation action');
    }
  }

  /**
   * Merge multiple primary contacts into one
   */
  async mergePrimaryContacts(primaryContacts, secondaryContacts, email, phoneNumber) {
    // Keep the oldest primary contact as the main primary
    const mainPrimary = primaryContacts.reduce((oldest, current) => 
      new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
    );

    // Convert other primaries to secondaries
    for (const primary of primaryContacts) {
      if (primary.id !== mainPrimary.id) {
        await this.db.updateContactLink(primary.id, mainPrimary.id, 'secondary');
      }
    }

    // Update all existing secondaries to point to the main primary
    for (const secondary of secondaryContacts) {
      if (secondary.linkedId !== mainPrimary.id) {
        await this.db.updateContactLink(secondary.id, mainPrimary.id, 'secondary');
      }
    }

    // Check if we need to create a new secondary for new information
    const allContacts = [...primaryContacts, ...secondaryContacts];
    const needsNewInfo = this.determineNewInfo(allContacts, email, phoneNumber);

    if (needsNewInfo.needsEmail || needsNewInfo.needsPhone) {
      await this.db.createContact(
        needsNewInfo.needsEmail ? email : null,
        needsNewInfo.needsPhone ? phoneNumber : null,
        mainPrimary.id,
        'secondary'
      );
    }

    return this.buildResponse(mainPrimary.id);
  }

  /**
   * Create a secondary contact linked to an existing primary
   */
  async createSecondaryContact(primaryContact, needsNewInfo, email, phoneNumber) {
    if (needsNewInfo.needsEmail || needsNewInfo.needsPhone) {
      await this.db.createContact(
        needsNewInfo.needsEmail ? email : null,
        needsNewInfo.needsPhone ? phoneNumber : null,
        primaryContact.id,
        'secondary'
      );
    }

    return this.buildResponse(primaryContact.id);
  }

  /**
   * Link new information to an existing primary contact
   */
  async linkToExistingPrimary(primaryId, needsNewInfo, email, phoneNumber) {
    if (needsNewInfo.needsEmail || needsNewInfo.needsPhone) {
      await this.db.createContact(
        needsNewInfo.needsEmail ? email : null,
        needsNewInfo.needsPhone ? phoneNumber : null,
        primaryId,
        'secondary'
      );
    }

    return this.buildResponse(primaryId);
  }

  /**
   * Build the final response with all consolidated contact information
   */
  async buildResponse(primaryContactId) {
    const linkedContacts = await this.db.getLinkedContacts(primaryContactId);
    
    const emails = [...new Set(linkedContacts.map(c => c.email).filter(Boolean))];
    const phoneNumbers = [...new Set(linkedContacts.map(c => c.phoneNumber).filter(Boolean))];
    const secondaryContactIds = linkedContacts
      .filter(c => c.linkPrecedence === 'secondary')
      .map(c => c.id);

    return {
      primaryContactId,
      emails,
      phoneNumbers,
      secondaryContactIds
    };
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats() {
    return this.db.getStats();
  }
}