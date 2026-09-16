/* The FAQ. Each answer is a function of the figures it quotes, so the price
 * and earnings numbers still come from lib/pricing.ts in both languages. */

type Figures = {
  hours: string;
  weekly: string;
  ceiling: string;
  bannerOff: string;
  fullPeak: string;
  videoOff: string;
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
    ['What does a shop actually earn?', `It depends on your opening hours, because you are selling screen time. A board open ${f.hours} is paid from about ${f.weekly} a week. That figure is a floor: it assumes every minute sells as the smallest ad format. Weeks where the bigger formats sell run higher, up to around ${f.ceiling}. A shop open seven days, or running two screens, earns proportionally more.`],
    ['Why do ads cost more at some times than others?', 'Because attention is not evenly spread through the day. Lunch and dinner are peak: there is a queue, and people are reading the board while they decide. The quiet middle of the afternoon is about half the price. Shops earn more from their busy hours, and advertisers who are flexible pay less.'],
    ['Why do some ad formats cost more than others?', `Because they ask more of the room. A bottom banner leaves the whole menu readable, so it is the cheapest thing we sell, from ${f.bannerOff} a minute. A side rail takes the right third. A full-screen spot blanks the board for its turn, which is the most we ever ask of a shop and the most an advertiser pays, up to ${f.fullPeak} a minute at peak. A short video sits in that full-screen slot and is billed per play rather than per minute, from ${f.videoOff} a play.`],
    ['Why is video billed per play and not per minute?', 'Because a count of plays is what an advertiser is actually buying, and it is the number we can stand behind. A fifteen-second spot either ran or it did not. Charging for a stretch of time would mean averaging across runs that may not have happened, and we would rather bill the thing we can count.'],
    ['Who sells the ads?', 'AdBite coordinates the local placements during the pilot. Shop owners do not need to manage sales conversations or chase payments.'],
    ['When do shops get paid?', 'Payments go out monthly, with the timing confirmed when a shop joins the pilot. You are paid on what actually played, itemised by spot, so you can see which hours and which formats earned.'],
    ['What if I am worried about my brand image?', 'You set the tone as much as the ads do. Tell us the kinds of businesses that fit your shop and we match placements to them, and any creative you would rather not run can be deferred or rejected outright, with no explanation owed. Plenty of shops go further and frame the screen as a point of pride: a small line reading “[your shop] supports local business” turns the ad slot into something your regulars read as generosity rather than advertising.'],
    ['What kinds of ads can run?', 'Four formats: a bottom banner that leaves the menu visible, a side rail down the right of a wide board, a full-screen spot for one turn of the rotation, and a short muted video in that same slot. Every format is subject to owner approval, and the ones that take more of the board cost the advertiser more.'],
    ['What do advertisers see in reporting?', 'How many times the ad played and the total minutes it was on screen, split between peak and off-peak, along with the venues included. No impressions, no reach estimates, no modelled numbers.'],
    ['Can I sign up right now?', `Not yet, and we would rather say so than take your card. AdBite is running on a small number of screens across Salt Lake, Utah and Cache counties while we get the pilot right, so we are not opening accounts for volume. You can still price a campaign and see your artwork on a real board without an account; when you want to go further, the request form goes straight to ${f.mail} and a person answers it.`],
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
    ['¿Cuánto gana realmente un negocio?', `Depende de tu horario, porque estás vendiendo tiempo en pantalla. Un tablero abierto ${f.hours} recibe desde cerca de ${f.weekly} a la semana. Esa cifra es un mínimo: supone que cada minuto se vende en el formato de anuncio más pequeño. Las semanas en que se venden los formatos grandes suben, hasta alrededor de ${f.ceiling}. Un negocio abierto siete días, o con dos pantallas, gana proporcionalmente más.`],
    ['¿Por qué los anuncios cuestan más a ciertas horas?', 'Porque la atención no se reparte igual durante el día. El almuerzo y la cena son hora pico: hay fila, y la gente lee el tablero mientras decide. La tarde tranquila cuesta cerca de la mitad. Los negocios ganan más en sus horas ocupadas, y los anunciantes con flexibilidad pagan menos.'],
    ['¿Por qué algunos formatos cuestan más que otros?', `Porque le piden más al local. Una franja inferior deja todo el menú legible, así que es lo más barato que vendemos, desde ${f.bannerOff} por minuto. Una columna lateral toma el tercio derecho. Un anuncio de pantalla completa apaga el tablero durante su turno, que es lo máximo que le pedimos a un negocio y lo máximo que paga un anunciante, hasta ${f.fullPeak} por minuto en hora pico. Un video corto va en ese espacio de pantalla completa y se cobra por reproducción en vez de por minuto, desde ${f.videoOff} por reproducción.`],
    ['¿Por qué el video se cobra por reproducción y no por minuto?', 'Porque un conteo de reproducciones es lo que el anunciante realmente compra, y es el número que podemos respaldar. Un anuncio de quince segundos se reprodujo o no. Cobrar por un tramo de tiempo sería promediar reproducciones que quizá no ocurrieron, y preferimos cobrar lo que podemos contar.'],
    ['¿Quién vende los anuncios?', 'AdBite coordina las colocaciones locales durante el piloto. Los dueños no tienen que manejar ventas ni perseguir pagos.'],
    ['¿Cuándo cobran los negocios?', 'Los pagos salen cada mes, y la fecha se confirma cuando un negocio entra al piloto. Cobras por lo que realmente se reprodujo, detallado por espacio, así que puedes ver qué horas y qué formatos generaron ingresos.'],
    ['¿Y si me preocupa la imagen de mi negocio?', 'Tú marcas el tono tanto como los anuncios. Dinos qué tipos de negocios van con el tuyo y ajustamos las colocaciones, y cualquier anuncio que prefieras no mostrar se puede posponer o rechazar de plano, sin deber explicaciones. Muchos negocios van más allá y presentan la pantalla con orgullo: una línea pequeña que diga “[tu negocio] apoya a los negocios locales” convierte el espacio de anuncios en algo que tus clientes leen como generosidad, no como publicidad.'],
    ['¿Qué tipos de anuncios se pueden mostrar?', 'Cuatro formatos: una franja inferior que deja el menú visible, una columna lateral a la derecha de un tablero ancho, un anuncio de pantalla completa por un turno de la rotación, y un video corto sin sonido en ese mismo espacio. Todos los formatos pasan por la aprobación del dueño, y los que ocupan más tablero le cuestan más al anunciante.'],
    ['¿Qué ven los anunciantes en los reportes?', 'Cuántas veces se reprodujo el anuncio y el total de minutos que estuvo en pantalla, separados en hora pico y hora baja, junto con los locales incluidos. Sin impresiones, sin estimaciones de alcance, sin números modelados.'],
    ['¿Me puedo registrar ahora mismo?', `Todavía no, y preferimos decirlo antes que pedirte la tarjeta. AdBite está funcionando en un número pequeño de pantallas en los condados de Salt Lake, Utah y Cache mientras afinamos el piloto, así que no estamos abriendo cuentas en volumen. Aun así puedes calcular una campaña y ver tu arte en un tablero real sin cuenta; cuando quieras dar el siguiente paso, el formulario llega directo a ${f.mail} y una persona lo responde.`],
  ],
};

export const FAQ = { en, es };
