import { Server } from 'socket.io'

let io

const SocketHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io')
    
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })
    
    res.socket.server.io = io

    const waitingUsers = { seekers: [], helpers: [] }
    const activeChats = new Map()

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)
      
      // Send initial user count
      socket.emit('user_count', io.engine.clientsCount)
      
      // Broadcast to all users
      io.emit('user_count', io.engine.clientsCount)

      socket.on('find_match', ({ userType }) => {
        console.log(`${socket.id} looking for match as ${userType}`)
        const oppositeType = userType === 'seeker' ? 'helpers' : 'seekers'
        
        if (waitingUsers[oppositeType].length > 0) {
          const partner = waitingUsers[oppositeType].shift()
          const chatId = `chat-${Date.now()}`
          
          activeChats.set(socket.id, { partnerId: partner.id, chatId, userType })
          activeChats.set(partner.id, { partnerId: socket.id, chatId, userType: oppositeType.slice(0, -1) })
          
          socket.join(chatId)
          partner.join(chatId)
          
          console.log(`Match created: ${socket.id} + ${partner.id}`)
          io.to(chatId).emit('match_found', { chatId })
        } else {
          waitingUsers[userType + 's'].push(socket)
          console.log(`${socket.id} added to ${userType}s waiting list`)
        }
      })

      socket.on('cancel_match', () => {
        Object.values(waitingUsers).forEach(list => {
          const index = list.findIndex(user => user.id === socket.id)
          if (index > -1) {
            list.splice(index, 1)
            console.log(`${socket.id} removed from waiting list`)
          }
        })
      })

      socket.on('send_message', (data) => {
        const chat = activeChats.get(socket.id)
        if (chat) {
          socket.to(chat.partnerId).emit('message', data)
        }
      })

      socket.on('typing', () => {
        const chat = activeChats.get(socket.id)
        if (chat) {
          socket.to(chat.partnerId).emit('user_typing', true)
        }
      })

      socket.on('stop_typing', () => {
        const chat = activeChats.get(socket.id)
        if (chat) {
          socket.to(chat.partnerId).emit('user_typing', false)
        }
      })

      socket.on('leave_chat', () => {
        const chat = activeChats.get(socket.id)
        if (chat) {
          socket.to(chat.partnerId).emit('partner_disconnected')
          activeChats.delete(socket.id)
          activeChats.delete(chat.partnerId)
        }
      })

      socket.on('end_session', () => {
        const chat = activeChats.get(socket.id)
        if (chat) {
          io.to(chat.chatId).emit('session_ended')
          activeChats.delete(socket.id)
          activeChats.delete(chat.partnerId)
        }
      })

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
        
        Object.values(waitingUsers).forEach(list => {
          const index = list.findIndex(user => user.id === socket.id)
          if (index > -1) list.splice(index, 1)
        })
        
        const chat = activeChats.get(socket.id)
        if (chat) {
          socket.to(chat.partnerId).emit('partner_disconnected')
          activeChats.delete(chat.partnerId)
        }
        activeChats.delete(socket.id)
        
        io.emit('user_count', io.engine.clientsCount)
      })
    })
  } else {
    console.log('socket.io already running')
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default SocketHandler
