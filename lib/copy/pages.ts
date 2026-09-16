/* The three plain pages: About, the pilot terms, and privacy. Figures come in
 * from the page so the money still lives in lib/pricing.ts. */

type AboutFigures = { city: string; since: string; shop: string; street: string; cityLine: string; weekly: string };
type TermsFigures = { weekly: string; ceiling: string; bannerOff: string; fullPeak: string; videoOff: string; videoPeak: string; minutes: string };

const en = {
  about: {
    title: 'Local screens should support the places that hold a neighborhood together.',
    lede: (city: string) => `AdBite is starting small and close to home: boards going in above counters across Salt Lake, Utah and Cache counties, the first of them in ${city}, and advertisers who want to show up with more care than a random feed placement.`,
    values: [
      ['Three counties at a time', 'Salt Lake, Utah and Cache, and nothing beyond them yet. We are testing the model locally first, so the shops and advertisers on the network can actually feel connected.'],
      ['Built for independents', 'Restaurants, barbers, salons, cafés, and other small businesses, not big chains with a corporate playbook.'],
      ['Respect for the room', 'Shop owners approve every ad, and the screen stays theirs. AdBite simply helps it earn.'],
    ] as [string, string][],
    where: 'Where we actually are',
    facts: (f: AboutFigures): [string, string][] => [
      ['Stage', `Pilot. Boards going in across Salt Lake, Utah and Cache counties, the first live since ${f.since}.`],
      ['Where it started', `${f.shop}, ${f.street}, ${f.cityLine}.`],
      ['What a shop earns', `From about ${f.weekly} a week per board, more when the larger ad formats sell, and more again on a second screen.`],
      ['What we charge advertisers', 'By the minute, or by the play for video. More at lunch and dinner, more for the formats that take more of the board.'],
    ],
    note: 'The illustrated shops elsewhere on this site are examples of the kinds of businesses AdBite is built for, not customers. The board screenshots are concept mockups. When that changes, this page changes with it.',
    contactBefore: 'A real person reads ',
    contactAfter: '. Ask us anything, including the awkward questions about a pilot this small.',
    ctaTitle: 'Have a screen, or a local story to tell?',
    joinShop: 'Join as a shop',
    reach: 'Reach local customers',
  },
  terms: {
    title: 'Pilot terms',
    date: 'Last updated September 2026. These are the commitments the site makes, written plainly. A signed agreement follows when a shop or an advertiser joins, and it will say the same things in more words.',
    shopTitle: 'If you run a shop',
    shop: (f: TermsFigures) => [
      'You approve every creative before it is scheduled. You can reject anything, for any reason, without explaining yourself.',
      'You set where on the screen ads may sit: a strip under your menu, a rail down the right, a full turn between your boards, or nowhere at all in any given week.',
      `You are paid from about ${f.weekly} a week per board, rising toward ${f.ceiling} in weeks when the larger ad formats sell. Your own opening hours and the number of screens you run change the figure.`,
      'You are paid monthly, on what actually played, itemised by spot, so you can see which hours and formats earned.',
      'The board software, the screen monitoring, finding advertisers and collecting the money are all included. There is nothing to pay us and nothing deducted from your side.',
      'There is no contract term, no hardware to buy, and no exit fee. Tell us to stop and we stop.',
    ],
    adTitle: 'If you buy ads',
    ads: (f: TermsFigures) => [
      'You buy screen time, not impressions. Price moves on two things: how much of the board your ad takes, and when it runs. You pick the shops, the neighborhoods or the whole county.',
      `A bottom banner starts at ${f.bannerOff} a minute off-peak. A full-screen spot, which blanks the shop’s menu for its turn, runs to ${f.fullPeak} a minute at peak. A side rail sits between them.`,
      `A short video is billed per play rather than per minute, from ${f.videoOff} to ${f.videoPeak} a play, because a count of runs is what you are buying and what we can count.`,
      'Peak is lunch and dinner. The afternoon is about half the price of peak in every format.',
      'The shop owner can reject your creative. If they do, nothing runs and nothing is billed.',
      'You are billed only for what actually ran: minutes shown, or plays for a video. Anything booked that did not run rolls into the next week.',
      'Reporting is plays and on-screen minutes, split peak and off-peak. We do not report reach, impressions or any modelled figure, because we cannot measure them.',
      'There is no auction. The rate card is the rate, and it does not move because of who else booked that week.',
    ],
    notTitle: 'What we do not promise',
    not: (f: TermsFigures) => [
      'Any particular number of people seeing your ad. We sell time on a screen in a room, and we will not dress that up as an audience measurement.',
      'Targeting. Age and daypart preferences travel with a booking as a request. The shop runs one rotation for everyone in the room.',
      `Availability. The pilot is a finite number of boards across Salt Lake, Utah and Cache counties, and each one holds about ${f.minutes} minutes of ad time a week. When the boards you picked are full, they are full, and we will tell you rather than quietly moving your ad somewhere you did not choose.`,
    ],
    footBefore: 'Questions about any of this go to ',
    footAfter: ', and we would rather answer them before you sign than after.',
  },
  privacy: {
    title: 'Privacy',
    date: 'Last updated September 2026. AdBite is a pilot, so this is short and specific rather than long and general.',
    sections: [
      ['What we collect', 'Only what you type into a form. The shop waitlist takes your shop name, shop type, city, number of screens and your email address. The advertiser form takes your business type, location, budget range, the line you would want to run, and your email. The campaign builder takes your email when you submit a booking, plus the campaign settings you chose.'],
      ['Where it goes', 'Straight to AdBite, so a person can reply to you. We do not sell it, rent it, or pass it to advertisers or shops without asking you first. If we cannot deliver your submission we tell you so on the page rather than quietly dropping it.'],
      ['Your account', 'Signing in takes your email address and nothing else; we send a link rather than storing a password. What you make while signed in, a shop’s menu board, the ads a business books and the shop’s decision on each, is stored with Supabase in the United States so it reaches your screens and is there on your next device. Artwork you upload for a preview stays in your browser until a booking is placed.'],
      ['Mail we send', 'Sign-in links, a note when a booking arrives for your shop, and a note when a shop has decided on your ad. Those go through Resend. No newsletters and nothing you did not ask for by using the product.'],
      ['Analytics', 'We count page views and which buttons get used, so we can tell which parts of this site are confusing. It is aggregate and cookieless: no profiles, no cross-site tracking, no advertising pixels.'],
      ['Maps', 'The shop map loads tiles from OpenStreetMap, which means your browser makes a request to their servers and they see your IP address. Besides Supabase and Resend above, that is the only third party this site talks to.'],
    ] as [string, string][],
    removeTitle: 'Having it removed',
    removeBefore: 'Write to ',
    removeAfter: ' and ask. We will delete what we hold and confirm when it is done. You do not need to give a reason.',
  },
};

