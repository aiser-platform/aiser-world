# Aiser Platform - Development Guide 🚀

## 🎯 Quick Start for New Developers

### Prerequisites Check
```bash
# Check Node.js version (18+ required)
node --version

# Check Python version (3.11+ required)
python3 --version

# Check Docker installation
docker --version
docker-compose --version
```

### One-Command Setup
```bash
# Clone and setup everything
git clone <repository-url>
cd aiser-world
./scripts/dev-setup.sh
```

### Manual Setup (if needed)
```bash
# 1. Install dependencies
npm install

# 2. Start services
docker-compose up -d

# 3. Setup database
cd packages/chat2chart/server
python create_missing_tables.py
cd ../..

# 4. Build frontend
cd packages/chat2chart/client
npm run build
cd ../..
```

## 🧠 Cursor AI Best Practices

### The Cursor Hack That Changes Everything
1. **Always read `aiser-platform-context.md`** before writing code
2. **Update `aiser-platform-context.md`** after major features
3. **Document everything** - database schema, API endpoints, business logic
4. **Keep it current** - this file is your team's shared brain

### Cursor Rules Implementation
- **`.cursorrules`** file contains all development rules
- **`aiser-platform-context.md`** contains project context
- **Always reference both** before making changes
- **Update documentation** as you develop

## 🏗️ Development Workflow

### Before Starting Work
1. **Read the context**: `aiser-platform-context.md`
2. **Check existing code**: Look for similar implementations
3. **Review database schema**: Understand data relationships
4. **Consider AI integration**: Look for AI enhancement opportunities

### During Development
1. **Follow TypeScript strict typing**
2. **Implement error handling** for all async operations
3. **Add loading states** for user feedback
4. **Use memory-optimized components**
5. **Test thoroughly** before committing

### After Completing Work
1. **Update documentation** in `aiser-platform-context.md`
2. **Add new API endpoints** to the documentation
3. **Update database schema** if changes made
4. **Test all integrations** thoroughly
5. **Update tests** if needed

## 🔧 Component Development Patterns

### Error Handling Pattern
```typescript
// Always wrap complex components
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>

// Handle async operations
try {
  const result = await apiCall();
  setData(result);
} catch (error) {
  setError(error.message);
  message.error('Operation failed');
} finally {
  setLoading(false);
}
```

### Loading States Pattern
```typescript
// Use appropriate loading component
{loading ? (
  <QueryLoading message="Executing query..." progress={50} />
) : (
  <Results data={data} />
)}
```

### Memory Optimization Pattern
```typescript
// Use MemoryOptimizedEditor for SQL editing
<MemoryOptimizedEditor
  value={sqlQuery}
  onChange={handleChange}
  language="sql"
  options={optimizedOptions}
/>

// Cleanup in useEffect
useEffect(() => {
  const cleanup = () => {
    // Cleanup logic
  };
  return cleanup;
}, []);
```

## 📊 Database Development

### Adding New Tables
1. **Create migration file** in `packages/chat2chart/server/migrations/`
2. **Update schema** in `aiser-platform-context.md`
3. **Add to models** in `packages/chat2chart/server/app/modules/`
4. **Create service** for database operations
5. **Add API endpoints** for CRUD operations

### Database Best Practices
```python
# Always use transactions
async with db.begin():
    # Database operations
    pass

# Validate input data
if not data.get('required_field'):
    raise HTTPException(status_code=400, detail="Required field missing")

# Use proper error handling
try:
    result = await db.execute(query)
except Exception as e:
    logger.error(f"Database error: {e}")
    raise HTTPException(status_code=500, detail="Database operation failed")
```

## 🤖 AI Integration Development

### Adding New AI Features
1. **Extend UnifiedAIAnalyticsService**
2. **Add new analysis types** to the enum
3. **Implement business logic** in the service
4. **Add API endpoints** for the new feature
5. **Update frontend** to use the new feature

### AI Development Patterns
```python
# Always validate AI responses
def validate_ai_response(response: dict) -> bool:
    if not response.get('success'):
        return False
    if response.get('confidence_score', 0) < 0.5:
        return False
    return True

# Implement fallback logic
try:
    ai_result = await ai_service.analyze(data)
    if not validate_ai_response(ai_result):
        ai_result = await fallback_analysis(data)
except Exception as e:
    ai_result = await fallback_analysis(data)
```

## 🎨 Frontend Development

### Component Structure
```typescript
// Standard component structure
interface ComponentProps {
  // Props with proper typing
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // State management
  const [state, setState] = useState();
  
  // Effects with cleanup
  useEffect(() => {
    const cleanup = () => {
      // Cleanup logic
    };
    return cleanup;
  }, []);
  
  // Event handlers
  const handleEvent = useCallback(() => {
    // Handler logic
  }, []);
  
  // Render with error boundary
  return (
    <ErrorBoundary>
      <div>
        {/* Component content */}
      </div>
    </ErrorBoundary>
  );
};
```

