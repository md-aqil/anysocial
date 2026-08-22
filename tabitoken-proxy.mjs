import http from 'http';
import https from 'https';

const PORT = 3456;
const TABITOKEN_BASE = 'https://tabitoken.com';
const TABITOKEN_KEY = 'sk-yFNPKHZajZu4T8KhjrMKXVWkUgzMsadzQFAOokkAHc9HwVGk';

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function toChatMessages(responsesBody) {
  const messages = [];
  if (responsesBody.instructions) {
    messages.push({ role: 'system', content: responsesBody.instructions });
  }
  const input = responsesBody.input;
  if (Array.isArray(input)) {
    for (const item of input) {
      if (item.type === 'message') {
        const content =
          typeof item.content === 'string'
            ? item.content
            : Array.isArray(item.content)
              ? item.content.map((c) => c.text || c.content || '').join('\n')
              : '';
        messages.push({ role: item.role, content });
      }
    }
  }
  return messages;
}

function toResponsesFromChat(chatBody, chatResponse) {
  const text = chatResponse.choices?.[0]?.message?.content || '';
  return {
    id: `resp_${Date.now()}`,
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status: 'completed',
    output: [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text }],
      },
    ],
    usage: chatResponse.usage || { input_tokens: 0, output_tokens: 0 },
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method !== 'POST' || (pathname !== '/v1/responses' && pathname !== '/responses')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not Found', type: 'not_found' } }));
    return;
  }

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    try {
      const data = JSON.parse(body || '{}');

      const chatPayload = {
        model: data.model,
        messages: toChatMessages(data),
        tools: data.tools,
        ...(data.tool_choice && { tool_choice: data.tool_choice }),
      };

      const postData = JSON.stringify(chatPayload);
      const chatRes = await httpsRequest(
        {
          hostname: new URL(TABITOKEN_BASE).hostname,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TABITOKEN_KEY}`,
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        postData
      );

      const responseBody = toResponsesFromChat(chatPayload, chatRes.data);
      res.writeHead(chatRes.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(responseBody));
    } catch (error) {
      console.error('Proxy error:', error.message);
      res.writeHead(error.status || 500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(
        JSON.stringify({
          error: {
            message: error.message || 'Proxy error',
            type: 'proxy_error',
            code: error.code,
          },
        })
      );
    }
  });
});

server.listen(PORT, () => {
  console.log(`TabiToken Responses proxy listening on http://localhost:${PORT}`);
});
