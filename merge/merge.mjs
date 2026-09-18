import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'node:fs/promises';

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

// ---- helpers -----------------------------------------------------------
function copyAccessor(targetDoc, srcAccessor) {
  const srcArray = srcAccessor.getArray();
  const newAcc = targetDoc
    .createAccessor()
    .setType(srcAccessor.getType())
    .setNormalized(srcAccessor.getNormalized());
  if (srcArray) newAcc.setArray(srcArray.slice());
  return newAcc;
}

// ---- main merge --------------------------------------------------------
async function mergeCharacter(characterPath, animPaths, outputPath) {
  console.log(`\n📖 Reading character: ${characterPath}`);
  const charDoc = await io.read(characterPath);
  const charRoot = charDoc.getRoot();

  // Build name -> node map for the character
  const charNodesByName = new Map();
  for (const node of charRoot.listNodes()) {
    const name = node.getName();
    if (name) charNodesByName.set(name, node);
  }
  console.log(`   Character has ${charNodesByName.size} named nodes`);

  let totalClips = 0;

  for (const animPath of animPaths) {
    console.log(`\n🎬 Reading animation library: ${animPath}`);
    const animDoc = await io.read(animPath);
    const animRoot = animDoc.getRoot();

    // Build map: animation node -> character node (by name)
    const nodeMap = new Map();
    let unmatched = 0;
    for (const node of animRoot.listNodes()) {
      const name = node.getName();
      if (!name) continue;
      if (charNodesByName.has(name)) {
        nodeMap.set(node, charNodesByName.get(name));
      } else {
        unmatched++;
      }
    }
    console.log(`   Matched ${nodeMap.size} nodes (${unmatched} unmatched)`);

    let clipCount = 0;
    for (const anim of animRoot.listAnimations()) {
      const newAnim = charDoc.createAnimation(anim.getName());

      for (const channel of anim.listChannels()) {
        const targetNode = channel.getTargetNode();
        const mappedNode = nodeMap.get(targetNode);
        if (!mappedNode) continue;

        const srcSampler = channel.getSampler();
        if (!srcSampler) continue;

        const srcInput = srcSampler.getInput();
        const srcOutput = srcSampler.getOutput();
        if (!srcInput || !srcOutput) continue;

        const newInput = copyAccessor(charDoc, srcInput);
        const newOutput = copyAccessor(charDoc, srcOutput);

        const newSampler = charDoc
          .createAnimationSampler()
          .setInput(newInput)
          .setOutput(newOutput)
          .setInterpolation(srcSampler.getInterpolation());

        const newChannel = charDoc
          .createAnimationChannel()
          .setTargetNode(mappedNode)
          .setTargetPath(channel.getTargetPath())
          .setSampler(newSampler);

        newAnim.addSampler(newSampler).addChannel(newChannel);
      }

      clipCount++;
      totalClips++;
    }
    console.log(`   Merged ${clipCount} clips from this library`);
  }

  console.log(`\n💾 Writing ${outputPath} (${totalClips} total clips)...`);
  const glb = await io.writeBinary(charDoc);
  await fs.writeFile(outputPath, glb);
  const sizeMB = (glb.byteLength / 1024 / 1024).toFixed(2);
  console.log(`✅ Done: ${outputPath} (${sizeMB} MB)`);
}

// ---- CLI ---------------------------------------------------------------
const [, , characterPath, outputPath, ...animPaths] = process.argv;

if (!characterPath || !outputPath || animPaths.length === 0) {
  console.error(
    'Usage: node merge.mjs <character.gltf> <output.glb> <anim1.glb> <anim2.glb> ...'
  );
  process.exit(1);
}

mergeCharacter(characterPath, animPaths, outputPath).catch((err) => {
  console.error('❌ Merge failed:', err);
  process.exit(1);
});