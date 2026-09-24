/* The page a printed QR code opens: one shop, one screen, three steps.
 *
 * Whoever reads this was standing somewhere else a minute ago looking at an
 * ad, and is on a phone. So it names the shop they can picture and asks for one
 * thing: an email. Everything else happens in the builder, which opens already
 * pointed at this shop.
 *
 * The price is behind `priceShow` rather than on the card. Leading with a
 * figure invites the one question this page cannot answer -- "is that worth
 * it?" -- before it has shown them their ad on the shop's actual screen,
 * which is the part that answers it. Anyone who wants the number first is one
 * tap away from it, and it is the same number either way. */

const en = {
  title: (shop: string) => `Put your business on the screen at ${shop}.`,
  lede: 'Your ad runs on the screen at the counter all day, every day they are open, in front of everyone waiting on an order. Set it up from your phone in a few minutes.',
  where: 'Where',
  open: 'Open',
  price: 'Your spot',
  priceShow: 'What does it cost?',
  home: 'Home',
  priceValue: (quarter: string, year: string) => `${quarter} for 3 months, or ${year} for a year`,
  steps: [
    {
      title: 'Make your account',
      text: 'Type your email and tap the link we send. No password.',
    },
    {
      title: 'Upload your ad',
      text: 'A picture or a short video. You see it on their actual screen before you buy.',
    },
    {
      title: 'Book and pay',
      text: 'The shop approves it, you get an invoice, and it is on the screen within ten minutes.',
    },
  ],
  email: 'Your email',
  emailPlaceholder: 'you@yourbusiness.com',
  send: 'Get started',
  sending: 'Sending…',
  signedIn: (email: string) => `You are signed in as ${email}.`,
  continue: 'Continue to your ad',
  sent: {
    title: 'Check your email.',
    text: (email: string) => `We sent a link to ${email}. Tap it and you land on the upload step for this screen, signed in.`,
    again: 'Use a different email',
  },
  trouble: 'Questions? Write to',
};

const es: typeof en = {
  title: (shop: string) => `Pon tu negocio en la pantalla de ${shop}.`,
  lede: 'Tu anuncio sale en la pantalla del mostrador todo el día, cada día que abren, frente a todos los que esperan su orden. Lo preparas desde tu teléfono en unos minutos.',
  where: 'Dónde',
  open: 'Horario',
  price: 'Tu espacio',
  priceShow: '¿Cuánto cuesta?',
  home: 'Inicio',
  priceValue: (quarter: string, year: string) => `${quarter} por 3 meses, o ${year} por un año`,
  steps: [
    {
      title: 'Crea tu cuenta',
      text: 'Escribe tu correo y toca el enlace que te mandamos. Sin contraseña.',
    },
    {
      title: 'Sube tu anuncio',
      text: 'Una imagen o un video corto. Lo ves en su pantalla real antes de comprar.',
    },
    {
      title: 'Reserva y paga',
      text: 'El negocio lo aprueba, te llega la factura y sale en la pantalla en menos de diez minutos.',
    },
  ],
  email: 'Tu correo',
  emailPlaceholder: 'tu@tunegocio.com',
  send: 'Empezar',
  sending: 'Enviando…',
  signedIn: (email: string) => `Iniciaste sesión como ${email}.`,
  continue: 'Seguir con tu anuncio',
  sent: {
    title: 'Revisa tu correo.',
    text: (email: string) => `Enviamos un enlace a ${email}. Tócalo y llegas al paso de subir tu anuncio para esta pantalla, con la sesión iniciada.`,
    again: 'Usar otro correo',
  },
  trouble: '¿Preguntas? Escribe a',
};

export const BOOK = { en, es };
