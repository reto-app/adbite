/* Render every mail to out/email/*.html so they can be eyeballed, and print
   the Supabase Auth template payload to stdout when asked.

     npx tsx scripts/email-preview.ts            # previews
     npx tsx scripts/email-preview.ts --auth     # JSON for the auth config */

import { mkdirSync, writeFileSync } from 'node:fs';
import { html, text } from '../lib/email/layout';
import { approvalNeeded, bookingReceived, campaignDecided, signInLink } from '../lib/email/templates';

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
      campaignName: 'Side rail · Sep 16',
      format: 'Side rail',
      venues: ['Bao Pao Wow'],
      dayparts: ['Lunch', 'Evening'],
      weeklySpend: 120,
      minutes: 510,
    }),
    'approval-needed': approvalNeeded({ shopName: 'Bao Pao Wow', advertiser: 'sam@ironrosegym.com', format: 'Side rail', weeklyEarnings: 78 }),
    'approved': campaignDecided({ campaignName: 'Side rail · Sep 16', shopName: 'Bao Pao Wow', approved: true }),
    'rejected': campaignDecided({ campaignName: 'Side rail · Sep 16', shopName: 'Bao Pao Wow', approved: false }),
  };
  for (const [name, mail] of Object.entries(samples)) {
    writeFileSync(`out/email/${name}.html`, html(mail));
    writeFileSync(`out/email/${name}.txt`, text(mail));
  }
  console.log(`wrote ${Object.keys(samples).length} previews to out/email/`);
}
