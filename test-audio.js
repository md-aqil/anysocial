import { GoogleAuth } from 'google-auth-library';

async function test() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const url = 'https://aiplatform.googleapis.com/v1beta1/projects/seo-genie-494023/locations/global/publishers/google/models/gemini-flash-latest:generateContent';
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.token}` },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      generationConfig: {
        response_modalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
      }
    })
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.substring(0, 200));
}
test().catch(console.error);
