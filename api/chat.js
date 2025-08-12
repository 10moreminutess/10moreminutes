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
    const { action } = req.body || {};
    
    console.log('API called with action:', action);

    if (action === 'get_status') {
      res.status(200).json({ 
        success: true, 
        userCount: 5, // Hardcoded for testing
        connected: true 
      });
    } else {
      res.status(200).json({ success: true, message: 'API working' });
    }
  } else {
    res.status(200).json({ error: 'Use POST method' });
  }
}
