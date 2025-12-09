-- ClickHouse Enterprise Data Warehouse Setup
-- This script creates comprehensive enterprise tables with sample data

-- Create database
CREATE DATABASE IF NOT EXISTS aiser_warehouse;

-- Use the database
USE aiser_warehouse;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UInt32,
    customer_code String,
    first_name String,
    last_name String,
    email String,
    phone String,
    company String,
    industry String,
    customer_segment String,
    registration_date Date,
    last_purchase_date Nullable(Date),
    total_spent Decimal(12,2),
    status String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (id, customer_code);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UInt32,
    product_code String,
    product_name String,
    category String,
    subcategory String,
    brand String,
    unit_price Decimal(10,2),
    cost_price Decimal(10,2),
    margin_percent Decimal(5,2),
    launch_date Date,
    status String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (id, product_code);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UInt32,
    employee_code String,
    first_name String,
    last_name String,
    email String,
    department String,
    position String,
    manager_id Nullable(UInt32),
    hire_date Date,
    salary Decimal(10,2),
    commission_rate Decimal(5,2),
    region String,
    status String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (id, employee_code);

-- Create sales table (main fact table)
CREATE TABLE IF NOT EXISTS sales (
    id UInt64,
    sale_date Date,
    product_id UInt32,
    customer_id UInt32,
    employee_id UInt32,
    quantity UInt32,
    unit_price Decimal(10,2),
    total_amount Decimal(12,2),
    region String,
    channel String,
    discount_percent Decimal(5,2),
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (sale_date, product_id, customer_id);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UInt32,
    order_number String,
    customer_id UInt32,
    order_date Date,
    ship_date Nullable(Date),
    delivery_date Nullable(Date),
    status String,
    total_amount Decimal(12,2),
    tax_amount Decimal(10,2),
    shipping_cost Decimal(8,2),
    payment_method String,
    shipping_address String,
    notes Nullable(String),
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (order_date, customer_id);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id UInt32,
    product_id UInt32,
    warehouse_location String,
    current_stock UInt32,
    reserved_stock UInt32,
    reorder_level UInt32,
    max_stock_level UInt32,
    last_updated DateTime DEFAULT now(),
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (product_id, warehouse_location);

-- Create materialized views for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS sales_summary_mv
ENGINE = SummingMergeTree()
ORDER BY (sale_date, region, channel)
AS SELECT
    sale_date,
    region,
    channel,
    count() as total_transactions,
    sum(quantity) as total_quantity,
    sum(total_amount) as total_revenue,
    avg(total_amount) as avg_transaction_value
FROM sales
GROUP BY sale_date, region, channel;

CREATE MATERIALIZED VIEW IF NOT EXISTS customer_summary_mv
ENGINE = SummingMergeTree()
ORDER BY (customer_id)
AS SELECT
    customer_id,
    count() as total_orders,
    sum(total_amount) as total_spent,
    max(order_date) as last_order_date
FROM orders
GROUP BY customer_id;

CREATE MATERIALIZED VIEW IF NOT EXISTS product_performance_mv
ENGINE = SummingMergeTree()
ORDER BY (product_id)
AS SELECT
    product_id,
    count() as total_sales,
    sum(quantity) as total_quantity_sold,
    sum(total_amount) as total_revenue,
    avg(unit_price) as avg_selling_price
FROM sales
GROUP BY product_id;
