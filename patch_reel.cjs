const fs = require('fs');
const path = '/Users/mdaqil/Documents/anysocial/src/workers/reel-worker.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace the languagePrompt definition
code = code.replace(
  /let languagePrompt = `Language: \$\{series\.language \|\| 'English'\}\. Write the script ONLY in \$\{series\.language \|\| 'English'\}\.`;[\s\S]*?Both scripts must say exactly the same thing\.`;\n\s*}/,
  `let languagePrompt = \`Language: \${series.language || 'English'}. Write the script ONLY in \${series.language || 'English'}.\`;
      if (series.language === 'Hindi') {
        languagePrompt = \`Language: Hindi. CRITICAL: You MUST write the entire script in the Devanagari script (हिंदी लिपि). DO NOT write in Hinglish (Latin alphabet). Use natural conversational Hindi, but the text itself must be strictly in Devanagari characters so the text-to-speech engine can pronounce it perfectly.\`;
      }`
);

// Replace the JSON structure prompt
code = code.replace(
  /Output ONLY valid JSON: \n\{\n  "script": "\.\.\.", \n  "script_tts": "\.\.\.", \n  "audio_prompt": "Describe the perfect cinematic background music to match the emotional tone and pacing of this story in detail\. Example: 'Deep, atmospheric cinematic ambient synth pads with a slow, emotional buildup\.'"\n\}/,
  `Output ONLY valid JSON: 
{
  "script": "...", 
  "audio_prompt": "Describe the perfect cinematic background music to match the emotional tone and pacing of this story."
}`
);

// Replace the parsed extraction
code = code.replace(
  /scriptTts = parsed\.script_tts \? extractScriptText\(parsed\.script_tts\) : script;/,
  `scriptTts = script;`
);

fs.writeFileSync(path, code);
console.log('Patched reel-worker.ts');
