import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { tokenCrypto } from '../src/crypto/token-crypto.service.js';

const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://mdaqil@localhost:5432/oauth_service?schema=public' } } });

async function run() {
  const account = await prisma.socialAccount.findFirst({
    where: { platform: 'TWITTER', status: 'CONNECTED' }
  });
  
  if (!account) return console.log('No TWITTER account');
  
  const accessToken = tokenCrypto.decrypt(JSON.parse(account.accessToken));
  
  try {
    const response = await axios.post(
      'https://api.twitter.com/2/tweets',
       { text: "Test tweet from my CLI to see what Twitter says!" },
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    console.log("Success! Response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch(e: any) {
    if(e.response) {
      console.log('Error Response:', JSON.stringify(e.response.data, null, 2));
    } else {
      console.log('Error Message:', e.message);
    }
  }
  await prisma.$disconnect();
}
run();
