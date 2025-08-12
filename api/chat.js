export default function handler(req, res) {
  // ... your existing CORS headers ...
  
  if (req.method === 'POST') {
    const { action } = req.body || {};
    
    console.log('API called with action:', action);
    
    if (action === 'ten_more_minutes') {
      // Add your actual "10 more minutes" logic here
      // For example: extend a timer, send a notification, etc.
      res.status(200).json({ 
        success: true, 
        message: '10 more minutes granted!' 
      });
    } else if (action === 'get_status') {
      res.status(200).json({ 
        success: true, 
        userCount: 5,
        connected: true 
      });
    } else {
      res.status(200).json({ success: true, message: 'API working' });
    }
  } else {
    res.status(200).json({ error: 'Use POST method' });
  }
}
