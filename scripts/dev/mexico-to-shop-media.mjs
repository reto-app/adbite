/* The Mexico footage went in as campaigns because campaigns were the only
   thing that could reach a screen. It is not advertising: nobody booked it,
   nobody approved it, and nobody should be billed for it. This moves it to
   the shop that runs it and takes the campaigns away.
 *
 * The files themselves are already in the right shape and stay where they
 * are; only the row that owns them changes. */
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

const { data: shop } = await db.from('shops').select('id, name').eq('venue_id', 'thai-papaya').single();

/* The shop's own footage: scenery and food, not the two brand spots, which
   are real advertising and stay as campaigns. */
const { data: campaigns } = await db
  .from('campaigns')
  .select('id, name, creative_id, creatives(storage_path, poster_path, sha256, bytes, width, height, seconds, kind)')
  .like('name', 'Mexico %')
  .order('name');

console.log(`${shop.name}: ${campaigns.length} campaigns to move\n`);
let position = 0;
for (const campaign of campaigns) {
  const c = campaign.creatives;
  if (!c?.storage_path) {
    console.log(`  skip ${campaign.name} (no file)`);
    continue;
  }
  console.log(`  ${apply ? 'moving' : 'would move'} ${campaign.name}`);
  if (apply) {
    await db.from('shop_media').insert({
      shop_id: shop.id,
      name: campaign.name.replace(/^Mexico (scenery|food) · /, ''),
      kind: c.kind,
      storage_path: c.storage_path,
      poster_path: c.poster_path,
      sha256: c.sha256,
      bytes: c.bytes,
      width: c.width,
      height: c.height,
      seconds: c.seconds,
      ready: true,
      position: position,
    });
    await db.from('plays').delete().eq('campaign_id', campaign.id);
    await db.from('campaigns').delete().eq('id', campaign.id);
  }
  position += 1;
}

if (apply) {
  await db.from('render_jobs').insert({ kind: 'reel', shop_id: shop.id });
  console.log('\nqueued a reel rebuild');
} else {
  console.log('\ndry run. pass --apply to do it.');
}
