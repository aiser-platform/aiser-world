---
id: data-sources-overview
title: Data Sources
sidebar_label: Data Sources
description: Connect to various data sources and import data into Aicser Platform
---

# Data Sources

Aicser Platform supports connecting to a wide variety of data sources, making it easy to analyze data from anywhere.

## 🔌 Supported Data Sources

### **Databases**
- **PostgreSQL**: Full support for PostgreSQL databases
- **MySQL/MariaDB**: Connect to MySQL and MariaDB servers
- **SQL Server**: Microsoft SQL Server integration
- **SQLite**: Local SQLite database files
- **MongoDB**: NoSQL database support (coming soon)

### **Data Warehouses**
- **Snowflake**: Cloud data warehouse integration
- **BigQuery**: Google BigQuery support
- **Redshift**: Amazon Redshift connection
- **Databricks**: Databricks SQL warehouse support

### **File-Based Data**
- **CSV Files**: Upload and analyze CSV files
- **Excel Files**: Support for .xlsx and .xls formats
- **JSON Files**: Import JSON data structures
- **Parquet Files**: Efficient columnar data format

### **Cloud Storage**
- **Amazon S3**: Connect to S3 buckets
- **Google Cloud Storage**: GCS integration
- **Azure Blob Storage**: Azure storage support

### **APIs & Real-time**
- **REST APIs**: Connect to any REST API endpoint
- **Webhooks**: Real-time data ingestion
- **Streaming Data**: Real-time data streams (coming soon)

## 🔐 Connection Security

### **Encrypted Credentials**
- All credentials are encrypted at rest
- Secure credential storage using industry-standard encryption
- No credentials stored in plain text
- Credential rotation support

### **Connection Testing**
- Test connections before saving
- Validate credentials securely
- Check network connectivity
- Verify data access permissions

## 📊 Data Source Management

### **Creating Connections**
1. Navigate to **Settings → Data Sources**
2. Click **Add Data Source**
3. Select your data source type
4. Enter connection details
5. Test the connection
6. Save and start querying

### **Managing Sources**
- **Edit Connections**: Update connection details
- **Test Connections**: Verify connectivity
- **Remove Sources**: Safely disconnect data sources
- **View Schema**: Browse available tables and columns

## 🔄 Data Refresh

### **Scheduled Refresh**
- Set up automatic data refresh intervals
- Configure refresh schedules (hourly, daily, weekly)
- Monitor refresh status and history

### **Manual Refresh**
- Refresh data on-demand
- Clear cache when needed
- Force schema updates

## 🚀 Getting Started

### **Quick Start: CSV Upload**
1. Go to **Data Sources**
2. Click **Upload File**
3. Select your CSV file
4. Configure import settings
5. Start analyzing!

### **Quick Start: Database Connection**
1. Go to **Data Sources**
2. Click **Add Database**
3. Enter connection details:
   - Host: `your-database-host.com`
   - Port: `5432` (PostgreSQL default)
   - Database: `your_database_name`
   - Username: `your_username`
   - Password: `your_password`
4. Test connection
5. Save and query

## 💡 Best Practices

### **Connection Management**
- Use read-only database users when possible
- Limit data source access to necessary tables
- Regularly rotate credentials
- Monitor connection health

### **Performance Optimization**
- Use connection pooling for databases
- Index frequently queried columns
- Cache query results when appropriate
- Optimize data warehouse queries

## 🔗 Related Features

- [AI Overview](./ai-overview) - AI-powered data analysis
- [Charts & Visualizations](./charts-overview) - Visualize your data
- [Self-Host Guide](../self-host/self-host-index) - Deploy your own instance

---

**Ready to connect your data?** [Get Started →](../getting-started/quick-start-docker)
