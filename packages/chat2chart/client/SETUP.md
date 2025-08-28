# 🚀 Aiser World - Universal Data Source Wizard Setup

## **🔐 Environment Configuration**

### **1. Create Environment File**
Create `.env.local` in the client directory:

```bash
# Cube.js Configuration
NEXT_PUBLIC_CUBEJS_TOKEN=your_actual_cubejs_token_here
NEXT_PUBLIC_CUBEJS_URL=http://localhost:4000

# Database Connection (for testing)
NEXT_PUBLIC_TEST_DB_HOST=localhost
NEXT_PUBLIC_TEST_DB_PORT=5432
NEXT_PUBLIC_TEST_DB_NAME=testdb
NEXT_PUBLIC_TEST_DB_USER=testuser
NEXT_PUBLIC_TEST_DB_PASSWORD=testpass

# Redis Configuration (for caching)
NEXT_PUBLIC_REDIS_HOST=localhost
NEXT_PUBLIC_REDIS_PORT=6379
NEXT_PUBLIC_REDIS_PASSWORD=
NEXT_PUBLIC_REDIS_ENABLED=true

# Security
NEXT_PUBLIC_ENABLE_HTTPS=false
NEXT_PUBLIC_ENABLE_AUTH=true

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000
```

### **2. Get Your Cube.js Token**
1. Access your Cube.js server: `http://localhost:4000`
2. Go to Settings → API Tokens
3. Generate a new token or copy existing one
4. Add it to `NEXT_PUBLIC_CUBEJS_TOKEN`

## **🐳 Docker Containers Status**

All required containers are running:
- ✅ **aiser-cube** (Cube.js) - Port 4000
- ✅ **aiser-redis** (Redis) - Port 6379  
- ✅ **aiser-postgres** (PostgreSQL) - Port 5432
- ✅ **aiser-chat2chart** (Backend) - Port 8000
- ✅ **aiser-client-dev** (Frontend) - Port 3000

## **🔌 Database Connection Testing**

### **Test PostgreSQL Connection**
```bash
# Test with psql
psql -h localhost -p 5432 -U testuser -d testdb

# Or use the Universal Data Source Modal
# 1. Open the modal
# 2. Select "Database" tab
# 3. Choose "PostgreSQL"
# 4. Enter connection details
# 5. Click "Test & Continue"
```

### **Test Redis Connection**
```bash
# Test with redis-cli
redis-cli -h localhost -p 6379 ping

# Should return: PONG
```

## **🧠 AI Schema Generation**

### **Features Available:**
- ✅ **Large Dataset Handling** (>1M rows)
- ✅ **Adaptive Sampling** for performance
- ✅ **Data Quality Assessment** (0-1 scoring)
- ✅ **Complexity Analysis** (automatic detection)
- ✅ **Performance Optimization** (enterprise-level)
- ✅ **Cube.js Schema Generation** (YAML format)

### **Usage:**
1. Upload file or connect database
2. Click "Generate AI Schema"
3. Review generated YAML
4. Deploy to Cube.js
5. Start analytics!

## **📊 Cube.js Integration**

### **Real Deployment Features:**
- ✅ **Schema Deployment** to `localhost:4000`
- ✅ **Real-time Testing** with actual queries
- ✅ **Data Source Registration** in Cube.js
- ✅ **Fallback Handling** for reliability
- ✅ **Performance Monitoring**

### **Deployment Process:**
1. **Schema Upload** → Cube.js API
2. **Test Query** → Validate deployment
3. **Data Source Registration** → Analytics ready
4. **Performance Optimization** → Caching strategies

## **🚀 Performance Features**

### **Redis Caching:**
- ✅ **Query Result Caching** (TTL configurable)
- ✅ **Schema Caching** (performance boost)
- ✅ **Automatic Fallback** (cache miss → fresh data)
- ✅ **Cache Statistics** (monitoring)

### **Large Dataset Optimization:**
- ✅ **Adaptive Sampling** (smart data selection)
- ✅ **Partitioning Strategies** (automatic)
- ✅ **Caching Strategies** (intelligent)
- ✅ **Performance Metrics** (real-time)

## **🔧 Troubleshooting**

### **Common Issues:**

#### **1. Cube.js Token Error**
```
Error: Cube.js deployment failed
```
**Solution:** Check `NEXT_PUBLIC_CUBEJS_TOKEN` in `.env.local`

#### **2. Redis Connection Failed**
```
Error: Redis cache failed
```
**Solution:** Verify Redis container is running: `docker ps | grep redis`

#### **3. Database Connection Failed**
```
Error: Database connection test failed
```
**Solution:** Check database credentials and container status

### **Health Checks:**
```bash
# Backend Health
curl http://localhost:8000/data/health

# Cube.js Health  
curl http://localhost:4000/cubejs-api/v1/health

# Redis Health
redis-cli -h localhost -p 6379 ping
```

## **🎯 Next Steps**

1. **Set Environment Variables** in `.env.local`
2. **Test Database Connections** via the modal
3. **Upload Sample Data** (CSV, Excel, JSON, Parquet)
4. **Generate AI Schema** and deploy to Cube.js
5. **Start Analytics** with real-time data!

## **📞 Support**

- **Documentation:** Check component files for detailed implementation
- **Logs:** Monitor browser console and backend logs
- **Health:** Use health check endpoints for system status

---

**🚀 Your Aiser World platform is now ready for enterprise data analytics!**
