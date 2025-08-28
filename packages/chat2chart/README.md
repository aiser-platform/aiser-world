# Aiser Chat2Chart - Clean Architecture

## 🏗️ **Architecture Overview**

This project implements a **hybrid conversation management system** following modern best practices from ChatGPT/OpenAI and other production chat applications.

### **Key Principles**
1. **Memory-First**: Immediate UI feedback for optimal user experience
2. **Database Persistence**: Reliable data storage with graceful fallback
3. **Environment-Aware**: Automatic configuration for different deployment scenarios
4. **Clean Separation**: Clear boundaries between frontend, backend, and data layers

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Backend Configuration
POSTGRES_DB=aiser_world                    # Database name
POSTGRES_USER=aiser                        # Database user
POSTGRES_PASSWORD=aiser_password           # Database password

# AI Configuration
AZURE_OPENAI_API_KEY=your_key             # Azure OpenAI API key
AZURE_OPENAI_ENDPOINT=your_endpoint       # Azure OpenAI endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini   # Model deployment name

# Frontend Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # Backend URL (optional)
```

### **Database Configuration**
- **Database**: `aiser_world` (PostgreSQL)
- **Tables**: `conversation`, `message`, `data_sources`, `users`
- **Connection**: Automatic via Docker networking

## 🚀 **Deployment Scenarios**

### **1. Local Docker Development**
```bash
docker-compose -f docker-compose.dev.yml up
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Database: `postgres:5432`
- **Backend URL**: `http://aiser-chat2chart-dev:8000` (Docker hostname)

### **2. Local Development (Non-Docker)**
```bash
# Backend
cd packages/chat2chart/server
poetry install
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd packages/chat2chart/client
npm install
npm run dev
```
- **Backend URL**: `http://127.0.0.1:8000`

### **3. Production/Staging**
```bash
# Set environment variable
export NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com

# Deploy
docker-compose -f docker-compose.production.yml up
```
- **Backend URL**: Uses `NEXT_PUBLIC_BACKEND_URL` environment variable

### **4. On-Premise**
```bash
# Set environment variable
export NEXT_PUBLIC_BACKEND_URL=http://internal-server:8000

# Deploy
docker-compose -f docker-compose.production.yml up
```

## 📁 **File Structure**

```
packages/chat2chart/
├── client/                          # Next.js Frontend
│   ├── src/
│   │   ├── utils/
│   │   │   ├── backendUrl.ts       # Smart backend URL resolver
│   │   │   └── api.ts              # API utilities
│   │   ├── services/
│   │   │   ├── conversationService.ts  # Hybrid conversation management
│   │   │   └── unifiedAIService.ts     # AI service integration
│   │   └── config/
│   │       └── environment.ts      # Clean environment config
│   └── package.json
├── server/                          # FastAPI Backend
│   ├── app/
│   │   ├── modules/
│   │   │   ├── chats/
│   │   │   │   └── conversations/  # Conversation API
│   │   │   └── ai/                 # AI orchestration
│   │   └── main.py
│   └── pyproject.toml
└── docker-compose.dev.yml          # Development configuration
```

## 🔄 **Conversation Flow**

### **1. User Sends Message**
```typescript
// Immediate memory update
const message = conversationService.addMessage(userInput, 'user');

// Non-blocking database persistence
// (happens in background, doesn't affect UI)
```

### **2. AI Response**
```typescript
// AI processes message
const aiResponse = await aiService.analyze(userInput, dataSource);

// Add AI response to memory
const aiMessage = conversationService.addMessage(aiResponse, 'assistant');

// Non-blocking database persistence
```

### **3. State Management**
```typescript
// Get current state (memory-first)
const state = conversationService.getState();

// React component updates immediately
setMessages(state.messages);
```

## 🛡️ **Error Handling & Fallbacks**

### **Database Unavailable**
- ✅ **Memory continues working** - UI remains responsive
- ✅ **Graceful degradation** - No user-facing errors
- ✅ **Automatic retry** - Background persistence attempts
- ✅ **State recovery** - Data restored when database returns

### **Network Issues**
- ✅ **Local fallback** - Uses localhost for API routes
- ✅ **Docker networking** - Container-to-container communication
- ✅ **Environment detection** - Automatic URL resolution

## 🧪 **Testing**

### **Backend Health Check**
```bash
curl http://localhost:8000/health
```

### **Database Connection**
```bash
docker exec aiser-postgres-dev psql -U aiser -d aiser_world -c "\dt"
```

### **Conversation API**
```bash
# List conversations
curl http://localhost:8000/conversations

# Create conversation
curl -X POST http://localhost:8000/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Conversation"}'
```

## 🚀 **Best Practices Implemented**

1. **Hybrid Architecture**: Memory-first with database persistence
2. **Environment Awareness**: Automatic configuration detection
3. **Graceful Degradation**: Fallback strategies for all failure modes
4. **Clean Separation**: Clear boundaries between layers
5. **Non-blocking Operations**: Database operations don't block UI
6. **State Management**: Centralized conversation state
7. **Error Handling**: Comprehensive error handling with user-friendly fallbacks

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Connection Refused**: Check if backend is running and using correct database
2. **Conversations Not Persisting**: Verify database tables exist and backend can connect
3. **Frontend Can't Reach Backend**: Check Docker networking and URL configuration

### **Debug Commands**
```bash
# Check container status
docker ps | grep aiser

# Check backend logs
docker logs aiser-chat2chart-dev --tail 20

# Check database
docker exec aiser-postgres-dev psql -U aiser -d aiser_world -c "\dt"

# Test backend connectivity
curl http://127.0.0.1:8000/health
```

## 📚 **References**

- **ChatGPT Architecture**: Memory-first with database persistence
- **Modern Chat Apps**: Real-time updates with reliable storage
- **Docker Best Practices**: Container networking and environment management
- **React Patterns**: State management and error boundaries
