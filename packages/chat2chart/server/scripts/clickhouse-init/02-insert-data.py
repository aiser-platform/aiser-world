#!/usr/bin/env python3
"""
Enterprise ClickHouse Data Warehouse - Configurable Data Generation
Creates comprehensive enterprise sample data with configurable sizes for stress testing
"""

import asyncio
import aiohttp
import json
import random
from datetime import datetime, timedelta
import sys
import os

# ClickHouse connection details
CLICKHOUSE_HOST = os.getenv('CLICKHOUSE_HOST', 'clickhouse')
CLICKHOUSE_PORT = int(os.getenv('CLICKHOUSE_PORT', '8123'))
CLICKHOUSE_DB = os.getenv('CLICKHOUSE_DB', 'aiser_warehouse')
CLICKHOUSE_USER = os.getenv('CLICKHOUSE_USER', 'aiser')
CLICKHOUSE_PASSWORD = os.getenv('CLICKHOUSE_PASSWORD', 'aiser_warehouse_password')

# Configurable data sizes
DATA_SIZE = os.getenv('SAMPLE_DATA_SIZE', 'medium').lower()
DATA_SIZES = {
    'small': {
        'customers': 1000,
        'products': 200,
        'employees': 100,
        'sales': 5000,
        'orders': 3000,
        'inventory': 800
    },
    'medium': {
        'customers': 5000,
        'products': 1000,
        'employees': 500,
        'sales': 25000,
        'orders': 15000,
        'inventory': 4000
    },
    'large': {
        'customers': 10000,
        'products': 2000,
        'employees': 1000,
        'sales': 50000,
        'orders': 30000,
        'inventory': 8000
    },
    'enterprise': {
        'customers': 50000,
        'products': 5000,
        'employees': 2000,
        'sales': 250000,
        'orders': 150000,
        'inventory': 20000
    }
}

# Get data sizes for current configuration
sizes = DATA_SIZES.get(DATA_SIZE, DATA_SIZES['medium'])

# Enterprise sample data arrays
regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa', 'Oceania']
channels = ['Online', 'Retail Store', 'Wholesale', 'Direct Sales', 'Partner', 'Mobile App', 'Marketplace', 'B2B Portal']
industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Government', 'Energy', 'Telecommunications', 'Automotive']
segments = ['Enterprise', 'SMB', 'Consumer', 'Government', 'Non-Profit', 'Startup', 'Enterprise Plus']
departments = ['Sales', 'Marketing', 'Engineering', 'Operations', 'Finance', 'HR', 'Customer Success', 'Product', 'Legal', 'Security']
positions = ['Manager', 'Senior', 'Junior', 'Director', 'VP', 'Analyst', 'Specialist', 'Lead', 'Principal', 'Executive']
categories = ['Electronics', 'Software', 'Services', 'Hardware', 'Consulting', 'Support', 'Cloud', 'AI/ML', 'Security', 'Analytics']
subcategories = ['Laptops', 'Phones', 'Tablets', 'Accessories', 'Cloud', 'On-Premise', 'Mobile', 'Desktop', 'Server', 'Network']
brands = ['TechCorp', 'InnovateLabs', 'FutureSoft', 'DataSystems', 'CloudTech', 'AISolutions', 'NextGen', 'QuantumTech', 'CyberSoft', 'DataFlow']
payment_methods = ['Credit Card', 'Bank Transfer', 'PayPal', 'Check', 'Cash', 'Cryptocurrency', 'Wire Transfer', 'ACH']
order_statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refunded', 'On Hold']
warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Distribution Center', 'Regional Hub', 'Fulfillment Center', 'Cross Dock']