### State Management
```typescript
// Use proper state management
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType[]>([]);

// Debounce user inputs
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    // Search logic
  }, 300),
  []
);
```

## 🔍 Testing Strategy

### Unit Tests
```typescript
// Test component behavior
describe('Component', () => {
  it('should render correctly', () => {
    render(<Component prop1="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
  
  it('should handle errors gracefully', () => {
    // Test error handling
  });
});
```

### Integration Tests
```python
# Test API endpoints
async def test_create_dashboard():
    response = await client.post("/api/dashboards/", json=dashboard_data)
    assert response.status_code == 201
    assert response.json()["name"] == dashboard_data["name"]
```

### E2E Tests
```typescript
// Test complete user workflows
test('user can create dashboard', async () => {
  await page.goto('/dashboards');
  await page.click('[data-testid="create-dashboard"]');
  await page.fill('[data-testid="dashboard-name"]', 'Test Dashboard');
  await page.click('[data-testid="save-dashboard"]');
  await expect(page.locator('[data-testid="dashboard-list"]')).toContainText('Test Dashboard');
});
```

## 🚀 Performance Optimization

### Frontend Optimization
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependency]);
```

### Backend Optimization
```python
# Use database indexes
CREATE INDEX idx_dashboards_project_id ON dashboards(project_id);

# Implement caching
@cache(ttl=300)  # 5 minutes
async def get_dashboard(dashboard_id: str):
    # Expensive operation
    pass

# Use connection pooling
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30
)
```

## 🔒 Security Best Practices

### Input Validation
```python
# Validate all inputs
class DashboardCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    project_id: int = Field(..., gt=0)
```

### Authentication
```python
# Always validate JWT tokens
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### SQL Injection Prevention
```python
# Use parameterized queries
query = select(Dashboard).where(Dashboard.id == dashboard_id)
result = await db.execute(query)
```

## 📝 Documentation Standards

### API Documentation
```python
@router.post("/dashboards/", response_model=DashboardResponseSchema)
async def create_dashboard(
    dashboard: DashboardCreateSchema,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new dashboard
    
    Args:
        dashboard: Dashboard creation data
        current_user: Current authenticated user
        
    Returns:
        DashboardResponseSchema: Created dashboard data
        
    Raises:
        HTTPException: If creation fails
    """
```

### Code Comments
```typescript
/**
 * Memory-optimized Monaco Editor wrapper
 * 
 * Features:
 * - Debounced onChange handlers
 * - Proper cleanup on unmount
 * - Memory-intensive features disabled
 * - Performance optimizations
 */
const MemoryOptimizedEditor = memo(({ value, onChange, ...props }) => {
  // Implementation
});
```

## 🐛 Debugging Guide

### Common Issues
1. **Monaco Editor Memory Leaks**
   - **Solution**: Use MemoryOptimizedEditor
   - **Check**: Component cleanup in useEffect

2. **Database Connection Issues**
   - **Solution**: Check connection strings and credentials
   - **Check**: Database service status

3. **API Errors**
   - **Solution**: Check ErrorBoundary and LoadingStates
   - **Check**: Network tab in browser dev tools

4. **Performance Issues**
   - **Solution**: Check memory usage and query optimization
   - **Check**: React DevTools Profiler

### Debug Commands
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart services
docker-compose restart [service_name]

# Full reset
docker-compose down && docker-compose up -d

# Check database
docker-compose exec postgres psql -U aiser -d aiser_world -c "\dt"

# Check Redis
docker-compose exec redis redis-cli ping
```

## 📊 Monitoring and Observability

### Key Metrics to Monitor
- **API Response Times**: <500ms for 95th percentile
- **Database Query Performance**: <100ms for simple queries
- **Memory Usage**: <500MB per service
- **Error Rates**: <1% error rate
- **User Engagement**: Track feature usage

### Monitoring Tools
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Application Logs**: Structured logging
- **Error Tracking**: Sentry integration

## 🚀 Deployment

### Development Deployment
```bash
# Start development environment
./scripts/dev-setup.sh

# Check all services
curl http://localhost:3000  # Frontend
curl http://localhost:8000/health  # Backend
curl http://localhost:4000/health  # Cube.js
curl http://localhost:5000/health  # Auth
```

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
curl https://your-domain.com/health
```

## 📞 Getting Help

### Documentation
- **API Docs**: http://localhost:8000/docs
- **Project Context**: `aiser-platform-context.md`
- **Development Guide**: This file
- **Quick Start**: `QUICK_START.md`

### Team Resources
- **GitHub Issues**: For bug reports and feature requests
- **Code Reviews**: For code quality and best practices
- **Slack/Discord**: For real-time communication
- **Wiki**: For detailed documentation

### Emergency Contacts
- **Technical Lead**: For critical issues
- **DevOps**: For infrastructure problems
- **AI/ML Specialist**: For AI-related issues
- **Frontend Lead**: For UI/UX problems

---

**Remember**: This guide is your development companion. Keep it updated, follow the patterns, and always reference the project context before making changes. Happy coding! 🚀