const es: typeof en = {
  about: {
    title: 'Las pantallas locales deberían apoyar a los lugares que mantienen unido a un vecindario.',
    lede: (city: string) => `AdBite empieza en pequeño y cerca de casa: tableros instalándose sobre mostradores en los condados de Salt Lake, Utah y Cache, el primero de ellos en ${city}, y anunciantes que quieren aparecer con más cuidado que en un feed cualquiera.`,
    values: [
      ['Tres condados a la vez', 'Salt Lake, Utah y Cache, y por ahora nada más allá. Estamos probando el modelo primero a nivel local, para que los negocios y anunciantes de la red realmente se sientan conectados.'],
      ['Hecho para independientes', 'Restaurantes, barberías, salones, cafés y otros negocios pequeños, no grandes cadenas con manual corporativo.'],
      ['Respeto por el local', 'Los dueños aprueban cada anuncio, y la pantalla sigue siendo suya. AdBite solo la ayuda a generar ingresos.'],
    ] as [string, string][],
    where: 'Dónde estamos realmente',
    facts: (f: AboutFigures): [string, string][] => [
      ['Etapa', `Piloto. Tableros instalándose en los condados de Salt Lake, Utah y Cache, el primero activo desde ${f.since}.`],
      ['Dónde empezó', `${f.shop}, ${f.street}, ${f.cityLine}.`],
      ['Cuánto gana un negocio', `Desde cerca de ${f.weekly} a la semana por tablero, más cuando se venden los formatos grandes, y más aún con una segunda pantalla.`],
      ['Qué cobramos a los anunciantes', 'Por minuto, o por reproducción en el caso del video. Más al almuerzo y la cena, más por los formatos que ocupan más tablero.'],
    ],
    note: 'Los negocios ilustrados en este sitio son ejemplos del tipo de negocios para los que está hecho AdBite, no clientes. Las capturas de los tableros son maquetas conceptuales. Cuando eso cambie, esta página cambia también.',
    contactBefore: 'Una persona real lee ',
    contactAfter: '. Pregúntanos lo que sea, incluidas las preguntas incómodas sobre un piloto así de pequeño.',
    ctaTitle: '¿Tienes una pantalla, o una historia local que contar?',
    joinShop: 'Únete como negocio',
    reach: 'Llega a clientes locales',
  },
  terms: {
    title: 'Términos del piloto',
    date: 'Última actualización: septiembre de 2026. Estos son los compromisos que asume el sitio, escritos en lenguaje claro. Cuando un negocio o un anunciante se une, sigue un acuerdo firmado que dirá lo mismo con más palabras.',
    shopTitle: 'Si tienes un negocio',
    shop: (f: TermsFigures) => [
      'Apruebas cada anuncio antes de que se programe. Puedes rechazar cualquiera, por cualquier motivo, sin dar explicaciones.',
      'Tú decides dónde van los anuncios en la pantalla: una franja debajo de tu menú, una columna a la derecha, un turno completo entre tus tableros, o ningún lado en cualquier semana.',
      `Cobras desde cerca de ${f.weekly} a la semana por tablero, subiendo hacia ${f.ceiling} en las semanas en que se venden los formatos grandes. Tu propio horario y el número de pantallas cambian la cifra.`,
      'Cobras cada mes, por lo que realmente se reprodujo, detallado por espacio, para que veas qué horas y formatos generaron ingresos.',
      'El software del tablero, el monitoreo de la pantalla, conseguir anunciantes y cobrar el dinero están incluidos. No nos pagas nada y no se te descuenta nada.',
      'No hay plazo de contrato, no hay equipo que comprar y no hay cargo por salir. Dinos que paremos y paramos.',
    ],
    adTitle: 'Si compras anuncios',
    ads: (f: TermsFigures) => [
      'Compras tiempo en pantalla, no impresiones. El precio depende de dos cosas: cuánto tablero ocupa tu anuncio y cuándo se muestra. Tú eliges los negocios, los vecindarios o el condado entero.',
      `Una franja inferior empieza en ${f.bannerOff} por minuto en hora baja. Un anuncio de pantalla completa, que apaga el menú del negocio durante su turno, llega a ${f.fullPeak} por minuto en hora pico. Una columna lateral queda entre los dos.`,
      `Un video corto se cobra por reproducción en vez de por minuto, de ${f.videoOff} a ${f.videoPeak} por reproducción, porque un conteo de reproducciones es lo que compras y lo que podemos contar.`,
      'La hora pico es el almuerzo y la cena. La tarde cuesta cerca de la mitad de la hora pico en todos los formatos.',
      'El dueño del negocio puede rechazar tu anuncio. Si lo hace, no se muestra nada y no se cobra nada.',
      'Solo se te cobra lo que realmente se mostró: minutos en pantalla, o reproducciones en el caso del video. Lo reservado que no se mostró pasa a la siguiente semana.',
      'Los reportes son reproducciones y minutos en pantalla, separados en hora pico y hora baja. No reportamos alcance, impresiones ni ninguna cifra modelada, porque no podemos medirlas.',
      'No hay subasta. La tarifa es la tarifa, y no cambia según quién más haya reservado esa semana.',
    ],
    notTitle: 'Lo que no prometemos',
    not: (f: TermsFigures) => [
      'Un número determinado de personas viendo tu anuncio. Vendemos tiempo en una pantalla dentro de un local, y no lo vamos a disfrazar de medición de audiencia.',
      'Segmentación. Las preferencias de edad y horario viajan con la reserva como una solicitud. El negocio muestra una sola rotación para todos los que están en el local.',
      `Disponibilidad. El piloto es un número finito de tableros en los condados de Salt Lake, Utah y Cache, y cada uno tiene cerca de ${f.minutes} minutos de tiempo de anuncios a la semana. Cuando los tableros que elegiste estén llenos, están llenos, y te lo diremos en vez de mover tu anuncio en silencio a un lugar que no elegiste.`,
    ],
    footBefore: 'Las preguntas sobre cualquiera de estos puntos van a ',
    footAfter: ', y preferimos responderlas antes de que firmes que después.',
  },
  privacy: {
    title: 'Privacidad',
    date: 'Última actualización: septiembre de 2026. AdBite es un piloto, así que esto es corto y específico en vez de largo y general.',
    sections: [
      ['Qué recopilamos', 'Solo lo que escribes en un formulario. La lista de espera para negocios pide el nombre del negocio, el tipo, la ciudad, el número de pantallas y tu correo. El formulario de anunciantes pide el tipo de negocio, la ubicación, un rango de presupuesto, la línea que querrías mostrar y tu correo. El creador de campañas pide tu correo cuando envías una reserva, más la configuración de campaña que elegiste.'],
      ['A dónde va', 'Directo a AdBite, para que una persona pueda responderte. No lo vendemos, no lo rentamos ni lo pasamos a anunciantes o negocios sin preguntarte primero. Si no podemos entregar tu solicitud, te lo decimos en la página en vez de descartarla en silencio.'],
      ['Tu cuenta', 'Iniciar sesión pide tu correo y nada más; enviamos un enlace en vez de guardar una contraseña. Lo que creas con la sesión iniciada, el tablero de menú de un negocio, los anuncios que reserva un negocio y la decisión del negocio sobre cada uno, se guarda en Supabase en Estados Unidos para que llegue a tus pantallas y esté en tu próximo dispositivo. El arte que subes para una vista previa se queda en tu navegador hasta que haces una reserva.'],
      ['Correos que enviamos', 'Enlaces de acceso, un aviso cuando llega una reserva para tu negocio, y un aviso cuando un negocio decide sobre tu anuncio. Salen por Resend. Sin boletines y sin nada que no hayas pedido al usar el producto.'],
      ['Analítica', 'Contamos visitas a la página y qué botones se usan, para saber qué partes de este sitio confunden. Es agregado y sin cookies: sin perfiles, sin rastreo entre sitios, sin píxeles publicitarios.'],
      ['Mapas', 'El mapa de negocios carga imágenes de OpenStreetMap, lo que significa que tu navegador hace una solicitud a sus servidores y ellos ven tu dirección IP. Además de Supabase y Resend arriba, es el único tercero con el que habla este sitio.'],
    ] as [string, string][],
    removeTitle: 'Cómo pedir que se elimine',
    removeBefore: 'Escribe a ',
    removeAfter: ' y pídelo. Eliminamos lo que tengamos y te confirmamos cuando esté hecho. No hace falta dar un motivo.',
  },
};

export const PAGES = { en, es };
