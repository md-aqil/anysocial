const fs = require('fs');
const path = require('path');

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
        { id: 'cinematic', prompt: 'Cinematic 3D style, epic lighting, highly detailed, dramatic shadows, vibrant colors, a majestic ancient castle on a mountain' },
        { id: 'watercolor', prompt: 'Watercolor painting style, soft brush strokes, pastel colors, artistic, dreamy landscape' },
        { id: 'digital-art', prompt: 'Digital Illustration style, clean lines, vibrant shading, modern artstation trending, a futuristic city' },
        { id: 'hyper-realistic', prompt: 'Hyper-realistic photography, 8k resolution, photorealistic, cinematic lighting, a beautiful dense forest' },
        { id: 'anime', prompt: 'Anime Style, Studio Ghibli, beautiful sky, vibrant colors, hand-drawn 2D animation feel, a peaceful village' },
        { id: 'fantasy', prompt: 'Dark Fantasy style, gothic, moody lighting, mystical, epic, an ancient dragon cave' },
        { id: 'cyberpunk', prompt: 'Cyberpunk style, neon lights, futuristic, rainy night, synthwave colors, sci-fi city street' },
        { id: 'pixel-art', prompt: 'Pixel Art style, 16-bit retro game aesthetic, sharp pixels, vibrant colors, a magical sword in a stone' }
    ];

    for (const style of styles) {
        await generateStyle(style.id, style.prompt);
    }
}

main();
