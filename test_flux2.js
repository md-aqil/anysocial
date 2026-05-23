async function testFlux() {
    const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";
    const headers = {
        "Authorization": "Bearer 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",
        "Accept": "application/json",
    };
    const payload = { "prompt": "test image", "width": 768, "height": 1344, "seed": 0, "steps": 4 };
    const fluxResponse = await fetch(invokeUrl, { method: "post", body: JSON.stringify(payload), headers: { "Content-Type": "application/json", ...headers }});
    const response_body = await fluxResponse.json();
    console.log(response_body.artifacts[0].base64.substring(0, 50));
}
testFlux();
