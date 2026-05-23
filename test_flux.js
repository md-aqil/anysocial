async function testFlux() {
    const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";
    const headers = {
        "Authorization": "Bearer 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",
        "Accept": "application/json",
    };

    const payload = {
        "prompt": "test image",
        "width": 768,
        "height": 1344,
        "seed": 0,
        "steps": 4
    };

    try {
        const fluxResponse = await fetch(invokeUrl, {
            method: "post",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json", ...headers }
        });

        if (fluxResponse.status != 200) {
            const errBody = await fluxResponse.text();
            console.log("NVIDIA invocation failed: " + fluxResponse.status + " " + errBody);
            return;
        }
        
        const response_body = await fluxResponse.json();
        console.log("Success! Keys:", Object.keys(response_body));
        if (response_body.artifacts) {
            console.log("Artifact keys:", Object.keys(response_body.artifacts[0]));
        } else if (response_body.data) {
            console.log("Data keys:", Object.keys(response_body.data[0]));
        }
    } catch (e) {
        console.error(e);
    }
}
testFlux();
