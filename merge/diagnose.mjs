import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

async function diagnose(path) {
  const doc = await io.read(path);
  const root = doc.getRoot();
  const anims = root.listAnimations();

  console.log(`\n📦 ${path}`);
  console.log(`   Animations: ${anims.length}`);

  let totalChannels = 0;
  let emptyAnims = 0;
  const perAnim = [];

  for (const anim of anims) {
    const channels = anim.listChannels();
    totalChannels += channels.length;
    if (channels.length === 0) emptyAnims++;
    perAnim.push({ name: anim.getName(), channels: channels.length });
  }

  console.log(`   Total channels: ${totalChannels}`);
  console.log(`   Empty animations (0 channels): ${emptyAnims}`);

  // Show the 10 smallest (probably broken) animations
  perAnim.sort((a, b) => a.channels - b.channels);
  console.log(`\n   Smallest 10 animations:`);
  perAnim.slice(0, 10).forEach(a => {
    console.log(`     ${a.name.padEnd(40)} ${a.channels} channels`);
  });

  // Show the 10 largest
  perAnim.sort((a, b) => b.channels - a.channels);
  console.log(`\n   Largest 10 animations:`);
  perAnim.slice(0, 10).forEach(a => {
    console.log(`     ${a.name.padEnd(40)} ${a.channels} channels`);
  });
}

await diagnose('./human_male.glb');
await diagnose('./UAL1_Standard.glb');
await diagnose('./UAL2_Standard.glb');