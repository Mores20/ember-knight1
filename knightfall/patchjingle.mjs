import fs from "fs";
let a = fs.readFileSync("audio.js", "utf8");
a = a.replace("// Tiny WebAudio chiptune: square/triangle blips, noise hits, and a looping arpeggio.\nlet ac, out, muted = false, step = 0;",
"// Tiny WebAudio chiptune: square/triangle blips, noise hits, and a looping arpeggio.\n// The arpeggio is background only: a boss theme can switch it off so the recorded music has the room.\nlet ac, out, muted = false, step = 0, jingle = true;");
a = a.replace("function music() {\n  if (!ac || muted || document.hidden) return;",
"function music() {\n  if (!ac || muted || !jingle || document.hidden) return;");
a = a.replace("export const sfx = {",
"export const setJingle = on => { jingle = !!on; };\nexport const jingleOn = () => jingle;\nexport const sfx = {");
fs.writeFileSync("audio.js", a);

let m = fs.readFileSync("main.js", "utf8");
m = m.replace("function loadLevel(i) {\n  SND.stopMusic();",
"const stopMusic = () => { SND.stopMusic(); A.setJingle(true); };   // back to the chiptune when no boss owns the room\n\nfunction loadLevel(i) {\n  stopMusic();");
m = m.replaceAll("SND.stopMusic();", "stopMusic();");
m = m.replace("      SND.music(king ? 'kingMusic' : 'wardenMusic');",
"      SND.music(king ? 'kingMusic' : 'wardenMusic');\n      A.setJingle(!SND.playing());                              // the recorded theme takes over: no chiptune under it");
fs.writeFileSync("main.js", m);
console.log("patched");