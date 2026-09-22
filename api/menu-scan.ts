/* A photograph of the menu that is already on the wall.
 *
 *   POST /api/menu-scan   { image: <base64>, mediaType: 'image/jpeg' }
 *   -> { sections: [{ title, items: [{ name, note, price }] }], shopName, tagline }
 *
 * Typing a menu in is the single slowest thing about setting a board up, and
 * it is the thing standing between a shop owner and seeing their own board on
 * a screen. Every shop already has the menu written down somewhere — on a
 * chalkboard, on a laminated card, on a printout taped to the till — so the
 * fastest way in is a photograph of that.
 *
 * Nothing here writes to a board. The endpoint reads a picture and hands back
 * sections; the dashboard shows them, the shop edits what came out wrong, and
 * only then does any of it land in a row. An extraction that is 90% right and
 * reviewed beats one that is 100% right and trusted.
 *
 * The picture is not stored. It arrives in the request body, goes to the
 * model, and is gone when the function returns.
 */

import Anthropic from '@anthropic-ai/sdk';
import { json, lowerKeys, service, userFrom } from '../lib/server/db.js';

export const config = { runtime: 'nodejs' };

/* Roughly 6 MB of JPEG once base64 is unpacked. The browser downscales to
   1600px before it sends, so anything near this is a picture that did not go
   through the resizer. */
const MAX_BASE64 = 8 * 1024 * 1024;

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/* Named fields with descriptions rather than a bare shape: the description is
   the only place to say "keep the shop's own wording", and the model reads it
   as part of the instruction. `additionalProperties: false` throughout so a
   stray field cannot reach the editor as an item nobody typed. */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sections'],
  properties: {
    shopName: {
      type: 'string',
      description: "The shop's name if it is printed on the menu, otherwise an empty string.",
    },
    tagline: {
      type: 'string',
      description: 'A short line under the name if the menu carries one, otherwise an empty string.',
    },
    sections: {
      type: 'array',
      description: 'The headed groups of the menu, in the order they are printed.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'items'],
        properties: {
          title: { type: 'string', description: "The heading, in the menu's own wording." },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'note', 'price'],
              properties: {
                name: { type: 'string', description: "The dish, in the menu's own wording." },
                note: {
                  type: 'string',
                  description: 'The description printed under the dish, or an empty string if there is none.',
                },
                price: {
                  type: 'string',
                  description:
                    'The price as written, digits only, no currency sign. "12", "5.50" and "12 / 20" are all valid. Empty string if no price is printed.',
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const PROMPT = `You are reading a photograph of a restaurant's menu so its owner can put it on a screen.

Transcribe what is printed. Do not improve it, translate it, expand abbreviations, invent descriptions, or add items that are not there. A shop's own wording is the point: "Bao" stays "Bao".

- Keep the printed order of sections and of items within them.
- If the menu has no headings, put everything in one section and title it "Menu".
- Prices: digits only, no currency sign. A range or a two-size price stays as written ("12 / 20").
- If a word is genuinely unreadable, leave that item out rather than guessing at it.
- Ignore anything that is not menu: opening hours, the wifi password, an address, a QR code.`;

export async function POST(request: Request): Promise<Response> {
  const db = service();
  const user = await userFrom(request, db);
  if (!user) return json(401, { message: 'Sign in first' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return json(503, {
      message: 'Reading a menu from a photo is not switched on yet. Type your sections in for now.',
    });
  }

  let fields: Record<string, unknown>;
  try {
    fields = lowerKeys(await request.json());
  } catch {
    return json(400, { message: 'Unreadable request' });
  }

  const image = String(fields.image ?? '');
  const mediaType = String(fields.mediatype ?? 'image/jpeg');
  if (!image) return json(400, { message: 'No photo came through. Try again.' });
  if (!TYPES.has(mediaType)) return json(400, { message: 'Send a JPG, PNG or WEBP.' });
  if (image.length > MAX_BASE64) {
    return json(400, { message: 'That photo is too big. Take it again from a little further back.' });
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      /* A menu photograph is a transcription job, not a reasoning one, and a
         shop owner is standing in front of the screen waiting for it. */
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: image } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json(422, { message: 'That photo could not be read. Try one of just the menu.' });
    }

    const parsed = (response as { parsed_output?: unknown }).parsed_output ?? readJson(response);
    const sections = clean(parsed);
    if (sections.length === 0) {
      return json(422, {
        message: 'No menu was found in that photo. Get the whole board in frame, and keep it straight on.',
      });
    }

    const named = parsed as { shopName?: unknown; tagline?: unknown };
    return json(200, {
      sections,
      shopName: typeof named.shopName === 'string' ? named.shopName.slice(0, 80) : '',
      tagline: typeof named.tagline === 'string' ? named.tagline.slice(0, 120) : '',
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 429) return json(429, { message: 'Too many photos at once. Wait a moment and try again.' });
    return json(502, { message: 'The menu reader is not answering. Try again in a minute.' });
  }
}

/* `parsed_output` is the SDK's own validated read and is what this normally
   uses. The fallback is for the case where the response came back as plain
   text anyway — a schema is a strong constraint, not a guarantee. */
function readJson(response: { content: { type: string; text?: string }[] }): unknown {
  const text = response.content.find((block) => block.type === 'text')?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* The model's answer is data from outside, so it is checked like any other
   input rather than spread into a board. Caps are generous enough that no
   real menu hits them and tight enough that a runaway response cannot put
   ten thousand rows into an editor. */
type ScannedItem = { name: string; note: string; price: string };
type ScannedSection = { title: string; items: ScannedItem[] };

function clean(value: unknown): ScannedSection[] {
  const sections = (value as { sections?: unknown })?.sections;
  if (!Array.isArray(sections)) return [];
  return sections
    .slice(0, 12)
    .map((entry) => {
      const section = entry as { title?: unknown; items?: unknown };
      const items = Array.isArray(section.items) ? section.items : [];
      return {
        title: text(section.title, 60) || 'Menu',
        items: items
          .slice(0, 40)
          .map((raw) => {
            const item = raw as { name?: unknown; note?: unknown; price?: unknown };
            return {
              name: text(item.name, 80),
              note: text(item.note, 120),
              /* Anything that is not a digit, a separator or a decimal point
                 is not a price, whatever came back in the field. */
              price: text(item.price, 20).replace(/[^\d.,/\s-]/g, '').trim(),
            };
          })
          .filter((item) => item.name.length > 0),
      };
    })
    .filter((section) => section.items.length > 0);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
