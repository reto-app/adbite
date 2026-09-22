/* The page a shop owner lands on from the approval mail.
 *
 * Whoever reads this has not signed in and may never have seen the dashboard.
 * So nothing here assumes the product: no "queue", no "creative", no talk of
 * boards or dayparts. It is one question with two answers and a picture of
 * what is being asked.
 *
 * The three refusals are separate strings on purpose. "That link has expired",
 * "you already answered this" and "we do not recognise this link" are three
 * different facts about a person's own inbox, and collapsing them into one
 * polite shrug is how a shop owner ends up mailing support to find out which
 * it was. */

const en = {
  title: 'An ad is waiting on you.',
  lede: (shop: string) => `Somebody booked a spot on the screen at ${shop}. It does not run until you say so.`,
  ad: 'Ad',
  from: 'From',
  anAdvertiser: 'An advertiser',
  format: 'Format',
  pays: 'Pays you',
  paysValue: (money: string) => `about ${money} a week while it runs`,
  artwork: 'This is exactly how it would appear on your screen.',
  onFile: 'Artwork on file',
  approve: 'Yes, run it',
  reject: 'No thanks',
  deciding: 'One moment…',
  note: 'Either answer is fine, and you never have to explain one. The advertiser is told today.',

  approved: {
    title: 'That is approved.',
    text: (shop: string) => `It is on the screen at ${shop} within ten minutes and runs in the hours that were booked. You are paid for it monthly, by bank transfer.`,
  },
  rejected: {
    title: 'Turned down.',
    text: 'It never reaches your screen and nothing is charged to anyone. The advertiser is told, without a reason attached.',
  },

  /* Set beside every ending, because a person who got here from a mail has no
     other way in: they have never used a password on this site. */
  dashboard: 'Open your dashboard',
  dashboardNote: 'Everything else about your screen lives there. It signs you in by mail, the same way this link arrived.',

  gone: {
    unknown: {
      title: 'We do not recognise that link.',
      text: 'It may have been cut short by a mail client, which happens when a long link wraps across two lines. Try opening it from the original message, or sign in and the ad will be waiting in your queue.',
    },
    expired: {
      title: 'That link has expired.',
      text: (days: number) => `Links in an approval mail are good for ${days} days. The ad may still be waiting for you — sign in and it is in your queue.`,
    },
    decided: {
      title: 'That one is already answered.',
      text: 'Somebody has decided on this ad, either from this mail or from the dashboard. Nothing more is needed.',
    },
    offline: {
      title: 'We could not reach the booking.',
      text: 'Something on our side is not answering. Nothing has changed, and the link still works — try it again in a minute.',
    },
  },
};

const es: typeof en = {
  title: 'Un anuncio espera tu respuesta.',
  lede: (shop: string) => `Alguien reservó un espacio en la pantalla de ${shop}. No se emite hasta que lo autorices.`,
  ad: 'Anuncio',
  from: 'De',
  anAdvertiser: 'Un anunciante',
  format: 'Formato',
  pays: 'Te paga',
  paysValue: (money: string) => `unos ${money} por semana mientras se emita`,
  artwork: 'Así se vería exactamente en tu pantalla.',
  onFile: 'Arte archivado',
  approve: 'Sí, que se emita',
  reject: 'No, gracias',
  deciding: 'Un momento…',
  note: 'Cualquiera de las dos respuestas está bien, y nunca tienes que explicarla. Al anunciante se le avisa hoy mismo.',

  approved: {
    title: 'Aprobado.',
    text: (shop: string) => `Estará en la pantalla de ${shop} en diez minutos y se emitirá en las horas reservadas. Se te paga cada mes por transferencia bancaria.`,
  },
  rejected: {
    title: 'Rechazado.',
    text: 'No llega a tu pantalla y no se le cobra nada a nadie. Al anunciante se le avisa, sin explicaciones.',
  },

  dashboard: 'Abre tu panel',
  dashboardNote: 'Todo lo demás sobre tu pantalla vive ahí. Se entra por correo, igual que llegó este enlace.',

  gone: {
    unknown: {
      title: 'No reconocemos ese enlace.',
      text: 'Puede que tu cliente de correo lo haya cortado, algo que pasa cuando un enlace largo se parte en dos líneas. Ábrelo desde el mensaje original, o entra a tu panel y el anuncio estará esperándote.',
    },
    expired: {
      title: 'Ese enlace ha caducado.',
      text: (days: number) => `Los enlaces de un correo de aprobación duran ${days} días. Puede que el anuncio siga esperándote: entra a tu panel y lo verás.`,
    },
    decided: {
      title: 'Ese ya está respondido.',
      text: 'Alguien ya decidió sobre este anuncio, desde este correo o desde el panel. No hace falta nada más.',
    },
    offline: {
      title: 'No pudimos acceder a la reserva.',
      text: 'Algo de nuestro lado no responde. Nada ha cambiado y el enlace sigue sirviendo: inténtalo de nuevo en un minuto.',
    },
  },
};

export const REVIEW = { en, es };
