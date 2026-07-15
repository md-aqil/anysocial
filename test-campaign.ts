import { campaignWorker } from './src/workers/campaign-worker.js';
async function run() {
  console.log("Running campaignWorker.processSingleCampaign...");
  const result = await campaignWorker.processSingleCampaign('5eb9a034-445d-44cb-a448-755dbb264e54');
  console.log("Result:", result);
}
run().catch(console.error);
