// Simple in-memory storage (resets on each function invocation)
let waitingUsers = { seekers: [], helpers: [] };
let activeChats = new Map();
let userCount = 0;

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { action, userType, userId, message, partnerId } = req.body;

    switch (action) {
      case 'find_match':
        const oppositeType = userType === 'seeker' ? 'helpers' : 'seekers';
        
        if (waitingUsers[oppositeType].length > 0) {
          // Match found!
          const partner = waitingUsers[oppositeType].shift();
          const chatId = `chat-${Date.now()}`;
          
          activeChats.set(userId, { partnerId: partner.userId, chatId });
          activeChats.set(partner.userId, { partnerId: userId, chatId });
          
          res.status(200).json({ 
            success: true, 
            matched: true, 
            chatId,
            partnerId: partner.userId 
          });
        } else {
          // Add to waiting list
          waitingUsers[userType + 's'].push({ userId, timestamp: Date.now() });
          res.status(200).json({ success: true, matched: false });
        }
        break;

      case 'send_message':
        const chat = activeChats.get(userId);
        if (chat) {
          // In a real app, you'd store this in a database
          res.status(200).json({ success: true, delivered: true });
        } else {
          res.status(400).json({ success: false, error: 'No active chat' });
        }
        break;

      case 'get_status':
        userCount++;
        res.status(200).json({ 
          success: true, 
          userCount: Math.max(1, userCount % 50), // Simulate realistic user count
          connected: true 
        });
        break;

      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
