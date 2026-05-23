import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateStyle(styleName, promptText) {
    const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";
    const headers = {
        "Authorization": "Bearer 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",
        "Accept": "application/json",
        "Content-Type": "application/json"
    };

    const payload = {
        "prompt": promptText,
        "width": 768,
        "height": 1344,
        "seed": 42,
        "steps": 4
    };

    try {
        console.log(`Generating ${styleName}...`);
        const res = await fetch(invokeUrl, {
            method: "post",
            body: JSON.stringify(payload),
            headers: headers
        });

        const body = await res.json();
        const b64 = body.image || (body.artifacts && body.artifacts[0].base64) || (body.data && body.data[0].b64_json) || body.b64_json;
        if (!b64) {
            console.error(`Failed to generate ${styleName}`, body);
            return;
        }

        const outDir = path.join(__dirname, 'frontend', 'public', 'uploads', 'styles');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const cleanB64 = typeof b64 === 'string' ? b64.replace(/^data:image\/\w+;base64,/, "") : "";
        const outPath = path.join(outDir, `${styleName}.jpg`);
        fs.writeFileSync(outPath, Buffer.from(cleanB64, 'base64'));
        console.log(`Saved ${outPath}`);
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    const styles = [
        { id: 'vintage-vhs', prompt: '1990s VHS camcorder footage style, VHS tracking lines, lo-fi, retro aesthetic, an eerie empty hallway' },
        { id: 'claymation', prompt: 'Claymation style, stop motion animation, highly detailed clay textures, miniature set, Aardman style, a cute dog in a tiny room' },
        { id: 'oil-painting', prompt: 'Classic Renaissance oil painting, masterpiece, heavy brush strokes, museum quality, a majestic landscape' },
        { id: 'pop-art', prompt: 'Pop Art comic book style, halftone dots, bold black outlines, flat vibrant colors, an explosion in space' },
        { id: 'origami', prompt: 'Paper Origami style, folded paper art, intricate, macro photography, beautiful lighting, a paper crane flying over a paper city' },
        { id: 'gothic', prompt: 'Gothic Noir, black and white, extreme high contrast, sharp shadows, dramatic lighting, Frank Miller style, a dark rainy gothic cathedral' }
    ];

    for (const style of styles) {
        await generateStyle(style.id, style.prompt);
    }
}

main();
