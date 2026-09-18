/* The questions both sides answer on the way in.
 *
 * Its own file rather than a block in shared.ts, because the form is asking a
 * person for their address before they have got anything out of us and the
 * wording has to carry why. Every label says what the answer is for. */

const en = {
  shop: {
    eyebrow: 'One more thing',
    title: 'Tell us about your shop.',
    lede: 'This is what an advertiser sees before they book your board, and what we put on the note that comes with your money. It takes a minute and you only do it once.',
  },
  advertiser: {
    eyebrow: 'One more thing',
    title: 'Tell us about your business.',
    lede: 'Your invoice is addressed to this, and the shop deciding whether to run your ad sees the name and the website rather than an email address. It takes a minute and you only do it once.',
  },
  business: {
    legend: 'The business',
    name: 'Business name',
    namePlaceholder: 'Bao Pao Wow LLC',
    nameHint: 'As it should appear on an invoice',
    contact: 'Who should we ask for',
    contactPlaceholder: 'Sam Ortega',
    website: 'Website',
    websitePlaceholder: 'baopaowow.com',
    websiteOptional: 'Optional',
    phone: 'Phone',
    phonePlaceholder: '801 555 0142',
    phoneOptional: 'Optional',
  },
  where: {
    legend: 'Where you are',
    line1: 'Street address',
    line1Placeholder: '660 N Freedom Blvd',
    line2: 'Unit, suite or floor',
    line2Optional: 'Optional',
    city: 'City',
    cityPlaceholder: 'Provo',
    region: 'State',
    regionPlaceholder: 'UT',
    postal: 'ZIP',
    postalPlaceholder: '84601',
  },
  screen: {
    legend: 'The screen',
    kind: 'What kind of shop is it',
    kindPlaceholder: 'Filipino steamed buns',
    kindHint: 'In your own words. Advertisers read this next to your board',
    screens: 'How many screens',
    daysOpen: 'Days a week you are open',
  },
  submit: 'Save and open my dashboard',
  saving: 'Saving…',
  problems: 'A couple of things are missing:',
  /* Said on the way in, so nobody discovers it a week later from an empty
     queue. */
  notPlaced:
    'Your board is not on the advertiser network yet. We place boards by hand while the pilot is small, so nothing can be booked onto your screen until we have spoken. Everything else works now: build your board, upload your own media, and put it on the TV.',
};

const es: typeof en = {
  shop: {
    eyebrow: 'Una cosa más',
    title: 'Cuéntanos de tu negocio.',
    lede: 'Esto es lo que ve un anunciante antes de reservar tu tablero, y lo que ponemos en la nota que acompaña tu dinero. Toma un minuto y solo se hace una vez.',
  },
  advertiser: {
    eyebrow: 'Una cosa más',
    title: 'Cuéntanos de tu negocio.',
    lede: 'Tu factura va dirigida a esto, y el negocio que decide si muestra tu anuncio ve el nombre y el sitio web en vez de un correo. Toma un minuto y solo se hace una vez.',
  },
  business: {
    legend: 'El negocio',
    name: 'Nombre del negocio',
    namePlaceholder: 'Bao Pao Wow LLC',
    nameHint: 'Como debe aparecer en una factura',
    contact: 'Por quién preguntamos',
    contactPlaceholder: 'Sam Ortega',
    website: 'Sitio web',
    websitePlaceholder: 'baopaowow.com',
    websiteOptional: 'Opcional',
    phone: 'Teléfono',
    phonePlaceholder: '801 555 0142',
    phoneOptional: 'Opcional',
  },
  where: {
    legend: 'Dónde estás',
    line1: 'Dirección',
    line1Placeholder: '660 N Freedom Blvd',
    line2: 'Unidad, suite o piso',
    line2Optional: 'Opcional',
    city: 'Ciudad',
    cityPlaceholder: 'Provo',
    region: 'Estado',
    regionPlaceholder: 'UT',
    postal: 'Código postal',
    postalPlaceholder: '84601',
  },
  screen: {
    legend: 'La pantalla',
    kind: 'Qué tipo de negocio es',
    kindPlaceholder: 'Panes al vapor filipinos',
    kindHint: 'En tus propias palabras. Los anunciantes lo leen junto a tu tablero',
    screens: 'Cuántas pantallas',
    daysOpen: 'Días a la semana que abres',
  },
  submit: 'Guardar y abrir mi panel',
  saving: 'Guardando…',
  problems: 'Faltan un par de cosas:',
  notPlaced:
    'Tu tablero todavía no está en la red de anunciantes. Colocamos los tableros a mano mientras el piloto es pequeño, así que nadie puede reservar tu pantalla hasta que hablemos. Todo lo demás ya funciona: arma tu tablero, sube tu propio contenido y ponlo en la TV.',
};

export const ONBOARDING = { en, es };
