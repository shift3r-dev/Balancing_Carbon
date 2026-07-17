export interface ContactInquiryInput {
  name: string;
  email: string;
  mobile: string;
  message: string;
  consent: boolean;
  website: string;
}

export type ContactInquiryValidation =
  | { ok: true; value: ContactInquiryInput }
  | { ok: false; error: string };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^\+?[0-9][0-9 ()-]{6,23}$/;

export function validateContactInquiry(body: unknown): ContactInquiryValidation {
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const value: ContactInquiryInput = {
    name: text(input.name),
    email: text(input.email).toLowerCase(),
    mobile: text(input.mobile),
    message: text(input.message),
    consent: input.consent === true,
    website: text(input.website),
  };

  if (value.name.length < 2 || value.name.length > 120) {
    return { ok: false, error: 'Enter a name between 2 and 120 characters.' };
  }
  if (value.email.length > 254 || !emailPattern.test(value.email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (!mobilePattern.test(value.mobile)) {
    return { ok: false, error: 'Enter a valid mobile number.' };
  }
  if (value.message.length < 10 || value.message.length > 3000) {
    return { ok: false, error: 'Enter a message between 10 and 3000 characters.' };
  }
  if (!value.consent) {
    return { ok: false, error: 'Consent is required before sending the enquiry.' };
  }

  return { ok: true, value };
}
