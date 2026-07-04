import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

async function run() {
  const auth = new GoogleAuth({ 
    scopes: ['https://www.googleapis.com/auth/generative-language']
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: "A cinematic shot of an Indian woman" }],
      parameters: { sampleCount: 1 }
    })
  });
  console.log(res.status, await res.text());
}
run().catch(console.error);
