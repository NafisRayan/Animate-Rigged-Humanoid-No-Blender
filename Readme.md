# Merging Quaternius Characters with Universal Animation Libraries into a Single GLB

A complete, no-Blender pipeline for combining a rigged humanoid character with 80+ animations from the Quaternius Universal Animation Libraries into a **single `.glb` file** ready for Three.js / React Three Fiber.

---

## Table of Contents

1. [What this does](#what-this-does)
2. [Prerequisites](#prerequisites)
3. [Assets used](#assets-used)
4. [Final folder structure](#final-folder-structure)
5. [Step-by-step setup](#step-by-step-setup)
   - [Step 1 — Download assets](#step-1--download-assets)
   - [Step 2 — Create the merge workspace](#step-2--create-the-merge-workspace)
   - [Step 3 — Install Node.js dependencies](#step-3--install-nodejs-dependencies)
   - [Step 4 — Copy assets into the workspace](#step-4--copy-assets-into-the-workspace)
   - [Step 5 — Fix missing texture references](#step-5--fix-missing-texture-references)
   - [Step 6 — Create the merge script](#step-6--create-the-merge-script)
   - [Step 7 — Run the merge](#step-7--run-the-merge)
   - [Step 8 — Test the output GLBs](#step-8--test-the-output-glbs)
   - [Step 9 — (Optional) Compress for the web](#step-9--optional-compress-for-the-web)
6. [Using the GLBs in React Three Fiber](#using-the-glbs-in-react-three-fiber)
7. [Troubleshooting](#troubleshooting)
8. [Why this approach works](#why-this-approach-works)

---

## What this does

Combines:

- **1 rigged humanoid character** (glTF/GLB)
- **2 animation libraries** (UAL1 + UAL2, 80+ clips total)

...into **a single `.glb` file** containing:

```
human_male.glb
├── Mesh
├── Skeleton
├── Materials + Textures
├── Idle
├── Walk
├── Run
├── Jump
├── Attack
├── Dance
├── ... (80+ named animation clips)
```

The output works directly with:

```jsx
const { actions } = useAnimations(animations, scene)
actions['Walk'].play()
```

**No Blender. No manual retargeting. No paid tools.** Pure Node.js.

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 18+ | Runs the merge script |
| PowerShell | Windows 10/11 | For file copy commands (or adapt to bash/zsh) |
| Python (optional) | 3.x | Local web server for testing |
| A web browser | Chrome / Edge / Firefox | To test the merged GLBs |

Verify Node is installed:

```powershell
node --version
```

---

## Assets used

All assets are **free** and **CC0** (public domain) from [Quaternius](https://quaternius.com/).

### 1. Universal Base Characters [Standard]

Download: https://quaternius.itch.io/universal-base-characters

Contains:
- `Superhero_Male_FullBody.gltf` + `.bin`
- `Superhero_Female_FullBody.gltf` + `.bin`
- Texture PNGs

Use the **Godot - UE** folder (glTF format, not FBX).

### 2. Universal Animation Library (UAL1)

Download: https://quaternius.itch.io/universal-animation-library

Contains `UAL1_Standard.glb` in the `Unreal-Godot` folder.

### 3. Universal Animation Library 2 (UAL2)

Download: https://quaternius.itch.io/universal-animation-library-2

Contains `UAL2_Standard.glb` in the `Unreal-Godot` folder.

**Always use the `_Standard` variants, not `_RM` (Root Motion).** For game-controlled NPCs, you want in-place animations.

---

## Final folder structure

After completing the guide:

```
sim top/
├── merge/                          ← The build workspace
│   ├── node_modules/
│   ├── package.json
│   ├── merge.mjs                   ← The merge script
│   ├── Superhero_Male_FullBody.gltf
│   ├── Superhero_Male_FullBody.bin
│   ├── Superhero_Female_FullBody.gltf
│   ├── Superhero_Female_FullBody.bin
│   ├── T_*.png                     ← All textures
│   ├── UAL1_Standard.glb
│   ├── UAL2_Standard.glb
│   ├── human_male.glb              ← OUTPUT
│   └── human_female.glb            ← OUTPUT
│
└── test/                           ← The test viewer
    ├── test.html
    ├── human_male.glb              ← Copy of output
    └── human_female.glb            ← Copy of output
```

---

## Step-by-step setup

### Step 1 — Download assets

1. Download all three Quaternius packs (links above).
2. Extract them into `C:\Users\<YOU>\Downloads\sim top\`.
3. Verify the folder names match:
   - `Universal Base Characters[Standard]`
   - `Universal Animation Library[Standard]`
   - `Universal Animation Library 2[Standard]`

---

### Step 2 — Create the merge workspace

Open **PowerShell**:

```powershell
cd "C:\Users\<YOU>\Downloads\sim top"
mkdir merge
cd merge
```

---

### Step 3 — Install Node.js dependencies

We use [`@gltf-transform/core`](https://gltf-transform.dev/) — a pure-Node glTF library with no native dependencies.

```powershell
npm init -y
npm install @gltf-transform/core @gltf-transform/extensions
```

This creates `package.json`, `package-lock.json`, and `node_modules/`.

---

### Step 4 — Copy assets into the workspace

Quaternius puts folders with `[` and `]` in their names, which PowerShell treats as **wildcards**. Use `-LiteralPath` to copy safely.

```powershell
$merge   = "C:\Users\<YOU>\Downloads\sim top\merge"
$baseCh  = "C:\Users\<YOU>\Downloads\sim top\Universal Base Characters[Standard]\Universal Base Characters[Standard]\Base Characters\Godot - UE"
$ual1    = "C:\Users\<YOU>\Downloads\sim top\Universal Animation Library[Standard]\Universal Animation Library[Standard]\Unreal-Godot"
$ual2    = "C:\Users\<YOU>\Downloads\sim top\Universal Animation Library 2[Standard]\Universal Animation Library 2[Standard]\Unreal-Godot"

# Character + textures
Get-ChildItem -LiteralPath $baseCh -File | Copy-Item -Destination $merge -Force

# Animation libraries
Copy-Item -LiteralPath (Join-Path $ual1 "UAL1_Standard.glb") -Destination $merge -Force
Copy-Item -LiteralPath (Join-Path $ual2 "UAL2_Standard.glb") -Destination $merge -Force
```

Verify:

```powershell
Get-ChildItem -LiteralPath $merge -File | Select-Object Name, Length
```

You should see both `.gltf` files, both `.bin` files, ~15 PNGs, and the two `UAL*_Standard.glb` files.

---

### Step 5 — Fix missing texture references

**Quaternius ships buggy glTF files.** The `.gltf` references textures with a `_png` suffix (e.g. `T_Hair_1_Normal_png.png`), but only the non-suffixed versions exist on disk.

The merge will fail with:

```
❌ Merge failed: Error: ENOENT: no such file or directory, open '...\T_Hair_1_Normal_png.png'
```

Fix by auto-copying the missing files from their correctly-named source:

```powershell
$merge = "C:\Users\<YOU>\Downloads\sim top\merge"
$gltfs = @("Superhero_Male_FullBody.gltf", "Superhero_Female_FullBody.gltf")

foreach ($g in $gltfs) {
    $path = Join-Path $merge $g
    Write-Host "`nChecking $g ..." -ForegroundColor Cyan

    $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    foreach ($img in $json.images) {
        $uri = $img.uri
        if (-not $uri) { continue }

        $full = Join-Path $merge $uri
        if (Test-Path -LiteralPath $full) { continue }

        # T_X_png.png -> T_X.png
        $alt = $uri -replace '_png(\.[^.]+)$', '$1'
        $altFull = Join-Path $merge $alt

        if (Test-Path -LiteralPath $altFull) {
            Copy-Item -LiteralPath $altFull -Destination $full -Force
            Write-Host "  ✓ Created $uri  (from $alt)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ MISSING: $uri" -ForegroundColor Red
        }
    }
}
```

Expected output:

```
Checking Superhero_Male_FullBody.gltf ...
  ✓ Created T_Hair_1_Normal_png.png  (from T_Hair_1_Normal.png)
  ✓ Created T_Eye_Normal_png.png  (from T_Eye_Normal.png)
Checking Superhero_Female_FullBody.gltf ...
```

---

### Step 6 — Create the merge script

Save this as `merge.mjs` inside the `merge` folder:

```js
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

    // Map animation node -> character node (by name)
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
  console.error('Usage: node merge.mjs <character.gltf> <output.glb> <anim1.glb> <anim2.glb> ...');
  process.exit(1);
}

mergeCharacter(characterPath, animPaths, outputPath).catch((err) => {
  console.error('❌ Merge failed:', err);
  process.exit(1);
});
```

---

### Step 7 — Run the merge

From the `merge` folder:

```powershell
node merge.mjs Superhero_Male_FullBody.gltf human_male.glb UAL1_Standard.glb UAL2_Standard.glb
node merge.mjs Superhero_Female_FullBody.gltf human_female.glb UAL1_Standard.glb UAL2_Standard.glb
```

Expected output:

```
📖 Reading character: Superhero_Male_FullBody.gltf
   Character has 69 named nodes

🎬 Reading animation library: UAL1_Standard.glb
   Matched 66 nodes (1 unmatched)
   Merged 43 clips from this library

🎬 Reading animation library: UAL2_Standard.glb
   Matched 66 nodes (1 unmatched)
   Merged 43 clips from this library

💾 Writing human_male.glb (86 total clips)...
✅ Done: human_male.glb (33.56 MB)
```

The `1 unmatched` node is expected — it's a wrapper armature whose name differs between the character and animation rigs. All actual bones transfer correctly.

**Results per character:**
- 86 animation clips
- ~33 MB uncompressed (mostly PNG textures)
- Compresses to ~4–8 MB with WebP (see Step 9)

---

### Step 8 — Test the output GLBs

Create a test folder:

```powershell
mkdir "C:\Users\<YOU>\Downloads\sim top\test"
cd "C:\Users\<YOU>\Downloads\sim top\test"
Copy-Item -LiteralPath "..\merge\human_male.glb" .
Copy-Item -LiteralPath "..\merge\human_female.glb" .
```

Save this as `test.html` in the `test` folder:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GLB Animation Tester</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; font-family: sans-serif; }
    #panel {
      position: fixed; top: 0; left: 0; width: 320px; height: 100%;
      background: rgba(20,20,20,0.92); color: #eee; padding: 1rem;
      overflow-y: auto; box-sizing: border-box; z-index: 10;
    }
    #panel h2 { margin: 0 0 0.5rem; font-size: 1rem; color: #8ef; }
    #panel input[type=text] { width: 100%; padding: 0.4rem; margin-bottom: 0.75rem; box-sizing: border-box; font-family: monospace; }
    #list { display: flex; flex-direction: column; gap: 2px; }
    .anim { padding: 0.4rem 0.6rem; cursor: pointer; border-radius: 4px; font-size: 0.85rem; background: #2a2a2a; color: #ddd; }
    .anim:hover { background: #3a3a3a; }
    .anim.active { background: #4a7; color: #000; font-weight: bold; }
    #info { font-size: 0.8rem; color: #aaa; margin-bottom: 0.75rem; }
    #status { font-size: 0.75rem; color: #8ef; margin-top: 1rem; font-family: monospace; white-space: pre-wrap; }
    #fileRow { display: flex; gap: 4px; margin-bottom: 0.75rem; }
    #fileRow button { flex: 1; padding: 0.4rem; cursor: pointer; }
  </style>
</head>
<body>
  <div id="panel">
    <h2>GLB Animation Tester</h2>
    <div id="fileRow">
      <button id="btnMale">human_male.glb</button>
      <button id="btnFemale">human_female.glb</button>
    </div>
    <div id="info">—</div>
    <input type="text" id="search" placeholder="Filter animations...">
    <div id="list"></div>
    <div id="status">Ready.</div>
  </div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x303030);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 1.6, 3.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    scene.add(new THREE.GridHelper(10, 20, 0x666666, 0x444444));

    const loader = new GLTFLoader();
    let currentRoot = null;
    let mixer = null;
    let actions = {};
    let activeAction = null;
    const listEl = document.getElementById('list');
    const infoEl = document.getElementById('info');
    const statusEl = document.getElementById('status');

    function log(msg) { statusEl.textContent = msg; console.log(msg); }

    function disposeCurrent() {
      if (currentRoot) {
        scene.remove(currentRoot);
        currentRoot.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(m => {
              for (const k in m) if (m[k]?.isTexture) m[k].dispose();
              m.dispose();
            });
          }
        });
      }
      mixer = null; actions = {}; activeAction = null;
    }

    function playAnimation(name) {
      if (!actions[name]) return;
      if (activeAction) activeAction.fadeOut(0.2);
      activeAction = actions[name];
      activeAction.reset().fadeIn(0.2).play();
      document.querySelectorAll('.anim').forEach(el => {
        el.classList.toggle('active', el.dataset.name === name);
      });
      log(`Playing: ${name}  (duration ${activeAction.getClip().duration.toFixed(2)}s)`);
    }

    function buildList(names) {
      listEl.innerHTML = '';
      names.forEach(name => {
        const div = document.createElement('div');
        div.className = 'anim';
        div.textContent = name;
        div.dataset.name = name;
        div.onclick = () => playAnimation(name);
        listEl.appendChild(div);
      });
    }

    document.getElementById('search').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.anim').forEach(el => {
        el.style.display = el.dataset.name.toLowerCase().includes(q) ? '' : 'none';
      });
    };

    function loadGLB(url) {
      log(`Loading ${url} ...`);
      disposeCurrent();
      listEl.innerHTML = '';
      infoEl.textContent = 'Loading...';

      loader.load(url, (gltf) => {
        currentRoot = gltf.scene;
        scene.add(currentRoot);

        const box = new THREE.Box3().setFromObject(currentRoot);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
        camera.position.set(center.x, center.y + size.y * 0.3, center.z + Math.max(size.x, size.y) * 2);
        controls.update();

        mixer = new THREE.AnimationMixer(currentRoot);
        actions = {};
        gltf.animations.forEach(clip => { actions[clip.name] = mixer.clipAction(clip); });

        const names = gltf.animations.map(a => a.name).sort();
        buildList(names);
        infoEl.textContent = `${names.length} animations`;
        log(`Loaded ${url} — ${names.length} animations`);
        if (names.length) playAnimation(names[0]);
      }, (progress) => {
        if (progress.total) {
          const pct = ((progress.loaded / progress.total) * 100).toFixed(0);
          log(`Loading ${url} ... ${pct}%`);
        }
      }, (err) => { log(`Failed: ${err.message}`); });
    }

    document.getElementById('btnMale').onclick = () => loadGLB('./human_male.glb');
    document.getElementById('btnFemale').onclick = () => loadGLB('./human_female.glb');

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (mixer) mixer.update(clock.getDelta());
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    loadGLB('./human_male.glb');
  </script>
</body>
</html>
```

Serve the folder:

```powershell
cd "C:\Users\<YOU>\Downloads\sim top\test"
python -m http.server 8000
```

Open `http://localhost:8000/test.html` in your browser.

**What to verify:**
- Panel shows `86 animations`
- Character has visible skin/hair textures (not pink)
- Clicking any animation name plays it
- Both models load — toggle with the top buttons
- Search box filters animation names

---

### Step 9 — (Optional) Compress for the web

The 33 MB output is dominated by uncompressed PNG textures. For a web app, compress to WebP:

```powershell
cd "C:\Users\<YOU>\Downloads\sim top\merge"
npm install --save-dev @gltf-transform/cli

npx gltf-transform webp human_male.glb human_male_optimized.glb --quality 85
npx gltf-transform webp human_female.glb human_female_optimized.glb --quality 85
```

Expected result: **~4–8 MB** per file, no visible quality loss.

For even smaller files (with a Draco decoder requirement in the browser):

```powershell
npx gltf-transform optimize human_male.glb human_male_optimized.glb --compress draco --texture-compress webp
```

---

## Using the GLBs in React Three Fiber

```jsx
import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect } from 'react'

export function Character({ animationName = 'Idle' }) {
  const { scene, animations } = useGLTF('./models/human_male.glb')
  const { actions } = useAnimations(animations, scene)

  useEffect(() => {
    // List every clip (useful during development)
    console.log('Total clips:', animations.length)
    console.log('Names:', animations.map(a => a.name).sort())
  }, [animations])

  useEffect(() => {
    const action = actions[animationName]
    if (!action) return
    action.reset().fadeIn(0.2).play()
    return () => { action.fadeOut(0.2) }
  }, [animationName, actions])

  return <primitive object={scene} />
}
```

Preload for faster startup:

```jsx
useGLTF.preload('./models/human_male.glb')
```

---

## Troubleshooting

### `ENOENT: no such file or directory` during merge

A texture referenced by the `.gltf` doesn't exist. Re-run the PowerShell fix in [Step 5](#step-5--fix-missing-texture-references).

### `Copy-Item : Cannot find path ...` with `[Standard]` in the path

PowerShell treats `[` `]` as wildcards. Use `-LiteralPath`:

```powershell
Copy-Item -LiteralPath "C:\path\with[brackets]\file.glb" -Destination .
```

### Animations load but character doesn't move

The animation skeleton bone names don't match the character skeleton. Check the merge output for `Matched X nodes (Y unmatched)`. If `unmatched` is large (e.g. 60+), the rigs are incompatible and you'd need retargeting (Blender or the Three.js `retargetClip` utility).

For Quaternius Base Characters + UAL, `unmatched` is `1` — that's just a wrapper node and is safe to ignore.

### Model appears pink or untextured

A texture failed to load. Check the browser console — likely a CORS issue (you opened `test.html` via `file://` instead of a local server) or a missing PNG.

### Model is invisible

Try scrolling out. Some rigs export with extreme scale. If it's still gone, check the browser console for load errors.

### `useAnimations` returns undefined actions

`animations` array is empty. Verify the GLB has clips by opening it in the test viewer.

---

## Why this approach works

Quaternius designed the **Universal Base Characters** and **Universal Animation Library** packs to share the exact same skeleton. Bone names like `Hips`, `LeftUpperArm`, `Spine` match 1:1 across all rigs.

That means:

- **No retargeting needed.** Animation channels reference nodes by name, and every name exists on the character.
- **No Blender needed.** gltf-transform can splice animation channels directly into the character's glTF graph.
- **One file per character.** Mesh, skeleton, textures, and all 86 animations live in a single `.glb`.

Total pipeline cost: **~15 minutes of setup**, then **two commands per character**.

---

## Rebuild from scratch (TL;DR)

```powershell
cd "C:\Users\<YOU>\Downloads\sim top"
mkdir merge; cd merge
npm init -y
npm install @gltf-transform/core @gltf-transform/extensions

# Copy assets (see Step 4)
# Fix textures (see Step 5)

# Paste merge.mjs (see Step 6)

node merge.mjs Superhero_Male_FullBody.gltf human_male.glb UAL1_Standard.glb UAL2_Standard.glb
node merge.mjs Superhero_Female_FullBody.gltf human_female.glb UAL1_Standard.glb UAL2_Standard.glb
```

Done. Two `.glb` files, 86 animations each, ready for Three.js.

---

## Credits

- **Models & animations**: [Quaternius](https://quaternius.com/) — CC0
- **glTF tooling**: [gltf-transform](https://gltf-transform.dev/) — MIT
- **3D runtime**: [Three.js](https://threejs.org/) — MIT
