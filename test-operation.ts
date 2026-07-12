import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

async function test() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const projectId = await auth.getProjectId();
  
  // Just construct a fake UUID operation and see what Google returns for different URLs
  const uuid = "0f2cf9c4-c38f-4b83-a737-b163386e85d7";
  
  const urls = [
    `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/us-central1/operations/${uuid}`,
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/operations/${uuid}`,
    `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.0-generate-001/operations/${uuid}`,
    `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/us-central1/endpoints/openapi/operations/${uuid}`
  ];

  for (const url of urls) {
    console.log(`\nTesting: ${url}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token.token}` } });
    if (res.headers.get('content-type')?.includes('text/html')) {
        console.log(`Result: HTML ${res.status}`);
    } else {
        const data = await res.json();
        console.log(`Result: ${res.status} JSON:`, JSON.stringify(data));
    }
  }
}
test().catch(console.error);
