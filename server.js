  require('dotenv').config(); // Load variabel lingkungan
  const express = require('express');
  const next = require('next');
  const http = require('http');
  const { Server } = require('socket.io');
  const Pusher = require('pusher');
  const cors = require('cors');

  // Inisialisasi Next.js app
  const dev = process.env.NODE_ENV !== 'production';
  const hostname = 'localhost';
  const port = process.env.PORT || 3000;
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  // Inisialisasi Pusher Server
  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY, // Ganti ke non-NEXT_PUBLIC
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER,
    useTLS: true,
  });

  app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer);

    // Middleware
    server.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST'] }));
    server.use(express.json());

    // Socket.IO
    io.on('connection', (socket) => {
      console.log('User konek (Socket.IO)');
      socket.on('error', (err) => {
        console.error('Error Socket.IO:', err);
      });
      socket.on('disconnect', () => {
        console.log('User putus (Socket.IO)');
      });
      socket.on('chat message from socket.io', (msg) => {
        try {
          io.emit('chat message from socket.io', msg);
        } catch (err) {
          console.error('Error kirim pesan Socket.IO:', err);
        }
      });
    });

    // Pusher API route (hapus kalau pake Next.js API routes)
    server.post('/api/pusher-express', async (req, res) => {
      const { message, sender } = req.body;
      try {
        await pusher.trigger('chat-channel', 'new-message', {
          message,
          sender,
          timestamp: new Date().toISOString(),
        });
        res.status(200).json({ success: true, message: 'Pesan dikirim via Express' });
      } catch (error) {
        console.error('Error kirim pesan via Express Pusher:', error);
        res.status(500).json({ error: 'Gagal kirim pesan', details: error.message });
      }
    });

    // Next.js catch-all
  server.all('*', (req, res) => {
    console.log('--- Debugging req.url ---');
    console.log('Original URL:', req.url);
    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        console.log('Parsed Pathname:', parsedUrl.pathname);
        console.log('Parsed Query:', parsedUrl.searchParams.toString());
    } catch (e) {
        console.error('Failed to parse URL in custom server (from URL constructor):', e.message);
    }
    console.log('-------------------------');
    return handle(req, res);
  });
    // Start server
    httpServer.listen(port, (err) => {
      if (err) {
        console.error('Gagal start HTTP server:', err);
        process.exit(1);
      }
      console.log(`> Jalan di http://${hostname}:${port}`);
      console.log(`> Next.js App jalan di mode ${dev ? 'development' : 'production'}`);
    });
  }).catch((err) => {
    console.error('Gagal start server Next.js:', err);
    process.exit(1);
  });