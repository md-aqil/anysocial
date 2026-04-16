import { prisma } from './src/db/prisma.js';
import { tokenCrypto } from './src/crypto/token-crypto.service.js';
import axios from 'axios';

async function sync() {
  const accounts = await prisma.socialAccount.findMany();
  for (const account of accounts) {
    try {
      const accessToken = tokenCrypto.decrypt(JSON.parse(account.accessToken));
      let name = null;
      if (account.platform === 'FACEBOOK') {
        const res = await axios.get('https://graph.facebook.com/v18.0/me', {
          params: { access_token: accessToken, fields: 'id,name' }
        });
        name = res.data.name;
      }
      
      console.log(`Account ${account.platform}: ${name}`);
      if (name) {
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { metadata: { accountName: name } }
        });
      }
    } catch(e) {
      console.error('Error syncing', account.platform, e.message);
    }
  }
}
sync().then(() => console.log('Done'));