async def insert_enterprise_data():
    """Insert comprehensive enterprise data into ClickHouse"""
    
    print(f"🚀 Enterprise Data Warehouse Setup - {DATA_SIZE.upper()} Configuration")
    print(f"🔌 Connecting to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
    print(f"📊 Data Volume: {sum(sizes.values()):,} total records")
    print("")
    
    # ClickHouse HTTP endpoint
    url = f"http://{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}"
    
    try:
        # Test connection
        async with aiohttp.ClientSession() as session:
            # Test ping
            ping_response = await session.get(f"{url}/ping")
            if ping_response.status != 200:
                raise Exception(f"ClickHouse ping failed: {ping_response.status}")
            
            print("✅ ClickHouse connection successful")
            print("")
            
            # Insert data in order of dependencies
            await insert_customers(session, url, sizes['customers'])
            await insert_products(session, url, sizes['products'])
            await insert_employees(session, url, sizes['employees'])
            await insert_sales(session, url, sizes['sales'], sizes['products'], sizes['customers'], sizes['employees'])
            await insert_orders(session, url, sizes['orders'], sizes['customers'])
            await insert_inventory(session, url, sizes['inventory'], sizes['products'])
            
            print("")
            print("✅ Enterprise data warehouse setup completed!")
            
            return {
                'success': True,
                'database': CLICKHOUSE_DB,
                'host': CLICKHOUSE_HOST,
                'port': CLICKHOUSE_PORT,
                'user': CLICKHOUSE_USER,
                'data_size': DATA_SIZE,
                'tables': ['customers', 'products', 'employees', 'sales', 'orders', 'inventory'],
                'total_records': sum(sizes.values()),
                'credentials': {
                    'host': 'localhost',  # External access
                    'port': 8123,
                    'database': CLICKHOUSE_DB,
                    'username': CLICKHOUSE_USER,
                    'password': CLICKHOUSE_PASSWORD,
                    'connection_string': f"clickhouse://{CLICKHOUSE_USER}:{CLICKHOUSE_PASSWORD}@localhost:8123/{CLICKHOUSE_DB}"
                }
            }
            
    except Exception as e:
        print(f"❌ Error setting up enterprise warehouse: {e}")
        return {'success': False, 'error': str(e)}

async def insert_customers(session, url, count):
    """Insert customer data with realistic enterprise patterns"""
    print(f"📊 Inserting {count:,} customers...")
    
    customers_data = []
    for i in range(count):
        registration_date = datetime.now() - timedelta(days=random.randint(30, 2000))
        last_purchase = datetime.now() - timedelta(days=random.randint(1, 30)) if random.random() > 0.3 else None
        
        # Enterprise customer patterns
        if i < count * 0.1:  # Top 10% enterprise customers
            total_spent = round(random.uniform(50000, 500000), 2)
            segment = 'Enterprise Plus'
        elif i < count * 0.3:  # Next 20% large customers
            total_spent = round(random.uniform(10000, 50000), 2)
            segment = 'Enterprise'
        elif i < count * 0.6:  # Next 30% SMB
            total_spent = round(random.uniform(1000, 10000), 2)
            segment = 'SMB'
        else:  # Remaining 40% consumers
            total_spent = round(random.uniform(100, 1000), 2)
            segment = 'Consumer'
        
        customers_data.append({
            'id': i + 1,
            'customer_code': f'CUST{i+1:06d}',
            'first_name': f'Customer{i+1}',
            'last_name': f'LastName{i+1}',
            'email': f'customer{i+1}@example.com',
            'phone': f'+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}',
            'company': f'Company {i+1}',
            'industry': random.choice(industries),
            'customer_segment': segment,
            'registration_date': registration_date.strftime('%Y-%m-%d'),
            'last_purchase_date': last_purchase.strftime('%Y-%m-%d') if last_purchase else None,
            'total_spent': total_spent,
            'status': 'active'
        })
    
    # Insert in batches for performance
    batch_size = min(500, count // 10)
    for i in range(0, len(customers_data), batch_size):
        batch = customers_data[i:i + batch_size]
        await insert_batch(session, url, 'customers', batch)
    
    print(f"✅ Inserted {len(customers_data):,} customers")

async def insert_products(session, url, count):
    """Insert product data with realistic pricing and categories"""
    print(f"📊 Inserting {count:,} products...")
    
    products_data = []
    for i in range(count):
        # Enterprise product pricing patterns
        if i < count * 0.05:  # Premium products (5%)
            unit_price = round(random.uniform(2000, 10000), 2)
            category = 'Enterprise Software'
        elif i < count * 0.2:  # High-value products (15%)
            unit_price = round(random.uniform(500, 2000), 2)
            category = 'Professional Services'
        elif i < count * 0.5:  # Mid-range products (30%)
            unit_price = round(random.uniform(100, 500), 2)
            category = random.choice(['Electronics', 'Software', 'Hardware'])
        else:  # Standard products (50%)
            unit_price = round(random.uniform(50, 100), 2)
            category = random.choice(categories)
        
        cost_price = round(unit_price * random.uniform(0.3, 0.7), 2)
        margin = round(((unit_price - cost_price) / unit_price) * 100, 2)
        launch_date = datetime.now() - timedelta(days=random.randint(30, 1000))
        
        products_data.append({
            'id': i + 1,
            'product_code': f'PROD{i+1:06d}',
            'product_name': f'Product {i+1}',
            'category': category,
            'subcategory': random.choice(subcategories),
            'brand': random.choice(brands),
            'unit_price': unit_price,
            'cost_price': cost_price,
            'margin_percent': margin,
            'launch_date': launch_date.strftime('%Y-%m-%d'),
            'status': 'active'
        })
    
    await insert_batch(session, url, 'products', products_data)
    print(f"✅ Inserted {len(products_data):,} products")

async def insert_employees(session, url, count):
    """Insert employee data with realistic organizational structure"""
    print(f"📊 Inserting {count:,} employees...")
    
    employees_data = []
    for i in range(count):
        hire_date = datetime.now() - timedelta(days=random.randint(30, 2000))
        
        # Organizational hierarchy
        if i < count * 0.05:  # Executives (5%)
            position = random.choice(['VP', 'Director', 'Executive'])
            salary = round(random.uniform(150000, 300000), 2)
            commission_rate = round(random.uniform(5, 15), 2)
        elif i < count * 0.15:  # Managers (10%)
            position = random.choice(['Manager', 'Lead', 'Principal'])
            salary = round(random.uniform(80000, 150000), 2)
            commission_rate = round(random.uniform(2, 8), 2)
        elif i < count * 0.35:  # Senior staff (20%)
            position = random.choice(['Senior', 'Specialist', 'Analyst'])
            salary = round(random.uniform(60000, 100000), 2)
            commission_rate = round(random.uniform(1, 5), 2)
        else:  # Junior staff (65%)
            position = random.choice(['Junior', 'Associate', 'Coordinator'])
            salary = round(random.uniform(40000, 70000), 2)
            commission_rate = round(random.uniform(0, 3), 2)
        
        employees_data.append({
            'id': i + 1,
            'employee_code': f'EMP{i+1:06d}',
            'first_name': f'Employee{i+1}',
            'last_name': f'LastName{i+1}',
            'email': f'employee{i+1}@company.com',
            'department': random.choice(departments),
            'position': position,
            'manager_id': random.randint(1, count // 10) if random.random() > 0.7 else None,
            'hire_date': hire_date.strftime('%Y-%m-%d'),
            'salary': salary,
            'commission_rate': commission_rate,
            'region': random.choice(regions),
            'status': 'active'
        })
    
    await insert_batch(session, url, 'employees', employees_data)
    print(f"✅ Inserted {len(employees_data):,} employees")

async def insert_sales(session, url, count, product_count, customer_count, employee_count):
    """Insert sales data with realistic patterns and seasonality"""
    print(f"📊 Inserting {count:,} sales records...")
    
    sales_data = []
    for i in range(count):
        # Realistic sales patterns
        sale_date = datetime.now() - timedelta(days=random.randint(1, 365))
        
        # Seasonal patterns
        month = sale_date.month
        if month in [11, 12]:  # Holiday season
            quantity_multiplier = random.uniform(1.5, 3.0)
        elif month in [6, 7, 8]:  # Summer
            quantity_multiplier = random.uniform(1.2, 2.0)
        else:
            quantity_multiplier = random.uniform(0.8, 1.5)
        
        product_id = random.randint(1, product_count)
        customer_id = random.randint(1, customer_count)
        employee_id = random.randint(1, employee_count)
        quantity = max(1, int(random.randint(1, 10) * quantity_multiplier))
        
        # Get product price (simplified - in real scenario would query)
        base_price = random.uniform(50, 2000)
        unit_price = round(base_price, 2)
        
        # Enterprise discount patterns
        if customer_id <= customer_count * 0.1:  # Enterprise customers get discounts
            discount = round(random.uniform(10, 25), 2)
        elif customer_id <= customer_count * 0.3:  # Large customers get moderate discounts
            discount = round(random.uniform(5, 15), 2)
        else:
            discount = round(random.uniform(0, 10), 2)
        
        total_amount = round(quantity * unit_price * (1 - discount/100), 2)
        
        sales_data.append({
            'id': i + 1,
            'sale_date': sale_date.strftime('%Y-%m-%d'),
            'product_id': product_id,
            'customer_id': customer_id,
            'employee_id': employee_id,
            'quantity': quantity,
            'unit_price': unit_price,
            'total_amount': total_amount,
            'region': random.choice(regions),
            'channel': random.choice(channels),
            'discount_percent': discount
        })
    
    # Insert in batches for performance
    batch_size = min(1000, count // 20)
    for i in range(0, len(sales_data), batch_size):
        batch = sales_data[i:i + batch_size]
        await insert_batch(session, url, 'sales', batch)
    
    print(f"✅ Inserted {len(sales_data):,} sales records")

async def insert_orders(session, url, count, customer_count):
    """Insert order data with realistic fulfillment patterns"""
    print(f"📊 Inserting {count:,} orders...")
    
    orders_data = []
    for i in range(count):
        customer_id = random.randint(1, customer_count)
        order_date = datetime.now() - timedelta(days=random.randint(1, 365))
        
        # Realistic fulfillment timeline
        ship_date = order_date + timedelta(days=random.randint(1, 7)) if random.random() > 0.2 else None
        delivery_date = ship_date + timedelta(days=random.randint(1, 14)) if ship_date else None
        
        # Order value patterns
        if customer_id <= customer_count * 0.1:  # Enterprise orders
            total_amount = round(random.uniform(5000, 50000), 2)
            status = random.choice(['Delivered', 'Shipped', 'Processing'])
        elif customer_id <= customer_count * 0.3:  # Large orders
            total_amount = round(random.uniform(1000, 10000), 2)
            status = random.choice(['Delivered', 'Shipped', 'Processing', 'Pending'])
        else:  # Standard orders
            total_amount = round(random.uniform(100, 5000), 2)
            status = random.choice(order_statuses)
        
        orders_data.append({
            'id': i + 1,
            'order_number': f'ORD{i+1:08d}',
            'customer_id': customer_id,
            'order_date': order_date.strftime('%Y-%m-%d'),
            'ship_date': ship_date.strftime('%Y-%m-%d') if ship_date else None,
            'delivery_date': delivery_date.strftime('%Y-%m-%d') if delivery_date else None,
            'status': status,
            'total_amount': total_amount,
            'tax_amount': round(total_amount * random.uniform(0.05, 0.15), 2),
            'shipping_cost': round(random.uniform(10, 100), 2),
            'payment_method': random.choice(payment_methods),
            'shipping_address': f'Address {i+1}',
            'notes': f'Order notes {i+1}' if random.random() > 0.7 else None
        })
    
    # Insert in batches
    batch_size = min(500, count // 20)
    for i in range(0, len(orders_data), batch_size):
        batch = orders_data[i:i + batch_size]
        await insert_batch(session, url, 'orders', batch)
    
    print(f"✅ Inserted {len(orders_data):,} orders")

async def insert_inventory(session, url, count, product_count):
    """Insert inventory data with realistic stock levels"""
    print(f"📊 Inserting {count:,} inventory records...")
    
    inventory_data = []
    record_id = 1
    
    for product_id in range(1, product_count + 1):
        for warehouse in warehouses:
            # Realistic inventory patterns
            if product_id <= product_count * 0.1:  # High-demand products
                current_stock = random.randint(500, 2000)
                reorder_level = random.randint(100, 300)
                max_stock = random.randint(2000, 5000)
            elif product_id <= product_count * 0.3:  # Medium-demand products
                current_stock = random.randint(100, 800)
                reorder_level = random.randint(50, 150)
                max_stock = random.randint(1000, 2500)
            else:  # Low-demand products
                current_stock = random.randint(0, 200)
                reorder_level = random.randint(10, 50)
                max_stock = random.randint(200, 800)
            
            reserved_stock = random.randint(0, min(50, current_stock // 4))
            
            inventory_data.append({
                'id': record_id,
                'product_id': product_id,
                'warehouse_location': warehouse,
                'current_stock': current_stock,
                'reserved_stock': reserved_stock,
                'reorder_level': reorder_level,
                'max_stock_level': max_stock
            })
            record_id += 1
    
    await insert_batch(session, url, 'inventory', inventory_data)
    print(f"✅ Inserted {len(inventory_data):,} inventory records")

async def insert_batch(session, url, table_name, data):
    """Insert a batch of data into ClickHouse with error handling"""
    if not data:
        return
    
    # Convert data to JSON format for ClickHouse
    json_data = '\n'.join([json.dumps(row) for row in data])
    
    query = f"INSERT INTO {CLICKHOUSE_DB}.{table_name} FORMAT JSONEachRow"
    
    try:
        async with session.post(
            f"{url}/",
            data=json_data,
            params={'query': query},
            auth=aiohttp.BasicAuth(CLICKHOUSE_USER, CLICKHOUSE_PASSWORD)
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"ClickHouse insert failed: {response.status} - {error_text}")
    except Exception as e:
        print(f"⚠️  Batch insert warning: {e}")
        # Continue with next batch rather than failing completely

if __name__ == "__main__":
    result = asyncio.run(insert_enterprise_data())
    if result['success']:
        print("\n🎉 Enterprise Data Warehouse Ready!")
        print(f"📊 Database: {result['database']}")
        print(f"🔌 Host: {result['host']}:{result['port']}")
        print(f"👤 User: {result['user']}")
        print(f"📈 Data Size: {result['data_size']}")
        print(f"📋 Tables: {', '.join(result['tables'])}")
        print(f"📊 Total Records: {result['total_records']:,}")
        print("\n💡 Connection Details:")
        creds = result['credentials']
        print(f"  Host: {creds['host']}")
        print(f"  Port: {creds['port']}")
        print(f"  Database: {creds['database']}")
        print(f"  Username: {creds['username']}")
        print(f"  Password: {creds['password']}")
        print(f"  Connection String: {creds['connection_string']}")
        print("\n🚀 Ready for enterprise analytics and AI-powered insights!")
    else:
        print(f"❌ Setup failed: {result['error']}")
        sys.exit(1)