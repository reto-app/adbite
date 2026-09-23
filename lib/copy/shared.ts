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
    sentTo: (email: string) => `We sent a link to ${email}. Open it on this device and you land back here, signed in; if this is your first time, that click is what makes your account. The link is good for an hour.`,
    title: 'Start with your email',
    lede: 'New here or coming back, it is the same door: type the email you use for your business and we send a link. Clicking it makes your account the first time and signs you in every time after. No password to make up or forget.',
    email: 'Email',
    emailPlaceholder: 'you@yourbusiness.com',
    send: 'Send me a link',
    trouble: 'Trouble getting in? Write to',
  },
  choose: {
    title: 'Which side of the board are you on?',
    lede: (email: string) => `This sets what ${email} is for good: a shop that runs a board, or a business that advertises on them. It cannot be changed later, so if you do both, use a second email for the other.`,
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
      name: 'Permanent spot',
      blurb: 'A static ad in the strip under the shop’s menu, held for a year. Their board stays readable the whole time.',
      spec: '1920 × 240 · still image · 1080 × 340 on a portrait screen',
    },
    video: {
      name: 'Short video',
      blurb: 'Up to fifteen seconds of motion, muted, between turns of the shop’s own footage.',
      spec: '1920 × 1080 · up to 0:15 · 1080 × 1920 on a portrait screen',
    },
  },
  dayparts: {
    lunch: { label: 'Lunch', window: '11am-2pm' },
    afternoon: { label: 'Afternoon', window: '2pm-5pm' },
    evening: { label: 'Evening', window: '5pm-9pm' },
  },
  unit: { minute: 'minute', minutes: 'minutes', play: 'play', plays: 'plays' },
  placements: {
    none: {
      label: 'Nowhere this week',
      short: 'Nowhere',
      note: 'The whole screen stays yours. Nothing is booked, and nothing is paid.',
      filmNote: 'The whole screen stays yours. Nothing is booked, and nothing is paid.',
    },
    banner: {
      label: 'A strip along the bottom',
      short: 'Bottom strip',
      note: 'A band under your menu. Everything you wrote stays readable.',
      /* Most screens we sell are film rather than a list, and on those the
         menu this note talks about does not exist. */
      filmNote: 'A band under your screen. Your film keeps the rest of it and never stops.',
    },
    rail: {
      label: 'A rail down the right',
      short: 'Right rail',
      note: 'The right third, top to bottom. Your menu keeps the rest of the board.',
      filmNote: 'The right third, top to bottom. Your film keeps the rest of the screen.',
    },
    rotation: {
      label: 'Between your boards',
      short: 'Between boards',
      note: 'The full screen for one turn of the rotation, then your menu is back.',
      filmNote: 'The full screen for one turn of the rotation, then your film is back.',
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
  orientations: {
    landscape: { label: 'Landscape', note: 'Hung the usual way round · 16:9' },
    portrait: { label: 'Portrait', note: 'Turned on its end · 9:16' },
  },
  turns: {
    left: { label: 'Top to the left', note: 'Turned anticlockwise' },
    right: { label: 'Top to the right', note: 'Turned clockwise' },
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
    provo: { label: 'Provo', blurb: 'University Parkway and Center Street' },
    springville: { label: 'Springville', blurb: 'North Main, by the freeway' },
    spanishfork: { label: 'Spanish Fork', blurb: 'Main Street' },
    americanfork: { label: 'American Fork', blurb: 'State Street, downtown' },
    lindon: { label: 'Lindon', blurb: 'State Street' },
    saratoga: { label: 'Saratoga Springs', blurb: 'Redwood Road' },
    saltlake: { label: 'Salt Lake City', blurb: 'The Granary, west of downtown' },
  },
  status: {
    live: 'Live',
    inConversation: 'In conversation',
    waitlist: 'Waitlist',
  },
  board: {
    yourShop: 'Your shop',
    nothingYet: 'Nothing on this board yet.',
    pictureHere: 'A picture goes here',
    wordsHere: 'Your words here',
    adSpace: 'Ad space',
    filmHere: 'The shop’s own film plays here',
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
    meridian: 'A tall board behind the counter, with the ad slot at the foot.',
    spot: 'The shop’s own food, playing full screen, cutting to a local spot and back.',
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
    sentTo: (email: string) => `Enviamos un enlace a ${email}. Ábrelo en este dispositivo y vuelves aquí con la sesión iniciada; si es tu primera vez, ese clic es lo que crea tu cuenta. El enlace dura una hora.`,
    title: 'Empieza con tu correo',
    lede: 'Seas nuevo o ya tengas cuenta, la puerta es la misma: escribe el correo que usas para tu negocio y te mandamos un enlace. Al abrirlo se crea tu cuenta la primera vez, y las siguientes solo inicia sesión. Sin contraseñas que inventar ni olvidar.',
    email: 'Correo',
    emailPlaceholder: 'tu@tunegocio.com',
    send: 'Envíame un enlace',
    trouble: '¿Problemas para entrar? Escribe a',
  },
  choose: {
    title: '¿De qué lado del tablero estás?',
    lede: (email: string) => `Esto define para siempre qué es ${email}: un negocio que tiene un tablero, o una empresa que se anuncia en ellos. No se puede cambiar después, así que si haces las dos cosas, usa otro correo para la otra.`,
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
      name: 'Espacio permanente',
      blurb: 'Un anuncio fijo en la franja debajo del menú del negocio, por un año. Su tablero sigue legible todo el tiempo.',
      spec: '1920 × 240 · imagen fija · 1080 × 340 en pantalla vertical',
    },
    video: {
      name: 'Video corto',
      blurb: 'Hasta quince segundos de movimiento, sin sonido, entre turnos del propio video del negocio.',
      spec: '1920 × 1080 · hasta 0:15 · 1080 × 1920 en pantalla vertical',
    },
  },
  dayparts: {
    lunch: { label: 'Almuerzo', window: '11am-2pm' },
    afternoon: { label: 'Tarde', window: '2pm-5pm' },
    evening: { label: 'Noche', window: '5pm-9pm' },
  },
  unit: { minute: 'minuto', minutes: 'minutos', play: 'reproducción', plays: 'reproducciones' },
  placements: {
    none: {
      label: 'En ningún lado esta semana',
      short: 'Ningún lado',
      note: 'Toda la pantalla es tuya. No se reserva nada y no se paga nada.',
      filmNote: 'Toda la pantalla es tuya. No se reserva nada y no se paga nada.',
    },
    banner: {
      label: 'Una franja abajo',
      short: 'Franja inferior',
      note: 'Una banda debajo de tu menú. Todo lo que escribiste sigue legible.',
      filmNote: 'Una banda debajo de tu pantalla. Tu video se queda con el resto y nunca se detiene.',
    },
    rail: {
      label: 'Una columna a la derecha',
      short: 'Columna derecha',
      note: 'El tercio derecho, de arriba abajo. Tu menú se queda con el resto del tablero.',
      filmNote: 'El tercio derecho, de arriba abajo. Tu video se queda con el resto de la pantalla.',
    },
    rotation: {
      label: 'Entre tus tableros',
      short: 'Entre tableros',
      note: 'La pantalla completa por un turno de la rotación, y luego vuelve tu menú.',
      filmNote: 'La pantalla completa por un turno de la rotación, y luego vuelve tu video.',
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
  orientations: {
    landscape: { label: 'Horizontal', note: 'Colgada como siempre · 16:9' },
    portrait: { label: 'Vertical', note: 'Girada de canto · 9:16' },
  },
  turns: {
    left: { label: 'Parte de arriba a la izquierda', note: 'Girada en sentido antihorario' },
    right: { label: 'Parte de arriba a la derecha', note: 'Girada en sentido horario' },
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
    provo: { label: 'Provo', blurb: 'University Parkway y Center Street' },
    springville: { label: 'Springville', blurb: 'North Main, junto a la autopista' },
    spanishfork: { label: 'Spanish Fork', blurb: 'Main Street' },
    americanfork: { label: 'American Fork', blurb: 'State Street, centro' },
    lindon: { label: 'Lindon', blurb: 'State Street' },
    saratoga: { label: 'Saratoga Springs', blurb: 'Redwood Road' },
    saltlake: { label: 'Salt Lake City', blurb: 'The Granary, al oeste del centro' },
  },
  status: {
    live: 'Activo',
    inConversation: 'En conversación',
    waitlist: 'En lista de espera',
  },
  board: {
    yourShop: 'Tu negocio',
    nothingYet: 'Este tablero todavía está vacío.',
    pictureHere: 'Aquí va una foto',
    wordsHere: 'Tu texto aquí',
    adSpace: 'Espacio de anuncio',
    filmHere: 'Aquí se reproduce el video del negocio',
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
    meridian: 'Un tablero vertical detrás del mostrador, con el espacio del anuncio al pie.',
    spot: 'La comida del propio negocio, a pantalla completa, cortando a un anuncio local y de vuelta.',
  },
};

export const SHARED = { en, es };
