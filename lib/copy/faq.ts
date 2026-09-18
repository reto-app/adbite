/* The FAQ. Each answer is a function of the figures it quotes, so the price
 * and earnings numbers still come from lib/pricing.ts in both languages. */

type Figures = {
  hours: string;
  weekly: string;
  yearly: string;
  videoHour: string;
  spots: number;
  mail: string;
};

const en = {
  title: 'Friendly details. No fine-print feeling.',
  ledeBefore: 'We’re building AdBite to be straightforward for both shops and advertisers. If something here is unclear, that is our problem, not yours: write to ',
  ledeAfter: ' and we will fix the wording.',
  still: 'Still curious?',
  talk: 'Talk about your shop',
  advertise: 'Advertise on a board',
  faqs: (f: Figures): [string, string][] => [
    ['What else does the screen do?', 'Quite a lot, and it is included. You can lay out and edit the menu itself in the browser and push it to the screen, play video of your own food, run your best Google and Yelp reviews between courses, and swap the whole board between breakfast, lunch and evening on a schedule. If you do not have a screen yet, we can supply one and install it.'],
    ['Who is this for?', 'Any independent shop with a screen people look at while they wait. Surf shops, retail and gift stores, grocery stores and corner markets, salons and barbershops, cafés, restaurants and taquerias, gyms, bike shops, laundromats. If there is a TV or a menu board above your counter, it qualifies.'],
    ['Does the shop owner approve every ad?', 'Yes. Shop owners see each creative before it is scheduled and can approve or reject it. Nothing runs without their okay.'],
    ['Where on the screen do the ads go?', 'Wherever you put them. In the board builder you pick the place, not a percentage: a strip along the bottom under your menu, a rail down the right third, a full turn between your boards, or nowhere at all in a week you want the whole screen. The rail is the usual choice and works out to about a third. Menus and essential shop content always come first.'],
    ['What does a shop actually earn?', 'Prices are worked out with each shop when it joins, and depend on the screen, the hours it is on and what the boards near it are selling for. Tell us about your counter and we will give you a real figure for it rather than a number off a page.'],
    ['Does it cost more at busy times?', 'No. Video is one flat rate at every hour of the day, and a permanent spot is a place on the board rather than a quantity of time. You can still choose the hours you run in — lunch only, evenings only, the whole open week — but choosing them changes what you buy, not what a minute costs.'],
    ['What is there to buy?', `Two things. A permanent spot is a place rather than a quantity: a static ad in the strip under one shop's menu, on one screen, for a year. Each board holds ${f.spots} of them, and they are priced per screen and arranged over a conversation, because which boards have one free changes week to week. Short video is time: fifteen muted seconds between turns of the shop's own footage, ${f.videoHour} an hour actually shown, stop whenever you like.`],
    ['Why is video billed per play and not per minute?', 'Because a count of plays is what an advertiser is actually buying, and it is the number we can stand behind. A fifteen-second spot either ran or it did not. Charging for a stretch of time would mean averaging across runs that may not have happened, and we would rather bill the thing we can count.'],
    ['Who sells the ads?', 'AdBite coordinates the local placements during the pilot. Shop owners do not need to manage sales conversations or chase payments.'],
    ['When do shops get paid?', 'Payments go out monthly, with the timing confirmed when a shop joins the pilot. You are paid on what actually played, itemised by spot, so you can see which hours and which formats earned.'],
    ['What if I am worried about my brand image?', 'You set the tone as much as the ads do. Tell us the kinds of businesses that fit your shop and we match placements to them, and any creative you would rather not run can be deferred or rejected outright, with no explanation owed. Plenty of shops go further and frame the screen as a point of pride: a small line reading “[your shop] supports local business” turns the ad slot into something your regulars read as generosity rather than advertising.'],
    ['What kinds of ads can run?', 'Four formats: a bottom banner that leaves the menu visible, a side rail down the right of a wide board, a full-screen spot for one turn of the rotation, and a short muted video in that same slot. Every format is subject to owner approval, and the ones that take more of the board cost the advertiser more.'],
    ['What do advertisers see in reporting?', 'How many times the ad played and the total minutes it was on screen, per shop and per hour of the day, along with the venues included. No impressions, no reach estimates, no modelled numbers.'],
    ['Can I sign up right now?', `Not yet, and we would rather say so than take your card. AdBite is running on a small number of screens across Salt Lake, Utah and Cache counties while we get the pilot right, so we are not opening accounts for volume. Making an account takes an email address and a link in the mail, and from there you can price a campaign, build a board and see your artwork on a real screen; when you want to go further, the request form goes straight to ${f.mail} and a person answers it.`],
  ],
};

