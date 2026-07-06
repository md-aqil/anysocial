import fetch from 'node-fetch';
const res = await fetch('http://localhost:3001/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: '[{"role":"user","content":"Hello"}]' })
});
console.log(res.status);
console.log(await res.text());
