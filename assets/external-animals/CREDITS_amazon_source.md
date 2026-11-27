# Wildlife models — credits and licences

Downloaded from Sketchfab; prepared for the viewer by `prepare_animals.mjs`
(simplified, textures shrunk, the dolphin recoloured) into
`tiles/lib/animals/<name>.glb`. Every licence below requires crediting the
author wherever the work is shown; all but the sloth forbid commercial use.

| File | Model | Author | Licence |
|---|---|---|---|
| capybara.glb | [Capybara](https://sketchfab.com/3d-models/capybara-d1f23786f9fa49038d8148c5f620f3a4) | kenchoo | CC BY-NC-ND 4.0 — used unmodified (scaled at runtime only) |
| egret.glb | [Egret](https://sketchfab.com/3d-models/egret-87bc9323cafd412ba3e04673013dbd28) | kenchoo | CC BY-NC-SA 4.0 — textures resized |
| caiman.glb (mesh) | [Smooth-Fronted Caiman (NHMW-ZOO-HS-31557)](https://sketchfab.com/3d-models/smooth-fronted-caiman-nhmw-zoo-hs-31557-bb103370007f4635b0feb9d4d1dfdad1) | Natural History Museum Vienna | CC BY-NC 4.0 — simplified, re-skinned on the skeleton below (`build_caimans.mjs`) |
| blackCaiman.glb (mesh) | [Black Caiman (NHMW-ZOO-HS-31559)](https://sketchfab.com/3d-models/black-caiman-nhmw-zoo-hs-31559-60234b94b7d34c538dad2a9ac6ca03ae) | Natural History Museum Vienna | CC BY-NC 4.0 — simplified, re-skinned on the skeleton below (`build_caimans.mjs`) |
| caiman.glb, blackCaiman.glb (skeleton, clips) | [Alligator with Animations (Granny 3)](https://sketchfab.com/3d-models/alligator-with-animations-granny-3-dd025f034c2b4ff78bef789a46c513ac) | hiewr43t4 | Sketchfab Standard — its skeleton fitted to each scan, its idle and walk clips re-made on it (the walk also as a swim); its own mesh and textures not used |
| sloth.glb | [Sloth with Arms Raised](https://sketchfab.com/3d-models/sloth-with-arms-raised-3ee1b60007f741139a98c751fe5ce150) | iRahulRajput | CC BY 4.0 — simplified |
| boto.glb | [Model 61A - Bottlenose Dolphin](https://sketchfab.com/3d-models/model-61a-bottlenose-dolphin-2ec20f15b08c4c2fb16e4df5d837b893) | DigitalLife3D | CC BY-NC 4.0 — skin recoloured pink as a stand-in for the boto |
| tambaqui.glb | [Bream Fish (Dorade Royale)](https://sketchfab.com/3d-models/bream-fish-dorade-royale-a3d0e1a597794a9bb74739a13cfc8b77) | BlueMesh | CC BY 4.0 — skin recoloured to the tambaqui's dark olive (a stand-in) |
| piaba.glb | [Guppy Fish](https://sketchfab.com/3d-models/guppy-fish-21e14e4b961e406385539f79eacdb1dc) | BlueMesh | CC BY 4.0 — a stand-in for small schooling fish |
| tern.glb | [Lowpoly birds](https://sketchfab.com/3d-models/lowpoly-birds-42866166bff446fb9e089137cc340355) (one bird taken out of the pack) | Loïc Norgeot | CC BY-SA 4.0 — also drawn tinted as the parrots, parakeets and the soaring vulture |
| pirarucu.glb (mesh) | [Pirarucu](https://sketchfab.com/3d-models/pirarucu-93f968a318cd41d497198b0c47c1a886) | jriver | CC BY 4.0 — simplified (100k -> 9k triangles), textures shrunk, re-skinned on the skeleton below (`build_pirarucu.mjs`) |
| pirarucu.glb (skeleton, fin clip) | [Pirarucu](https://sketchfab.com/3d-models/pirarucu-1ef2dc78722449d1abeedb6a3e747ab6) | vezenquanndo | CC BY 4.0 — its spine joints moved down the body and their tracks taken out (the viewer bends the spine); its own mesh not used |
| jaguar.glb ('Run', 'Jump', 'Idle' clips) | [Smilodon Game Animations](https://sketchfab.com/3d-models/smilodon-game-animations-a9cdecb78b4a479488b3dd9e523b4ea0) | BPoole | CC BY 4.0 — motion only, retargeted onto the jaguar's rig by the jaguar-seasons collaborator (their SOURCES.md, OneDrive assets 2026-10-30), copied into our jaguar.glb by `merge_run_clips.mjs`; the smilodon's mesh not used. 'Run' is the followed jaguar's gallop at 2x / 3x (intro/gait.js) |
| jaguar.glb ('Look around (Ear.Rodriguez)' clip) | [jaguar](https://sketchfab.com/3d-models/jaguar-91c61c329d2a4668816f81f08dfcd492) | Ear.Rodriguez | CC BY 4.0 — motion only: the model's own clip ('skeleton #1 … All Animations', 14.7 s: standing, looking around, a long stretch-bow) retargeted onto the jaguar's rig (viewer/lab/retarget.js, with jagCompare.js's rig setup), its tracks appended to our jaguar.glb by `append_clip.mjs`; Ear.Rodriguez's mesh not used. The followed jaguar's idle while the walk is paused (intro/follow.js) |
| jaguar_er/ (scene.gltf as downloaded) | [jaguar](https://sketchfab.com/3d-models/jaguar-91c61c329d2a4668816f81f08dfcd492) | Ear.Rodriguez | CC BY 4.0 — the file untouched; the other models' clips retargeted onto it at run time (viewer/lab/retarget.js, jagCompare.js). Its black coat `jaguar_er/black_coat*.jpg` = `jaguar_black*.jpg` flipped vertically (its coat texture is the basic one stored upside down). Lab only so far (jag-lab.html "Comparar") |
| jaguar.glb ('Drink (cheetah)' clip); (lab) cheetah/ | [Cheetah](https://sketchfab.com/3d-models/cheetah-8d3ba32a2ff34acc9b5c590bc06cb561) | planeta-elefante | CC BY 4.0 — motion only: its 'CheetahDrinking' (5.8 s: head down, lapping, head up) retargeted onto the jaguar's rig (viewer/lab/retarget.js, with jagCompare.js's rig setup: each one's Idle frame 0 the shared stance, cheetahRetarget.js's bone map), the way down and up slowed, the jaw's opening x1.35, and the jaguar's own tongue lapping laid over it (Ear.Rodriguez's lick from the 'Look around (Ear.Rodriguez)' clip above, one per opening of the jaw: the cheetah rig has no tongue); baked by viewer/_bakeDrink.html + _bakeDrink.mjs, appended by `append_clip.mjs`; the cheetah's mesh not used. The followed jaguar drinking at a water's edge (intro/follow.js). In the lab its 14 clips the jaguar lacks are retargeted at run time (viewer/lab/cheetahRetarget.js) |
| jabuti.glb | [Tortoise Realistic Stylized Animal Character](https://sketchfab.com/3d-models/tortoise-realistic-stylized-animal-character-f113a5c650364565aa4bc03d7312abc5) | Pigcraft | CC BY 4.0 — simplified, cut into shell, head and legs (animated by turtleGait.js), recoloured as the jabuti-tinga (prepare_turtles.mjs) |
| riverTurtle.glb, tracaja.glb | [Model 50A - Hawksbill Sea Turtle](https://sketchfab.com/3d-models/model-50a-hawksbill-sea-turtle-e69458ef8176402d919df421e444da86) | DigitalLife3D | CC BY-NC 4.0 — tortoiseshell recoloured to a plain Podocnemis olive-grey (the tracajá's yellow head spots painted on); flippers shortened at run time — a stand-in for the Amazon river turtles |

Not used: the tucunaré ("Fish", Yimit), the anhinga, heron and black vulture
of the birds pack — static models, taken out (no animation); the goldfish (Jikin, Tosakin — not Amazonian), the guppy ♀ by
NestaEric (a duplicate of the small fish), the tropical reef-fish school.

Note: the egret's ShareAlike term means a redistributed modified file must
keep CC BY-NC-SA; the capybara's NoDerivatives term is why its file is
shipped exactly as downloaded.

The caimans: the two NHMW scans as `prepare_animals.mjs` simplified them
(kept static in `caiman_scans/`) are each put on the alligator's skeleton
(`alligator_granny3/`: its scene.gltf, scene.bin and licence) by
`build_caimans.mjs` into `caiman_combined/`, `blackCaiman_combined/`, which
`prepare_animals.mjs` packs. Credit line: "Alligator with Animations
(Granny 3)" (https://sketchfab.com/3d-models/alligator-with-animations-granny-3-dd025f034c2b4ff78bef789a46c513ac)
by hiewr43t4 (https://sketchfab.com/hiewr43t4), Sketchfab Standard licence
(https://sketchfab.com/licenses).

The pirarucu combines two downloads (sources kept unzipped next to this file:
`pirarucu_jriver/`, `pirarucu_vezenquanndo/`): `build_pirarucu.mjs` puts
jriver's detailed mesh on vezenquanndo's swimming skeleton (weights taken
from the nearest point of vezenquanndo's mesh, the spine re-weighted) into
`pirarucu_combined/`, which `prepare_animals.mjs` packs. Credit lines, as the
authors ask:
- This work is based on "Pirarucu" (https://sketchfab.com/3d-models/pirarucu-93f968a318cd41d497198b0c47c1a886) by jriver (https://sketchfab.com/jriver1) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
- This work is based on "Pirarucu" (https://sketchfab.com/3d-models/pirarucu-1ef2dc78722449d1abeedb6a3e747ab6) by vezenquanndo (https://sketchfab.com/rafiteixeiradeoliveira) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
