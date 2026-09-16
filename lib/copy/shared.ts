/* Copy that more than one page reads: the header and footer, the generic form
 * lines, and the names of the things the data files define by id.
 *
 * The data files (lib/boards.ts, lib/pricing.ts, lib/board.ts, lib/network.ts)
 * keep their English labels, because pricing, the TV channel and the mail
 * templates all read them and none of those has a language. The page reads
 * the id off the data and the words from here.
 *
 * Spanish is neutral Latin American, on "tú": the English is warm and direct
 * and "usted" would make the same sentences stiff. A shop is a "negocio",
 * a board is a "tablero", and an ad is an "anuncio" throughout. */

const en = {
  nav: {
    forShops: 'For shops',
    forAdvertisers: 'For advertisers',
    faq: 'FAQ',
    about: 'About',
    contact: 'Contact',
    howItWorks: 'How it works',
    earnings: 'Earnings',
    menuTools: 'Menu tools',
    rates: 'Rates',
    reporting: 'Reporting',
  },
  header: {
    home: 'AdBite home',
    joinWaitlist: 'Join the waitlist',
    buildCampaign: 'Build a campaign',
    imAnAdvertiser: 'I’m an advertiser',
    imAShopOwner: 'I’m a shop owner',
    getOnABoard: 'Get on a board',
  },
  footer: {
    tagline: 'Local ads on screens people already watch.',
    privacy: 'Privacy',
    terms: 'Pilot terms',
    stage: 'Pilot stage. Screen shots on this page are concept mockups.',
  },
  side: {
    switchTitle: 'Switch which workspace opens. Nothing on either side is lost.',
    iRunAShop: 'I run a shop',
    iAdvertise: 'I advertise',
    signedInAs: (email: string) => `Signed in as ${email}`,
    signOut: 'Sign out',
  },
  form: {
    sending: 'Sending…',
    emailUsInstead: 'Email us instead',
    emailSupportInstead: 'Email support instead',
  },
  door: {
    checkMail: 'Check your mail.',
    sentTo: (email: string) => `We sent a sign-in link to ${email}. Open it on this device and you land back here, signed in. The link is good for an hour.`,
    title: 'Sign in to your dashboard',
    lede: 'Type the email you use for your business and we will send a link. No password to make up or forget.',
    email: 'Email',
    emailPlaceholder: 'you@yourbusiness.com',
    send: 'Send me a sign-in link',
    trouble: 'Trouble getting in? Write to',
  },
  choose: {
    title: 'Which side of the board are you on?',
    lede: (email: string) => `This picks which workspace opens for ${email}. You can swap it whenever you like; nothing you make on either side is lost.`,
  },
  accounts: {
    advertiser: {
      label: 'I want to advertise',
      blurb:
        'Buy minutes on the boards near your customers. Price a week, drop in your artwork, and see what it did once it ran.',
      action: 'Open the campaign builder',
    },
    shop: {
      label: 'I run a shop',
      blurb:
        'Design the board your customers read, decide where on it ads may sit, approve every one of them, and see what the screen pays you.',
      action: 'Open your board',
    },
  },
  formats: {
    banner: {
      name: 'Bottom banner',
      blurb: 'A strip under the shop’s menu. Their board stays readable the whole time.',
      spec: '1920 × 240 · still image',
    },
    rail: {
      name: 'Side rail',
      blurb: 'The right third of a wide board, top to bottom, beside the menu.',
      spec: '720 × 1080 · still image',
    },
    full: {
      name: 'Full screen',
      blurb: 'The whole screen for one turn of the rotation, then the menu returns.',
      spec: '1920 × 1080 · still image',
    },
    video: {
      name: 'Short video',
      blurb: 'Up to fifteen seconds of motion, muted, in the full-screen slot.',
      spec: '1920 × 1080 · up to 0:15',
    },
  },
  dayparts: {
    lunch: { label: 'Lunch', window: '11am-2pm' },
    afternoon: { label: 'Afternoon', window: '2pm-5pm' },
    evening: { label: 'Evening', window: '5pm-9pm' },
  },
  tier: { peak: 'Peak', off: 'Off-peak' },
  unit: { minute: 'minute', minutes: 'minutes', play: 'play', plays: 'plays' },
  placements: {
    none: {
      label: 'Nowhere this week',
      short: 'Nowhere',
      note: 'The whole screen stays yours. Nothing is booked, and nothing is paid.',
    },
    banner: {
      label: 'A strip along the bottom',
      short: 'Bottom strip',
      note: 'A band under your menu. Everything you wrote stays readable.',
    },
    rail: {
      label: 'A rail down the right',
      short: 'Right rail',
      note: 'The right third, top to bottom. Your menu keeps the rest of the board.',
    },
    rotation: {
      label: 'Between your boards',
      short: 'Between boards',
      note: 'The full screen for one turn of the rotation, then your menu is back.',
    },
  },
  slots: {
    morning: { label: 'Breakfast', window: 'Open until 11am' },
    midday: { label: 'Lunch', window: '11am until 4pm' },
    evening: { label: 'Evening', window: '4pm until close' },
  },
  themes: {
    chalk: { label: 'Chalk', note: 'White on near-black. Reads from across the room' },
    enamel: { label: 'Enamel', note: 'Cream and brass, like a painted sign' },
    warm: { label: 'Warm', note: 'Terracotta and ink, for a room with wood in it' },
    garden: { label: 'Garden', note: 'Deep green and gold, quieter and a little formal' },
  },
  badges: { none: 'No tag', new: 'New', popular: 'Popular', out: 'Sold out' },
  groups: {
    food: { label: 'Restaurants', blurb: 'Counter menu boards, lunch and dinner queues' },
    coffee: { label: 'Cafés & bakeries', blurb: 'Mornings, laptops, long dwell' },
    grooming: { label: 'Barbers & salons', blurb: 'Waiting chairs, twenty minutes a head' },
    fitness: { label: 'Gyms & studios', blurb: 'Lobby screens, members most days' },
    retail: { label: 'Shops & services', blurb: 'Tills, counters, walk-in trade' },
  },
  areas: {
    downtown: { label: 'Downtown Provo', blurb: 'Center Street and the blocks either side' },
    campus: { label: 'BYU campus', blurb: 'Freedom Blvd up to the north gate' },
    eastbay: { label: 'East Bay', blurb: 'The industrial and big-box strip south of centre' },
    riverwoods: { label: 'Riverwoods', blurb: 'The Orem end of University Parkway' },
    northorem: { label: 'North Orem', blurb: 'State Street between 800 and 1600 North' },
  },
  status: {
    live: 'Live',
    inConversation: 'In conversation',
    waitlist: 'Waitlist',
  },
  board: {
    yourShop: 'Your shop',
    nothingYet: 'Nothing on this board yet.',
    adSpace: 'Ad space',
    fullTurn: 'Ads take a full turn between your boards',
    clipInRotation: 'Your clip is in the rotation',
    clipTitle: 'Your own clip plays between boards',
    starsOutOf: (n: number) => `${n} out of 5`,
  },
  reel: {
    expand: (name: string) => `Expand the ${name} board`,
    boardOf: (name: string) => `${name} board`,
    close: 'Close',
    rosas: 'The ad runs as a strip along the bottom. The whole menu stays above it.',
    roost: 'Ads take the right third of the board. Chicken mains and sides keep the rest.',
    forno: 'Two screens on one wall. Only the right one breaks for a short local spot.',
    meridian: 'A tall board behind the counter, with the ad slot at the foot.',
  },
};

