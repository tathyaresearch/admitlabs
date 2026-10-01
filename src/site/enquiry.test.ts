import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ENQUIRY_RULES } from '../config/site.ts';
import { hasDashes } from '../domain/copy.ts';
import { ENQUIRY_ROLE_LABELS, ENQUIRY_ROLES, formatPhone, normalisePhone, parseEnquiry } from './enquiry.ts';

// The "Work with us" form: what passes, what is turned back, and in plain words.

const GOOD = {
  name: '  Asha   Rao ',
  institution: 'Eastgate University',
  role: 'admissions',
  email: ' Asha.Rao@Eastgate.example ',
  phone: '+91 98765 43210',
  program: 'BBA',
  message: '  We want more BBA applications.\nCan we talk?  ',
};

describe('the Work with us form', () => {
  test('the role choices are the ones the user chose', () => {
    assert.deepEqual(
      ENQUIRY_ROLES.map((role) => ENQUIRY_ROLE_LABELS[role]),
      ['Founder or director', 'Principal or dean', 'Admissions', 'Marketing', 'Other'],
    );
  });

  test('a good answer is tidied: spaces, email case and the phone number', () => {
    const parsed = parseEnquiry(GOOD);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.enquiry, {
      name: 'Asha Rao',
      institution: 'Eastgate University',
      role: 'admissions',
      email: 'asha.rao@eastgate.example',
      phone: '+919876543210',
      program: 'BBA',
      message: 'We want more BBA applications.\nCan we talk?',
    });
  });

  test('program and message are optional', () => {
    const parsed = parseEnquiry({ ...GOOD, program: '  ', message: '' });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.enquiry.program, null);
      assert.equal(parsed.enquiry.message, null);
    }
  });

  test('every required field says what is missing', () => {
    const parsed = parseEnquiry({});
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.deepEqual(Object.keys(parsed.errors).sort(), ['email', 'institution', 'name', 'phone', 'role']);
    for (const message of Object.values(parsed.errors)) assert.equal(hasDashes(message ?? ''), false, message);
  });

  test('a role not on the list is turned back', () => {
    const parsed = parseEnquiry({ ...GOOD, role: 'owner' });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.errors.role, 'Please choose your role.');
  });

  test('emails and phone numbers that cannot be real are turned back', () => {
    for (const email of ['asha', 'asha@', 'asha@eastgate', 'a b@c.in']) {
      const parsed = parseEnquiry({ ...GOOD, email });
      assert.equal(parsed.ok, false, email);
    }
    for (const phone of ['12345', 'call me', '+91 98765 43210 99999 1']) {
      const parsed = parseEnquiry({ ...GOOD, phone });
      assert.equal(parsed.ok, false, phone);
    }
    assert.equal(normalisePhone('098765-43210'), '09876543210');
    assert.equal(normalisePhone('(+91) 98765.43210'), '+919876543210');
    assert.equal(normalisePhone('98765'), null);
  });

  test('a stored number reads easily in the team list', () => {
    assert.equal(formatPhone('+919876543210'), '+91 98765 43210');
    assert.equal(formatPhone('9876543210'), '98765 43210');
    assert.equal(formatPhone('09876543210'), '098765 43210');
    assert.equal(formatPhone('+447700900123'), '+447700900123');
  });

  test('long answers are turned back at the same limits the database keeps', () => {
    const long = (length: number) => 'a'.repeat(length);
    const tooLong = parseEnquiry({ ...GOOD, name: long(ENQUIRY_RULES.nameMax + 1), institution: long(ENQUIRY_RULES.institutionMax + 1), program: long(ENQUIRY_RULES.programMax + 1), message: long(ENQUIRY_RULES.messageMax + 1) });
    assert.equal(tooLong.ok, false);
    if (!tooLong.ok) assert.deepEqual(Object.keys(tooLong.errors).sort(), ['institution', 'message', 'name', 'program']);
    assert.equal(parseEnquiry({ ...GOOD, message: long(ENQUIRY_RULES.messageMax) }).ok, true);
  });
});