const es: typeof en = {
  title: 'Detalles claros. Sin letra chiquita.',
  ledeBefore: 'Estamos construyendo AdBite para que sea sencillo tanto para negocios como para anunciantes. Si algo aquí no queda claro, el problema es nuestro, no tuyo: escríbenos a ',
  ledeAfter: ' y lo corregimos.',
  still: '¿Todavía tienes dudas?',
  talk: 'Hablemos de tu negocio',
  advertise: 'Anúnciate en un tablero',
  faqs: (f: Figures): [string, string][] => [
    ['¿Qué más hace la pantalla?', 'Bastante, y viene incluido. Puedes armar y editar el menú desde el navegador y mandarlo a la pantalla, mostrar video de tu propia comida, pasar tus mejores reseñas de Google y Yelp entre platillos, y cambiar todo el tablero entre desayuno, almuerzo y noche con un horario. Si todavía no tienes pantalla, podemos ponerla e instalarla.'],
    ['¿Para quién es esto?', 'Cualquier negocio independiente con una pantalla que la gente mira mientras espera. Tiendas de surf, tiendas y regalos, abarrotes y mercados de barrio, salones y barberías, cafés, restaurantes y taquerías, gimnasios, tiendas de bicis, lavanderías. Si hay una TV o un tablero de menú sobre tu mostrador, califica.'],
    ['¿El dueño del negocio aprueba cada anuncio?', 'Sí. Los dueños ven cada anuncio antes de que se programe y pueden aprobarlo o rechazarlo. Nada se muestra sin su visto bueno.'],
    ['¿En qué parte de la pantalla van los anuncios?', 'Donde tú los pongas. En el creador de tableros eliges el lugar, no un porcentaje: una franja abajo debajo de tu menú, una columna en el tercio derecho, un turno completo entre tus tableros, o ningún lado en una semana en que quieras toda la pantalla. La columna es la opción más común y equivale a cerca de un tercio. El menú y el contenido esencial del negocio siempre van primero.'],
    ['¿Cuánto gana realmente un negocio?', 'Los precios se calculan con cada negocio cuando se une, y dependen de la pantalla, las horas que está encendida y lo que se están vendiendo los tableros cercanos. Cuéntanos de tu mostrador y te damos una cifra real en vez de un número sacado de una página.'],
    ['¿Cuesta más en las horas ocupadas?', 'No. El video tiene una tarifa plana a cualquier hora del día, y un espacio permanente es un lugar en el tablero, no una cantidad de tiempo. Puedes elegir las horas en que se muestra (solo el almuerzo, solo las noches, toda la semana abierta), pero eso cambia lo que compras, no lo que cuesta un minuto.'],
    ['¿Qué se puede comprar?', `Dos cosas. Un espacio permanente es un lugar, no una cantidad: un anuncio fijo en la franja debajo del menú de un negocio, en una pantalla, por un año. Cada tablero tiene ${f.spots}, se cotizan por pantalla y se acuerdan hablando, porque qué tableros tienen uno libre cambia cada semana. El video corto es tiempo: quince segundos sin sonido entre turnos del propio video del negocio, ${f.videoHour} por hora realmente mostrada, y lo paras cuando quieras.`],
    ['¿Por qué el video se cobra por reproducción y no por minuto?', 'Porque un conteo de reproducciones es lo que el anunciante realmente compra, y es el número que podemos respaldar. Un anuncio de quince segundos se reprodujo o no. Cobrar por un tramo de tiempo sería promediar reproducciones que quizá no ocurrieron, y preferimos cobrar lo que podemos contar.'],
    ['¿Quién vende los anuncios?', 'AdBite coordina las colocaciones locales durante el piloto. Los dueños no tienen que manejar ventas ni perseguir pagos.'],
    ['¿Cuándo cobran los negocios?', 'Los pagos salen cada mes, y la fecha se confirma cuando un negocio entra al piloto. Cobras por lo que realmente se reprodujo, detallado por espacio, así que puedes ver qué horas y qué formatos generaron ingresos.'],
    ['¿Y si me preocupa la imagen de mi negocio?', 'Tú marcas el tono tanto como los anuncios. Dinos qué tipos de negocios van con el tuyo y ajustamos las colocaciones, y cualquier anuncio que prefieras no mostrar se puede posponer o rechazar de plano, sin deber explicaciones. Muchos negocios van más allá y presentan la pantalla con orgullo: una línea pequeña que diga “[tu negocio] apoya a los negocios locales” convierte el espacio de anuncios en algo que tus clientes leen como generosidad, no como publicidad.'],
    ['¿Qué tipos de anuncios se pueden mostrar?', 'Cuatro formatos: una franja inferior que deja el menú visible, una columna lateral a la derecha de un tablero ancho, un anuncio de pantalla completa por un turno de la rotación, y un video corto sin sonido en ese mismo espacio. Todos los formatos pasan por la aprobación del dueño, y los que ocupan más tablero le cuestan más al anunciante.'],
    ['¿Qué ven los anunciantes en los reportes?', 'Cuántas veces se reprodujo el anuncio y el total de minutos que estuvo en pantalla, por negocio y por hora del día, junto con los locales incluidos. Sin impresiones, sin estimaciones de alcance, sin números modelados.'],
    ['¿Me puedo registrar ahora mismo?', `Todavía no, y preferimos decirlo antes que pedirte la tarjeta. AdBite está funcionando en un número pequeño de pantallas en los condados de Salt Lake, Utah y Cache mientras afinamos el piloto, así que no estamos abriendo cuentas en volumen. Crear una cuenta solo pide tu correo y un enlace por mail, y desde ahí puedes calcular una campaña, armar un tablero y ver tu arte en una pantalla real; cuando quieras dar el siguiente paso, el formulario llega directo a ${f.mail} y una persona lo responde.`],
  ],
};

export const FAQ = { en, es };
