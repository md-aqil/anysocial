const { GoogleAuth } = require('google-auth-library');

async function testVeo() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const projectId = await auth.getProjectId();
  
  const outputBucket = process.env.VEO_STORAGE_BUCKET || `anysocial-veo-videos-${projectId}`;
  const outputGcsUri = `gs://${outputBucket}/veo_outputs/`;
  const MODEL = 'veo-3.0-generate-001';

  console.log(`Starting generation for project: ${projectId}, bucket: ${outputBucket}`);

  const response = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${MODEL}:predictLongRunning`,
    {
      method: "POST",
      headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          instances: [
              { prompt: "A highly detailed, 4k cinematic shot of a red silk dress blowing in the wind on a sunny day." }
          ],
          parameters: {
              storageUri: outputGcsUri,
              aspectRatio: "16:9",
              sampleCount: 1,
              durationSeconds: 8,
              resolution: "720p"
          }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Initiate failed:", errText);
    return;
  }

  const data = await response.json();
  const operationName = data.name;
  console.log("Operation started:", operationName);

  const pollUrl = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;

  while (true) {
    await new Promise(r => setTimeout(r, 10000));
    console.log("Polling...");
    const pollRes = await fetch(pollUrl, {
        method: "POST", // Wait, earlier I discovered we need fetchPredictOperation for polling? No, Google's operation API is GET /v1/operations/... Wait, earlier I noticed my poll code uses POST to :fetchPredictOperation. Let's use the exact code from the backend!
    });
    // Wait, let's copy the exact logic from ai-generation.routes.ts
  }
}

// Re-write to use exactly what the backend uses:
async function pollExact() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const projectId = await auth.getProjectId();
  
  const outputBucket = process.env.VEO_STORAGE_BUCKET || `anysocial-veo-videos-${projectId}`;
  const outputGcsUri = `gs://${outputBucket}/veo_outputs/`;
  
  // Ensure bucket
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(outputBucket);
  const [exists] = await bucket.exists();
  if (!exists) {
    console.log("Creating bucket...");
    await bucket.create({ location: 'us-central1' });
  }

  const MODEL = 'veo-3.0-generate-001';
  console.log("Initiating generation...");
  const response = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${MODEL}:predictLongRunning`,
    {
      method: "POST",
      headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          instances: [{ prompt: "A glowing blue cube rotating in space" }],
          parameters: {
              storageUri: outputGcsUri,
              aspectRatio: "16:9",
              sampleCount: 1,
              durationSeconds: 8,
              resolution: "720p"
          }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) { console.error(data); return; }
  const operationName = data.name;
  console.log("Operation:", operationName);

  let pollUrl = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;
  const match = operationName.match(/^projects\/([^\/]+)\/locations\/([^\/]+)\/.*operations\/([^\/]+)$/);
  if (match) {
    const [, projId, location] = match;
    pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projId}/locations/${location}/publishers/google/models/veo-3.0-generate-001:fetchPredictOperation`;
  }

  while (true) {
    console.log("Polling URL:", pollUrl);
    const pollRes = await fetch(pollUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ operationName })
    });
    const result = await pollRes.json();
    if (result.done) {
        console.log("DONE! Final payload:");
        console.log(JSON.stringify(result, null, 2));
        break;
    }
    console.log("Pending... sleeping 10s");
    await new Promise(r => setTimeout(r, 10000));
  }
}

pollExact().catch(console.error);
