/**
 * Test data constants for Pretix E2E tests.
 *
 * These values should match a pre-seeded test environment.
 * Adjust ORGANIZER_SLUG, EVENT_SLUG, and credentials
 * to match your local pretix instance.
 */

export const TEST_ADMIN = {
  email: 'admin@localhost',
  password: 'admin',
};

export const TEST_USER = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
};

export const NEW_USER = {
  email: `e2e_${Date.now()}@example.com`,
  password: 'SecurePass456!',
};

export const ORGANIZER = {
  name: 'Test Organizer',
  slug: 'test-org',
};

export const EVENT = {
  name: 'Test Concert 2026',
  slug: 'test-concert',
  currency: 'EUR',
};

export const CHECKOUT_CONTACT = {
  email: 'buyer@example.com',
  phone: '+49123456789',
};

export const INVOICE_ADDRESS = {
  name: 'Max Mustermann',
  company: 'Test GmbH',
  street: 'Teststrasse 1',
  zipcode: '12345',
  city: 'Berlin',
  country: 'DE',
};

export const API_TOKEN = process.env.PRETIX_API_TOKEN || 'testtoken123';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
