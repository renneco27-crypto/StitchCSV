// tunnel_runner.js - Official Ngrok SDK Runner for StitchApp (Campus College IT Students)
const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

function getCachedAuthtoken() {
  if (process.env.NGROK_AUTHTOKEN) return process.env.NGROK_AUTHTOKEN;

  const possiblePaths = [
    path.join(process.env.LOCALAPPDATA || '', 'ngrok', 'ngrok.yml'),
    path.join(process.env.USERPROFILE || '', '.config', 'ngrok', 'ngrok.yml'),
    path.join(process.env.USERPROFILE || '', '.ngrok2', 'ngrok.yml'),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/authtoken:\s*([^\s\r\n]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (e) {}
  }
  return null;
}

let currentListener = null;

async function connectTunnel() {
  if (currentListener) {
    try {
      console.log('🔄 [TUNNEL REFRESH] Renewing session...');
      await currentListener.close();
    } catch (e) {}
    currentListener = null;
  }

  try {
    const token = getCachedAuthtoken();
    const opts = {
      addr: PORT,
      domain: 'sandstorm-wilder-drainable.ngrok-free.dev',
    };
    if (token) {
      opts.authtoken = token;
    }
    currentListener = await ngrok.forward(opts);
    console.log('\n======================================================================');
    console.log('⚡ [STITCHAPP TUNNEL LIVE] Connected for College IT Students!');
    console.log(`🌐 Public Campus URL: ${currentListener.url()}`);
    console.log(`🎯 Forwarding to:     http://127.0.0.1:${PORT}`);
    console.log('⏰ Watchdog active:    Auto-maintains keep-alive every 10 min');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ [TUNNEL ERROR]:', err.message);
  }
}

async function loop() {
  await connectTunnel();

  setInterval(async () => {
    console.log('\n⏱️ [10-MIN WATCHDOG] Verifying tunnel health & keeping alive...');
    await connectTunnel();
  }, 10 * 60 * 1000);
}

loop();
