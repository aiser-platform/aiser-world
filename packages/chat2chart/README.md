# AiserAI Chat2Chart Platform  

AiserAI is a powerful AI-driven SaaS platform for data intelligence that provides interactive data visualization, analysis, and insights through natural language. ### The core Chat to Chart is a web application that allows users of all knowledge level to convert chat messages into a chart fast securely and safely to inform decision making and solve problems with data. The application is built using Next.js 14 with FastAPI as the server, and the chart is based on ECharts. At Dataticon, we belive in data-driven decision making for individuals and enterpises in pursuits of a better, more productive, and safer world of trusted information and analysis through Aiser Chat2Chart technology.   

## Features

- **Chat2Chart**: Generate charts and insights from natural language queries
- **Chart Designer**: Advanced chart customization and design tools
- **Data Connections**: Support for popular databases and file uploads (csv, excel...etc)
- **SQL Editor**: Interactive SQL editor with schema visualization (Coming Soon)
- **Dashboard Builder**: Drag-and-drop interface for creating interactive dashboards (Coming Soon)
- **Jupyter-like Notebook**: Python code execution and data analysis (Coming Soon)
- - **Data Story**: one click data story generation (Coming Soon)
- **Telegram Integration**: Use Chat2Chart directly in Telegram (Coming Soon)
- **Enterprise Features**: Cloud, brand customization, SSO, and custom deployment options

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aiserai.git
cd aiserai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Update .env with your configuration
``` 

4. Start the development server:
```bash
npm run dev
```

5. Start the backend server:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run
```

## Architecture

The platform consists of:

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: FastAPI with SQLAlchemy (and celery background tasks)
- **Database**: PostgreSQL for storage and SQL ALchemy  
- **Cache**: Redis for caching and job queues
- **AI**: Integration with OpenAI and custom models
- **Infrastructure**: Docker and Kubernetes 
- ** Chat to Chart Web Application**: Open Source 

## Development

### Prerequisites

- Node.js 14+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Project Structure

```
├── app/                  # Next.js pages and routes
├── components/          # React components
├── backend/            # FastAPI backend
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   └── utils/         # Utilities
├── lib/               # Frontend utilities
├── types/             # TypeScript types
└── utils/             # Shared utilities
```

## Deployment / Local Setup 

### Docker

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

### Environment Variables

Required environment variables:

```plaintext
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aiserai
OPENAI_API_KEY=your-openai-api-key
JWT_SECRET_KEY=your-jwt-secret
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE for details



