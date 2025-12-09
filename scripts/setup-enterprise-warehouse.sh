#!/bin/bash
# Enterprise Sample Data Warehouse Setup Script
# This script allows users to optionally enable/disable the enterprise sample data warehouse

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENABLE_SAMPLE_WAREHOUSE=${ENABLE_SAMPLE_WAREHOUSE:-false}
SAMPLE_DATA_SIZE=${SAMPLE_DATA_SIZE:-medium} # small, medium, large, enterprise

echo -e "${BLUE}🚀 Aiser Enterprise Sample Data Warehouse Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --enable-sample-warehouse    Enable enterprise sample data warehouse"
    echo "  --disable-sample-warehouse   Disable enterprise sample data warehouse"
    echo "  --data-size SIZE            Set sample data size (small|medium|large|enterprise)"
    echo "  --help                      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENABLE_SAMPLE_WAREHOUSE     Set to 'true' to enable sample warehouse"
    echo "  SAMPLE_DATA_SIZE            Set data size (small|medium|large|enterprise)"
    echo ""
    echo "Examples:"
    echo "  $0 --enable-sample-warehouse --data-size enterprise"
    echo "  ENABLE_SAMPLE_WAREHOUSE=true SAMPLE_DATA_SIZE=large $0"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --enable-sample-warehouse)
            ENABLE_SAMPLE_WAREHOUSE=true
            shift
            ;;
        --disable-sample-warehouse)
            ENABLE_SAMPLE_WAREHOUSE=false
            shift
            ;;
        --data-size)
            SAMPLE_DATA_SIZE="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Validate data size
case $SAMPLE_DATA_SIZE in
    small|medium|large|enterprise)
        ;;
    *)
        echo -e "${RED}❌ Invalid data size: $SAMPLE_DATA_SIZE${NC}"
        echo "Valid options: small, medium, large, enterprise"
        exit 1
        ;;
esac

echo -e "${YELLOW}📊 Configuration:${NC}"
echo "  Sample Warehouse: $ENABLE_SAMPLE_WAREHOUSE"
echo "  Data Size: $SAMPLE_DATA_SIZE"
echo ""

if [ "$ENABLE_SAMPLE_WAREHOUSE" = "true" ]; then
    echo -e "${GREEN}✅ Enabling Enterprise Sample Data Warehouse...${NC}"
    
    # Start ClickHouse with enterprise sample profile
    echo -e "${BLUE}🐳 Starting ClickHouse Enterprise Warehouse...${NC}"
    docker compose --profile enterprise-sample up -d clickhouse
    
    # Wait for ClickHouse to be ready
    echo -e "${BLUE}⏳ Waiting for ClickHouse to be ready...${NC}"
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker compose exec clickhouse wget --no-verbose --tries=1 --spider http://localhost:8123/ping 2>/dev/null; then
            echo -e "${GREEN}✅ ClickHouse is ready!${NC}"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        echo -e "${RED}❌ ClickHouse failed to start within 60 seconds${NC}"
        exit 1
    fi
    
    # Create tables
    echo -e "${BLUE}📋 Creating enterprise tables...${NC}"
    docker compose exec clickhouse clickhouse-client \
        --host clickhouse --port 9000 \
        --user aiser --password aiser_warehouse_password \
        --database aiser_warehouse \
        --multiquery < scripts/clickhouse-init/01-create-tables.sql
    
    # Insert sample data based on size
    echo -e "${BLUE}📊 Inserting $SAMPLE_DATA_SIZE sample data...${NC}"
    
    case $SAMPLE_DATA_SIZE in
        small)
            CUSTOMERS=1000
            PRODUCTS=200
            EMPLOYEES=100
            SALES=5000
            ORDERS=3000
            INVENTORY=800
            ;;
        medium)
            CUSTOMERS=5000
            PRODUCTS=1000
            EMPLOYEES=500
            SALES=25000
            ORDERS=15000
            INVENTORY=4000
            ;;
        large)
            CUSTOMERS=10000
            PRODUCTS=2000
            EMPLOYEES=1000
            SALES=50000
            ORDERS=30000
            INVENTORY=8000
            ;;
        enterprise)
            CUSTOMERS=50000
            PRODUCTS=5000
            EMPLOYEES=2000
            SALES=250000
            ORDERS=150000
            INVENTORY=20000
            ;;
    esac
    
    # Update the data insertion script with the specified sizes
    sed -i "s/for i in range(1000):/for i in range($CUSTOMERS):/" scripts/clickhouse-init/02-insert-data.py
    sed -i "s/for i in range(200):/for i in range($PRODUCTS):/" scripts/clickhouse-init/02-insert-data.py
    sed -i "s/for i in range(100):/for i in range($EMPLOYEES):/" scripts/clickhouse-init/02-insert-data.py
    sed -i "s/for i in range(10000):/for i in range($SALES):/" scripts/clickhouse-init/02-insert-data.py
    sed -i "s/for i in range(5000):/for i in range($ORDERS):/" scripts/clickhouse-init/02-insert-data.py
    sed -i "s/for product_id in range(1, 201):/for product_id in range(1, $((PRODUCTS + 1))):/" scripts/clickhouse-init/02-insert-data.py
    
    # Copy script to container and run
    cp scripts/clickhouse-init/02-insert-data.py packages/chat2chart/server/scripts/clickhouse-init/
    docker compose exec chat2chart-server python scripts/clickhouse-init/02-insert-data.py
    
    # Restore original script
    git checkout scripts/clickhouse-init/02-insert-data.py 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}🎉 Enterprise Sample Data Warehouse Setup Complete!${NC}"
    echo ""
    echo -e "${BLUE}📊 Warehouse Details:${NC}"
    echo "  Database: aiser_warehouse"
    echo "  Host: localhost (external) / clickhouse (internal)"
    echo "  Port: 8123 (HTTP) / 9000 (Native)"
    echo "  User: aiser"
    echo "  Password: aiser_warehouse_password"
    echo ""
    echo -e "${BLUE}📈 Data Volume ($SAMPLE_DATA_SIZE):${NC}"
    echo "  Customers: $CUSTOMERS"
    echo "  Products: $PRODUCTS"
    echo "  Employees: $EMPLOYEES"
    echo "  Sales Records: $SALES"
    echo "  Orders: $ORDERS"
    echo "  Inventory Records: $INVENTORY"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo "  1. Connect to the warehouse from Aiser platform"
    echo "  2. Use these credentials in Universal Data Source Modal"
    echo "  3. Test AI agents with real enterprise data"
    echo "  4. Stress test performance with large datasets"
    echo ""
    echo -e "${BLUE}🔗 Connection String:${NC}"
    echo "  clickhouse://aiser:aiser_warehouse_password@localhost:8123/aiser_warehouse"
    
else
    echo -e "${YELLOW}⚠️  Sample warehouse is disabled${NC}"
    echo "To enable: $0 --enable-sample-warehouse"
    echo "Or set: ENABLE_SAMPLE_WAREHOUSE=true"
fi

echo ""
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
