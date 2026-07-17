import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { validateContactInquiry } from '../contactInquiry.js';
import { supabaseAdmin } from '../supabaseClients.js';

export function createContactRouter() {
  const router = Router();

  router.post('/public/contact', async (req, res) => {
    const validation = validateContactInquiry(req.body);
    if (validation.ok === false) return res.status(400).json({ error: validation.error });

    const inquiry = validation.value;
    if (inquiry.website) {
      return res.status(202).json({ success: true });
    }

    const id = `contact-${randomUUID()}`;
    const { error } = await supabaseAdmin.from('contact_inquiries').insert({
      id,
      name: inquiry.name,
      email: inquiry.email,
      mobile: inquiry.mobile,
      message: inquiry.message,
      consent: inquiry.consent,
      source: 'website',
      status: 'new',
    });

    if (error) {
      console.error(JSON.stringify({ level: 'error', event: 'contact_inquiry_failed', message: error.message }));
      return res.status(503).json({ error: 'We could not record your enquiry. Please try again shortly.' });
    }

    return res.status(201).json({ success: true, referenceId: id });
  });

  return router;
}
