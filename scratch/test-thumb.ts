import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { tokenCrypto } from '../src/crypto/token-crypto.service.js';
import fs from 'fs';

const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://mdaqil@localhost:5432/oauth_service?schema=public' } } });

async function run() {
  const account = await prisma.socialAccount.findFirst({
    where: { platform: 'YOUTUBE', status: 'CONNECTED' }
  });
  
  if (!account) return console.log('No YouTube account');
  
  const accessToken = tokenCrypto.decrypt(JSON.parse(account.accessToken));
  
  try {
    const fakeThumb = fs.readFileSync('../frontend/public/placeholder.jpg'); // something that exists
    await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/thumbnails/set',
      fakeThumb,
      {
        params: { videoId: 'ne3UyluLZLw' }, 
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg'
        }
      }
    );
    console.log('Success');
  } catch(e: any) {
    console.log(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
}
run();
