/* Render every mail to out/email/*.html so they can be eyeballed, and print
   the Supabase Auth template payload to stdout when asked.

     npx tsx scripts/email-preview.ts            # previews
     npx tsx scripts/email-preview.ts --auth     # JSON for the auth config */

import { mkdirSync, writeFileSync } from 'node:fs';
import { html, text } from '../lib/email/layout';
import { BANK } from '../lib/server/bank';
import {
  approvalNeeded,
  bookingReceived,
  campaignDecided,
  invoiceIssued,
  paymentReceived,
  remittanceSent,
  signInLink,
} from '../lib/email/templates';

const AUTH_LINK = '{{ .ConfirmationURL }}';

if (process.argv.includes('--auth')) {
  const mail = signInLink();
  process.stdout.write(
    JSON.stringify({
      mailer_subjects_magic_link: mail.subject,
      mailer_templates_magic_link_content: html(mail, { buttonHref: AUTH_LINK }),
      mailer_subjects_confirmation: mail.subject,
      mailer_templates_confirmation_content: html(mail, { buttonHref: AUTH_LINK }),
    }),
  );
} else {
  mkdirSync('out/email', { recursive: true });
  const samples = {
    'sign-in': signInLink(),
    'booking-received': bookingReceived({
      campaignName: 'Permanent spot · Sep 16',
      format: 'Side rail',
      venues: ['Bao Pao Wow'],
      dayparts: ['Lunch', 'Evening'],
      weeklySpend: 120,
      minutes: 510,
    }),
    /* A business name, not an address. The fixture used to be a Gmail, which
       is how a preview stops warning you about the thing it is there to show. */
    'approval-needed': approvalNeeded({
      shopName: 'Bao Pao Wow',
      campaignName: 'Iron Rose Gym · January intake',
      advertiser: 'Iron Rose Gym',
      format: 'Side rail',
      weeklyEarnings: 78,
      review: {
        approve: 'https://adbite.site/review?t=preview&approve=1',
        open: 'https://adbite.site/review?t=preview',
      },
    }),
    'approved': campaignDecided({ campaignName: 'Permanent spot · Sep 16', shopName: 'Bao Pao Wow', approved: true }),
    'rejected': campaignDecided({ campaignName: 'Permanent spot · Sep 16', shopName: 'Bao Pao Wow', approved: false }),
    /* The bank details are read from the environment, so a preview run without
       them shows the empty rows -- which is the point: it is how you notice. */
    'invoice': invoiceIssued({
      number: 'AB-2026-0001',
      amount: '$412.40',
      dueOn: '2026-10-01',
      lines: [['Iron Rose Gym · January intake', '$282.40'], ['Mia’s Flower Bar · weekend stems', '$130.00']],
      bank: BANK,
      note: 'Video shown between 2026-09-08 and 2026-09-15.',
    }),
    'receipt': paymentReceived({ number: 'AB-2026-0001', amount: '$412.40', paidOn: '2026-09-29' }),
    'remittance': remittanceSent({ number: 'AB-2026-0002', shopName: 'Bao Pao Wow', amount: '$268.06', last4: '4417' }),
  };
  for (const [name, mail] of Object.entries(samples)) {
    writeFileSync(`out/email/${name}.html`, html(mail));
    writeFileSync(`out/email/${name}.txt`, text(mail));
  }
  console.log(`wrote ${Object.keys(samples).length} previews to out/email/`);
}
