const emailService = require('../services/emailService');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn((options) => 
      Promise.resolve({ messageId: 'test-message-id', accepted: [options.to] })
    )
  }))
}));

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(() => 
    Promise.resolve([{ statusCode: 202, headers: {} }])
  )
}));

describe('EmailService', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  describe('send()', () => {
    test('should send email with required fields', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      const result = await emailService.send(emailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    test('should handle missing recipient', async () => {
      const result = await emailService.send({
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('sendTemplate()', () => {
    test('should send welcome email template', async () => {
      const result = await emailService.sendTemplate('welcome', {
        to: 'newuser@example.com',
        name: 'John Doe',
        loginUrl: 'https://example.com/login',
        username: 'john@example.com'
      });

      expect(result.success).toBe(true);
    });

    test('should send lead assigned template', async () => {
      const result = await emailService.sendTemplate('leadAssigned', {
        to: 'agent@example.com',
        agentName: 'Jane Smith',
        leadName: 'ABC Corp',
        leadUrl: 'https://example.com/leads/123'
      });

      expect(result.success).toBe(true);
    });

    test('should send lead status change template', async () => {
      const result = await emailService.sendTemplate('leadStatusChange', {
        to: 'manager@example.com',
        leadName: 'ABC Corp',
        oldStatus: 'New',
        newStatus: 'Qualified',
        leadUrl: 'https://example.com/leads/123'
      });

      expect(result.success).toBe(true);
    });

    test('should send password reset template', async () => {
      const result = await emailService.sendTemplate('passwordReset', {
        to: 'user@example.com',
        name: 'John Doe',
        resetUrl: 'https://example.com/reset?token=abc123'
      });

      expect(result.success).toBe(true);
    });

    test('should send daily report template', async () => {
      const result = await emailService.sendTemplate('dailyReport', {
        to: 'manager@example.com',
        userName: 'Jane Smith',
        date: '2024-01-15',
        newLeads: 5,
        convertedLeads: 2,
        totalRevenue: 50000,
        reportUrl: 'https://example.com/reports'
      });

      expect(result.success).toBe(true);
    });

    test('should handle invalid template', async () => {
      const result = await emailService.sendTemplate('invalidTemplate', {
        to: 'user@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown template');
    });
  });

  describe('sendBulk()', () => {
    test('should send multiple emails', async () => {
      const emails = [
        { to: 'user1@example.com', subject: 'Test 1', html: '<p>Test 1</p>' },
        { to: 'user2@example.com', subject: 'Test 2', html: '<p>Test 2</p>' }
      ];

      const results = await emailService.sendBulk(emails);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    test('should handle partial failures in bulk send', async () => {
      const emails = [
        { to: 'user1@example.com', subject: 'Test 1', html: '<p>Test 1</p>' },
        { subject: 'Test 2', html: '<p>Test 2</p>' } // Missing recipient
      ];

      const results = await emailService.sendBulk(emails);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});
