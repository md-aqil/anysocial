import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
const token = jwt.sign({ id: '123' }, process.env.JWT_SECRET || 'secret');
const res = await fetch('http://localhost:3001/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ messages: '[{"role":"user","content":"Hello"}]' })
});
console.log(res.status);
console.log(await res.text());
