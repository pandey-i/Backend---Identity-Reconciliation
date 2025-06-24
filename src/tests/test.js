import { ContactService } from '../services/ContactService.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

/**
 * Covert Unit Testing Suite
 * Validates service functionality while maintaining operational security
 */
class TestSuite {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.contactService = new ContactService(this.dbManager);
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🕵️  Initiating covert testing sequence...\n');

    try {
      // Initialize test database
      await this.setupTestDatabase();

      // Run test scenarios
      await this.testNewContactCreation();
      await this.testContactLinking();
      await this.testPrimaryContactMerging();
      await this.testEdgeCases();

      // Display results
      this.displayResults();

    } catch (error) {
      console.error('❌ Testing sequence compromised:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async setupTestDatabase() {
    this.dbManager.dbPath = ':memory:'; // Use in-memory database for testing
    await this.dbManager.initialize();
    console.log('✅ Test database initialized');
  }

  async testNewContactCreation() {
    console.log('🧪 Testing new contact creation...');

    try {
      const result = await this.contactService.identifyContact('doc@zamazon.com', '1234567890');
      
      this.assert(result.primaryContactId > 0, 'Primary contact ID should be generated');
      this.assert(result.emails.includes('doc@zamazon.com'), 'Email should be included');
      this.assert(result.phoneNumbers.includes('1234567890'), 'Phone should be included');
      this.assert(result.secondaryContactIds.length === 0, 'No secondary contacts initially');

      this.recordTest('New Contact Creation', true);
    } catch (error) {
      this.recordTest('New Contact Creation', false, error.message);
    }
  }

  async testContactLinking() {
    console.log('🧪 Testing contact linking...');

    try {
      // Create first contact
      const first = await this.contactService.identifyContact('doc1@zamazon.com', null);
      
      // Create second contact with same email but different phone
      const second = await this.contactService.identifyContact('doc1@zamazon.com', '9876543210');
      
      this.assert(first.primaryContactId === second.primaryContactId, 'Should link to same primary');
      this.assert(second.phoneNumbers.includes('9876543210'), 'New phone should be added');
      this.assert(second.secondaryContactIds.length > 0, 'Should have secondary contacts');

      this.recordTest('Contact Linking', true);
    } catch (error) {
      this.recordTest('Contact Linking', false, error.message);
    }
  }

  async testPrimaryContactMerging() {
    console.log('🧪 Testing primary contact merging...');

    try {
      // Create two separate primary contacts
      const first = await this.contactService.identifyContact('merge1@zamazon.com', null);
      const second = await this.contactService.identifyContact(null, '5555555555');
      
      // Link them with overlapping information
      const merged = await this.contactService.identifyContact('merge1@zamazon.com', '5555555555');
      
      this.assert(merged.emails.includes('merge1@zamazon.com'), 'Should include first email');
      this.assert(merged.phoneNumbers.includes('5555555555'), 'Should include second phone');
      this.assert(merged.secondaryContactIds.length > 0, 'Should have secondary contacts after merge');

      this.recordTest('Primary Contact Merging', true);
    } catch (error) {
      this.recordTest('Primary Contact Merging', false, error.message);
    }
  }

  async testEdgeCases() {
    console.log('🧪 Testing edge cases...');

    try {
      // Test with null values
      const nullTest = await this.contactService.identifyContact('edge@zamazon.com', null);
      this.assert(nullTest.phoneNumbers.length === 0, 'Should handle null phone');

      // Test with empty strings (should be treated as null)
      const emptyTest = await this.contactService.identifyContact('', '1111111111');
      this.assert(emptyTest.emails.length === 0, 'Should handle empty email');

      this.recordTest('Edge Cases', true);
    } catch (error) {
      this.recordTest('Edge Cases', false, error.message);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordTest(testName, passed, error = null) {
    this.testResults.push({
      name: testName,
      passed,
      error
    });

    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  displayResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(t => t.passed).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (passed === total) {
      console.log('\n🎉 All tests passed! Service ready for deployment.');
    } else {
      console.log('\n⚠️  Some tests failed. Review and fix before deployment.');
    }
  }

  async cleanup() {
    await this.dbManager.close();
    console.log('\n🧹 Test cleanup completed');
  }
}

// Run tests if this file is executed directly
const testSuite = new TestSuite();
testSuite.runAllTests();

export { TestSuite };