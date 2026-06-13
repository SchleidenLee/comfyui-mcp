import http from 'node:http';

const MCP_URL = 'http://localhost:9101/mcp';

function getSseSession() {
  return new Promise((resolve, reject) => {
    const req = http.get(MCP_URL, { headers: { Accept: 'text/event-stream' } }, (res) => {
      let buffer = '';
      res.on('data', (chunk) => {
        buffer +=