const es: typeof en = {
  nav: {
    forShops: 'Para negocios',
    forAdvertisers: 'Para anunciantes',
    faq: 'Preguntas',
    about: 'Nosotros',
    contact: 'Contacto',
    howItWorks: 'Cómo funciona',
    earnings: 'Ganancias',
    menuTools: 'Tu menú',
    rates: 'Tarifas',
    reporting: 'Reportes',
  },
  header: {
    home: 'Inicio de AdBite',
    joinWaitlist: 'Únete a la lista',
    buildCampaign: 'Crea una campaña',
    imAnAdvertiser: 'Soy anunciante',
    imAShopOwner: 'Tengo un negocio',
    getOnABoard: 'Anúnciate en un tablero',
  },
  footer: {
    tagline: 'Anuncios locales en pantallas que la gente ya está mirando.',
    privacy: 'Privacidad',
    terms: 'Términos del piloto',
    stage: 'Programa piloto. Las capturas de pantalla son maquetas conceptuales.',
  },
  side: {
    switchTitle: 'Cambia qué espacio de trabajo se abre. No se pierde nada de ningún lado.',
    iRunAShop: 'Tengo un negocio',
    iAdvertise: 'Quiero anunciarme',
    signedInAs: (email: string) => `Sesión iniciada como ${email}`,
    signOut: 'Cerrar sesión',
  },
  form: {
    sending: 'Enviando…',
    emailUsInstead: 'Escríbenos por correo',
    emailSupportInstead: 'Escribe a soporte',
  },
  door: {
    checkMail: 'Revisa tu correo.',
    sentTo: (email: string) => `Enviamos un enlace de acceso a ${email}. Ábrelo en este dispositivo y vuelves aquí con la sesión iniciada. El enlace dura una hora.`,
    title: 'Inicia sesión en tu panel',
    lede: 'Escribe el correo que usas para tu negocio y te mandamos un enlace. Sin contraseñas que inventar ni olvidar.',
    email: 'Correo',
    emailPlaceholder: 'tu@tunegocio.com',
    send: 'Envíame un enlace de acceso',
    trouble: '¿Problemas para entrar? Escribe a',
  },
  choose: {
    title: '¿De qué lado del tablero estás?',
    lede: (email: string) => `Esto elige qué espacio de trabajo se abre para ${email}. Puedes cambiarlo cuando quieras; nada de lo que hagas de ningún lado se pierde.`,
  },
  accounts: {
    advertiser: {
      label: 'Quiero anunciarme',
      blurb:
        'Compra minutos en los tableros cerca de tus clientes. Calcula una semana, sube tu anuncio y mira qué resultado dio.',
      action: 'Abrir el creador de campañas',
    },
    shop: {
      label: 'Tengo un negocio',
      blurb:
        'Diseña el tablero que tus clientes leen, decide dónde van los anuncios, aprueba cada uno y mira cuánto te paga la pantalla.',
      action: 'Abrir tu tablero',
    },
  },
  formats: {
    banner: {
      name: 'Franja inferior',
      blurb: 'Una franja debajo del menú del negocio. Su tablero sigue legible todo el tiempo.',
      spec: '1920 × 240 · imagen fija',
    },
    rail: {
      name: 'Columna lateral',
      blurb: 'El tercio derecho de un tablero ancho, de arriba abajo, junto al menú.',
      spec: '720 × 1080 · imagen fija',
    },
    full: {
      name: 'Pantalla completa',
      blurb: 'Toda la pantalla por un turno de la rotación, y luego vuelve el menú.',
      spec: '1920 × 1080 · imagen fija',
    },
    video: {
      name: 'Video corto',
      blurb: 'Hasta quince segundos de video, sin sonido, en el espacio de pantalla completa.',
      spec: '1920 × 1080 · hasta 0:15',
    },
  },
  dayparts: {
    lunch: { label: 'Almuerzo', window: '11am-2pm' },
    afternoon: { label: 'Tarde', window: '2pm-5pm' },
    evening: { label: 'Noche', window: '5pm-9pm' },
  },
  tier: { peak: 'Hora pico', off: 'Hora baja' },
  unit: { minute: 'minuto', minutes: 'minutos', play: 'reproducción', plays: 'reproducciones' },
  placements: {
    none: {
      label: 'En ningún lado esta semana',
      short: 'Ningún lado',
      note: 'Toda la pantalla es tuya. No se reserva nada y no se paga nada.',
    },
    banner: {
      label: 'Una franja abajo',
      short: 'Franja inferior',
      note: 'Una banda debajo de tu menú. Todo lo que escribiste sigue legible.',
    },
    rail: {
      label: 'Una columna a la derecha',
      short: 'Columna derecha',
      note: 'El tercio derecho, de arriba abajo. Tu menú se queda con el resto del tablero.',
    },
    rotation: {
      label: 'Entre tus tableros',
      short: 'Entre tableros',
      note: 'La pantalla completa por un turno de la rotación, y luego vuelve tu menú.',
    },
  },
  slots: {
    morning: { label: 'Desayuno', window: 'Hasta las 11am' },
    midday: { label: 'Almuerzo', window: 'De 11am a 4pm' },
    evening: { label: 'Noche', window: 'De 4pm al cierre' },
  },
  themes: {
    chalk: { label: 'Tiza', note: 'Blanco sobre casi negro. Se lee desde el otro lado del local' },
    enamel: { label: 'Esmalte', note: 'Crema y latón, como un letrero pintado' },
    warm: { label: 'Cálido', note: 'Terracota y tinta, para un local con madera' },
    garden: { label: 'Jardín', note: 'Verde profundo y dorado, más sobrio y un poco formal' },
  },
  badges: { none: 'Ninguna', new: 'Nuevo', popular: 'Popular', out: 'Agotado' },
  groups: {
    food: { label: 'Restaurantes', blurb: 'Tableros de menú en el mostrador, filas al almuerzo y la cena' },
    coffee: { label: 'Cafés y panaderías', blurb: 'Mañanas, laptops, gente que se queda' },
    grooming: { label: 'Barberías y salones', blurb: 'Sillas de espera, veinte minutos por persona' },
    fitness: { label: 'Gimnasios y estudios', blurb: 'Pantallas en recepción, socios casi a diario' },
    retail: { label: 'Tiendas y servicios', blurb: 'Cajas, mostradores, clientes de paso' },
  },
  areas: {
    downtown: { label: 'Centro de Provo', blurb: 'Center Street y las cuadras a cada lado' },
    campus: { label: 'Campus de BYU', blurb: 'Freedom Blvd hasta la entrada norte' },
    eastbay: { label: 'East Bay', blurb: 'La zona industrial y de tiendas grandes al sur del centro' },
    riverwoods: { label: 'Riverwoods', blurb: 'El lado de Orem de University Parkway' },
    northorem: { label: 'Norte de Orem', blurb: 'State Street entre 800 y 1600 North' },
  },
  status: {
    live: 'Activo',
    inConversation: 'En conversación',
    waitlist: 'En lista de espera',
  },
  board: {
    yourShop: 'Tu negocio',
    nothingYet: 'Este tablero todavía está vacío.',
    adSpace: 'Espacio de anuncio',
    fullTurn: 'Los anuncios toman un turno completo entre tus tableros',
    clipInRotation: 'Tu video está en la rotación',
    clipTitle: 'Tu propio video se reproduce entre tableros',
    starsOutOf: (n: number) => `${n} de 5`,
  },
  reel: {
    expand: (name: string) => `Ampliar el tablero de ${name}`,
    boardOf: (name: string) => `Tablero de ${name}`,
    close: 'Cerrar',
    rosas: 'El anuncio va como una franja en la parte de abajo. Todo el menú queda arriba.',
    roost: 'Los anuncios ocupan el tercio derecho del tablero. Los platillos y guarniciones se quedan con el resto.',
    forno: 'Dos pantallas en una pared. Solo la derecha se interrumpe para un anuncio local corto.',
    meridian: 'Un tablero vertical detrás del mostrador, con el espacio del anuncio al pie.',
  },
};

export const SHARED = { en, es };
