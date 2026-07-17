import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContactInquiry } from './contactInquiry.js';

const valid = {
  name: 'Asha Mehta',
  email: 'ASHA@example.com',
  mobile: '+91 98765 43210',
  message: 'Please contact us about enterprise carbon accounting.',
  consent: true,
  website: '',
};

test('contact enquiry accepts and normalizes valid input', () => {
  const result = validateContactInquiry(valid);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.email, 'asha@example.com');
});

test('contact enquiry rejects malformed email and phone values', () => {
  assert.equal(validateContactInquiry({ ...valid, email: 'not-an-email' }).ok, false);
  assert.equal(validateContactInquiry({ ...valid, mobile: 'abc' }).ok, false);
});

test('contact enquiry requires consent and a meaningful message', () => {
  assert.equal(validateContactInquiry({ ...valid, consent: false }).ok, false);
  assert.equal(validateContactInquiry({ ...valid, message: 'Hello' }).ok, false);
});

test('contact enquiry preserves the bot-trap value for route handling', () => {
  const result = validateContactInquiry({ ...valid, website: 'https://spam.example' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.website, 'https://spam.example');
});
