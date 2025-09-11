"""
Sample Data Service for AI-Powered Data Analysis
Provides realistic sample datasets for demonstration and learning purposes
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
import pandas as pd
import io


# Helper function to convert numpy types to Python types
def _convert_numpy_types(obj):
    """Convert numpy types to Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, dict):
        return {key: _convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [_convert_numpy_types(item) for item in obj]
    else:
        return obj


class SampleDataService:
    """Service for generating realistic sample datasets for AI analysis"""

    def __init__(self):
        self.sample_datasets = {
            "bank_customers": self._generate_bank_data,
            "ecommerce_sales": self._generate_ecommerce_data,
            "telecom_customers": self._generate_telecom_data,
            "poverty_indicators": self._generate_poverty_data,
        }

    def get_sample_dataset(self, dataset_type: str) -> Dict[str, Any]:
        """Get sample dataset by type"""
        if dataset_type not in self.sample_datasets:
            raise ValueError(f"Unknown dataset type: {dataset_type}")

        generator_func = self.sample_datasets[dataset_type]
        data = generator_func()

        # Convert numpy types to Python types for JSON serialization
        converted_data = _convert_numpy_types(data)

        return {
            "success": True,
            "dataset_type": dataset_type,
            "data": converted_data,
            "summary": _convert_numpy_types(
                self._generate_dataset_summary(dataset_type, data)
            ),
            "sample_queries": self._get_sample_queries(dataset_type),
            "echarts_examples": _convert_numpy_types(
                self._get_echarts_examples(dataset_type)
            ),
        }

    def _generate_bank_data(self) -> Dict[str, Any]:
        """Generate realistic banking customer data"""
        np.random.seed(42)

        # Generate customer data
        n_customers = 1000
        customer_ids = [f"CUST_{i:04d}" for i in range(1, n_customers + 1)]

        # Customer demographics
        ages = np.random.normal(45, 15, n_customers).astype(int)
        ages = np.clip(ages, 18, 80)

        genders = np.random.choice(["Male", "Female"], n_customers)

        # Account types and balances
        account_types = np.random.choice(
            ["Savings", "Checking", "Premium", "Student"],
            n_customers,
            p=[0.4, 0.35, 0.2, 0.05],
        )

        balances = []
        for acc_type in account_types:
            if acc_type == "Premium":
                balance = np.random.lognormal(10, 0.8)  # Higher balances
            elif acc_type == "Student":
                balance = np.random.lognormal(6, 0.5)  # Lower balances
            else:
                balance = np.random.lognormal(8, 0.6)  # Medium balances
            balances.append(round(balance, 2))

        # Transaction data
        transactions = []
        for i in range(n_customers):
            n_transactions = np.random.poisson(
                15
            )  # Average 15 transactions per customer

            for _ in range(n_transactions):
                transaction_date = datetime.now() - timedelta(
                    days=np.random.randint(1, 365)
                )
                amount = np.random.normal(0, 100)
                transaction_type = np.random.choice(
                    ["Deposit", "Withdrawal", "Transfer", "Payment"],
                    p=[0.3, 0.25, 0.25, 0.2],
                )

                transactions.append(
                    {
                        "customer_id": customer_ids[i],
                        "transaction_date": transaction_date.strftime("%Y-%m-%d"),
                        "amount": round(abs(amount), 2),
                        "type": transaction_type,
                        "balance_after": round(balances[i] + amount, 2),
                    }
                )

        # Customer profiles
        customers = []
        for i in range(n_customers):
            customers.append(
                {
                    "customer_id": customer_ids[i],
                    "age": int(ages[i]),
                    "gender": genders[i],
                    "account_type": account_types[i],
                    "balance": balances[i],
                    "join_date": (
                        datetime.now() - timedelta(days=np.random.randint(100, 2000))
                    ).strftime("%Y-%m-%d"),
                    "credit_score": np.random.randint(300, 850),
                    "is_active": np.random.choice([True, False], p=[0.85, 0.15]),
                }
            )

        return {
            "customers": customers,
            "transactions": transactions,
            "metadata": {
                "total_customers": n_customers,
                "total_transactions": len(transactions),
                "date_range": f"{(datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')} to {datetime.now().strftime('%Y-%m-%d')}",
                "currency": "USD",
            },
        }

    def _generate_ecommerce_data(self) -> Dict[str, Any]:
        """Generate realistic e-commerce sales data"""
        np.random.seed(42)

        # Product categories and data
        categories = [
            "Electronics",
            "Clothing",
            "Home & Garden",
            "Books",
            "Sports",
            "Beauty",
            "Toys",
            "Automotive",
        ]
        category_weights = [0.25, 0.20, 0.15, 0.10, 0.10, 0.10, 0.05, 0.05]

        # Generate products
        n_products = 500
        products = []
        for i in range(n_products):
            category = np.random.choice(categories, p=category_weights)
            base_price = np.random.lognormal(3, 0.8)  # Base price around $20

            if category == "Electronics":
                price = base_price * np.random.uniform(1.5, 3.0)
            elif category == "Clothing":
                price = base_price * np.random.uniform(0.8, 1.5)
            else:
                price = base_price * np.random.uniform(0.5, 2.0)

            products.append(
                {
                    "product_id": f"PROD_{i:04d}",
                    "name": f"{category} Product {i + 1}",
                    "category": category,
                    "price": round(price, 2),
                    "cost": round(price * np.random.uniform(0.3, 0.7), 2),
                    "inventory": np.random.randint(0, 100),
                    "rating": round(np.random.uniform(3.0, 5.0), 1),
                }
            )

        # Generate sales data
        n_sales = 2000
        sales = []

        for _ in range(n_sales):
            product = np.random.choice(products)
            quantity = np.random.randint(1, 5)
            sale_date = datetime.now() - timedelta(days=np.random.randint(1, 365))

            # Add seasonal patterns
            month = sale_date.month
            if month in [11, 12]:  # Holiday season
                quantity *= np.random.uniform(1.2, 1.8)
            elif month in [6, 7, 8]:  # Summer
                if product["category"] in ["Sports", "Beauty"]:
                    quantity *= np.random.uniform(1.1, 1.4)

            sales.append(
                {
                    "sale_id": f"SALE_{len(sales):05d}",
                    "product_id": product["product_id"],
                    "product_name": product["name"],
                    "category": product["category"],
                    "quantity": int(quantity),
                    "unit_price": product["price"],
                    "total_amount": round(product["price"] * quantity, 2),
                    "sale_date": sale_date.strftime("%Y-%m-%d"),
                    "customer_segment": np.random.choice(
                        ["New", "Returning", "VIP"], p=[0.4, 0.45, 0.15]
                    ),
                    "payment_method": np.random.choice(
                        ["Credit Card", "PayPal", "Bank Transfer"], p=[0.6, 0.25, 0.15]
                    ),
                }
            )

        return {
            "products": products,
            "sales": sales,
            "metadata": {
                "total_products": n_products,
                "total_sales": n_sales,
                "total_revenue": round(sum(sale["total_amount"] for sale in sales), 2),
                "date_range": f"{(datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')} to {datetime.now().strftime('%Y-%m-%d')}",
                "currency": "USD",
            },
        }

    def _generate_telecom_data(self) -> Dict[str, Any]:
        """Generate realistic telecom customer data"""
        np.random.seed(42)

        # Plan types and features
        plan_types = ["Basic", "Standard", "Premium", "Unlimited"]
        plan_features = {
            "Basic": {"data_gb": 5, "minutes": 500, "sms": 100, "price": 29.99},
            "Standard": {"data_gb": 15, "minutes": 1000, "sms": 500, "price": 49.99},
            "Premium": {"data_gb": 50, "minutes": 2000, "sms": 1000, "price": 79.99},
            "Unlimited": {"data_gb": 999, "minutes": 9999, "sms": 9999, "price": 99.99},
        }

        # Generate customers
        n_customers = 800
        customers = []

        for i in range(n_customers):
            plan = np.random.choice(plan_types, p=[0.3, 0.4, 0.2, 0.1])
            plan_details = plan_features[plan]

            # Customer demographics
            age = np.random.normal(35, 12)
            age = int(np.clip(age, 18, 70))

            # Usage patterns
            data_usage = np.random.normal(
                plan_details["data_gb"] * 0.8, plan_details["data_gb"] * 0.3
            )
            data_usage = max(0, data_usage)

            minutes_used = np.random.normal(
                plan_details["minutes"] * 0.7, plan_details["minutes"] * 0.4
            )
            minutes_used = max(0, minutes_used)

            sms_used = np.random.poisson(plan_details["sms"] * 0.6)

            # Satisfaction score based on plan vs usage
            usage_ratio = min(data_usage / plan_details["data_gb"], 1.0)
            satisfaction_base = 7.0
            if usage_ratio < 0.5:
                satisfaction = satisfaction_base + np.random.uniform(-1, 1)
            elif usage_ratio > 0.9:
                satisfaction = satisfaction_base - np.random.uniform(0, 2)
            else:
                satisfaction = satisfaction_base + np.random.uniform(0, 2)

            satisfaction = round(max(1, min(10, satisfaction)), 1)

            customers.append(
                {
                    "customer_id": f"TEL_{i:04d}",
                    "age": age,
                    "plan_type": plan,
                    "monthly_bill": plan_details["price"],
                    "data_usage_gb": round(data_usage, 2),
                    "minutes_used": int(minutes_used),
                    "sms_used": int(sms_used),
                    "satisfaction_score": satisfaction,
                    "contract_length_months": np.random.choice(
                        [12, 24, 36], p=[0.4, 0.4, 0.2]
                    ),
                    "is_churned": np.random.choice([True, False], p=[0.15, 0.85]),
                    "join_date": (
                        datetime.now() - timedelta(days=np.random.randint(100, 1500))
                    ).strftime("%Y-%m-%d"),
                }
            )

        return {
            "customers": customers,
            "plans": plan_features,
            "metadata": {
                "total_customers": n_customers,
                "churn_rate": round(
                    sum(1 for c in customers if c["is_churned"]) / len(customers) * 100,
                    2,
                ),
                "avg_satisfaction": round(
                    sum(c["satisfaction_score"] for c in customers) / len(customers), 2
                ),
                "avg_monthly_revenue": round(
                    sum(c["monthly_bill"] for c in customers) / len(customers), 2
                ),
                "currency": "USD",
            },
        }

    def _generate_poverty_data(self) -> Dict[str, Any]:
        """Generate realistic poverty indicators data"""
        np.random.seed(42)

        # Regions and demographic factors
        regions = ["North", "South", "East", "West", "Central"]
        urban_rural = ["Urban", "Rural", "Suburban"]

        # Generate regional data
        n_regions = 50
        regional_data = []

        for i in range(n_regions):
            region = np.random.choice(regions)
            area_type = np.random.choice(urban_rural, p=[0.4, 0.3, 0.3])

            # Base poverty rate varies by region and urban/rural
            base_poverty = 0.12  # 12% base rate

            if area_type == "Rural":
                base_poverty *= np.random.uniform(1.2, 1.8)
            elif area_type == "Urban":
                base_poverty *= np.random.uniform(0.8, 1.2)

            # Regional variations
            if region in ["North", "West"]:
                base_poverty *= np.random.uniform(0.7, 1.1)
            elif region in ["South", "Central"]:
                base_poverty *= np.random.uniform(1.0, 1.4)

            poverty_rate = round(base_poverty * 100, 2)

            # Related indicators
            unemployment_rate = round(poverty_rate * np.random.uniform(0.8, 1.5), 2)
            education_level = round(100 - poverty_rate * np.random.uniform(0.5, 1.2), 2)
            healthcare_access = round(
                100 - poverty_rate * np.random.uniform(0.3, 0.8), 2
            )

            regional_data.append(
                {
                    "region_id": f"REG_{i:02d}",
                    "region_name": f"{region} {area_type} Area {i + 1}",
                    "region_type": region,
                    "area_type": area_type,
                    "population": np.random.randint(50000, 500000),
                    "poverty_rate": poverty_rate,
                    "unemployment_rate": unemployment_rate,
                    "education_level": max(0, education_level),
                    "healthcare_access": max(0, healthcare_access),
                    "median_income": np.random.randint(30000, 80000),
                    "gini_coefficient": round(np.random.uniform(0.2, 0.6), 3),
                }
            )

        # Generate demographic breakdown
        demographics = []
        for region_data in regional_data:
            age_groups = ["0-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]

            for age_group in age_groups:
                # Poverty rates vary by age
                age_factor = 1.0
                if age_group in ["0-17", "65+"]:
                    age_factor = np.random.uniform(1.2, 1.6)
                elif age_group in ["18-24"]:
                    age_factor = np.random.uniform(1.1, 1.4)

                poverty_rate = region_data["poverty_rate"] * age_factor

                demographics.append(
                    {
                        "region_id": region_data["region_id"],
                        "age_group": age_group,
                        "poverty_rate": round(poverty_rate, 2),
                        "population_count": int(
                            region_data["population"] * np.random.uniform(0.1, 0.2)
                        ),
                        "education_attainment": round(
                            100 - poverty_rate * np.random.uniform(0.5, 1.0), 2
                        ),
                    }
                )

        return {
            "regional_data": regional_data,
            "demographics": demographics,
            "metadata": {
                "total_regions": n_regions,
                "avg_poverty_rate": round(
                    sum(r["poverty_rate"] for r in regional_data) / len(regional_data),
                    2,
                ),
                "total_population": sum(r["population"] for r in regional_data),
                "analysis_year": datetime.now().year,
                "currency": "USD",
            },
        }

    def _generate_dataset_summary(
        self, dataset_type: str, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate summary statistics for the dataset"""
        if dataset_type == "bank_customers":
            customers = data["customers"]
            transactions = data["transactions"]

            return {
                "total_customers": len(customers),
                "total_transactions": len(transactions),
                "avg_balance": round(
                    sum(c["balance"] for c in customers) / len(customers), 2
                ),
                "avg_age": round(sum(c["age"] for c in customers) / len(customers), 1),
                "account_type_distribution": {
                    acc: sum(1 for c in customers if c["account_type"] == acc)
                    for acc in set(c["account_type"] for c in customers)
                },
                "total_volume": round(sum(t["amount"] for t in transactions), 2),
            }

        elif dataset_type == "ecommerce_sales":
            products = data["products"]
            sales = data["sales"]

            return {
                "total_products": len(products),
                "total_sales": len(sales),
                "total_revenue": round(sum(s["total_amount"] for s in sales), 2),
                "avg_order_value": round(
                    sum(s["total_amount"] for s in sales) / len(sales), 2
                ),
                "category_distribution": {
                    cat: sum(1 for s in sales if s["category"] == cat)
                    for cat in set(s["category"] for s in sales)
                },
                "top_products": sorted(
                    products, key=lambda x: x["rating"], reverse=True
                )[:5],
            }

        elif dataset_type == "telecom_customers":
            customers = data["customers"]

            return {
                "total_customers": len(customers),
                "churn_rate": round(
                    sum(1 for c in customers if c["is_churned"]) / len(customers) * 100,
                    2,
                ),
                "avg_satisfaction": round(
                    sum(c["satisfaction_score"] for c in customers) / len(customers), 2
                ),
                "avg_monthly_revenue": round(
                    sum(c["monthly_bill"] for c in customers) / len(customers), 2
                ),
                "plan_distribution": {
                    plan: sum(1 for c in customers if c["plan_type"] == plan)
                    for plan in set(c["plan_type"] for c in customers)
                },
                "avg_data_usage": round(
                    sum(c["data_usage_gb"] for c in customers) / len(customers), 2
                ),
            }

        elif dataset_type == "poverty_indicators":
            regional_data = data["regional_data"]

            return {
                "total_regions": len(regional_data),
                "avg_poverty_rate": round(
                    sum(r["poverty_rate"] for r in regional_data) / len(regional_data),
                    2,
                ),
                "total_population": sum(r["population"] for r in regional_data),
                "region_distribution": {
                    reg: sum(1 for r in regional_data if r["region_type"] == reg)
                    for reg in set(r["region_type"] for r in regional_data)
                },
                "area_type_distribution": {
                    area: sum(1 for r in regional_data if r["area_type"] == area)
                    for area in set(r["area_type"] for r in regional_data)
                },
                "avg_median_income": round(
                    sum(r["median_income"] for r in regional_data) / len(regional_data),
                    2,
                ),
            }

        return {}

    def _get_sample_queries(self, dataset_type: str) -> List[str]:
        """Get sample queries for each dataset type"""
        queries = {
            "bank_customers": [
                "Analyze customer demographics and show age distribution by account type",
                "What are the transaction patterns by customer segment?",
                "Create a visualization of monthly transaction volumes",
                "Show me customer retention analysis and churn patterns",
                "What's the correlation between credit score and account balance?",
            ],
            "ecommerce_sales": [
                "Analyze sales performance by category and show trends over time",
                "What are the customer behavior patterns and purchase frequency?",
                "Create a chart showing daily sales and seasonal patterns",
                "Show me product performance analysis and inventory insights",
                "What's the revenue distribution by customer segment?",
            ],
            "telecom_customers": [
                "Analyze customer churn patterns and satisfaction scores",
                "What are the usage patterns by plan type?",
                "Create a visualization of customer satisfaction by plan",
                "Show me revenue analysis and customer lifetime value",
                "What factors contribute to customer churn?",
            ],
            "poverty_indicators": [
                "Analyze poverty rates by region and show geographic patterns",
                "What are the demographic factors affecting poverty levels?",
                "Create a chart comparing poverty rates across different areas",
                "Show me the correlation between education and poverty rates",
                "What regional patterns exist in healthcare access and poverty?",
            ],
        }

        return queries.get(dataset_type, [])

    def _get_echarts_examples(self, dataset_type: str) -> List[Dict[str, Any]]:
        """Get sample ECharts configurations for each dataset type"""
        examples = {
            "bank_customers": [
                {
                    "type": "bar",
                    "title": "Customer Age Distribution by Account Type",
                    "description": "Shows age distribution across different account types",
                    "config": self._generate_bank_age_chart(),
                },
                {
                    "type": "line",
                    "title": "Monthly Transaction Volume Trends",
                    "description": "Displays transaction volume patterns over time",
                    "config": self._generate_bank_transaction_chart(),
                },
                {
                    "type": "pie",
                    "title": "Account Type Distribution",
                    "description": "Shows the proportion of different account types",
                    "config": self._generate_bank_account_chart(),
                },
            ],
            "ecommerce_sales": [
                {
                    "type": "bar",
                    "title": "Sales by Category",
                    "description": "Compares sales performance across product categories",
                    "config": self._generate_ecommerce_category_chart(),
                },
                {
                    "type": "line",
                    "title": "Daily Sales Trends",
                    "description": "Shows sales patterns over time with seasonal variations",
                    "config": self._generate_ecommerce_trends_chart(),
                },
                {
                    "type": "scatter",
                    "title": "Price vs Rating Analysis",
                    "description": "Correlates product pricing with customer ratings",
                    "config": self._generate_ecommerce_price_rating_chart(),
                },
            ],
            "telecom_customers": [
                {
                    "type": "bar",
                    "title": "Satisfaction Scores by Plan Type",
                    "description": "Compares customer satisfaction across different plans",
                    "config": self._generate_telecom_satisfaction_chart(),
                },
                {
                    "type": "pie",
                    "title": "Plan Type Distribution",
                    "description": "Shows the proportion of customers by plan type",
                    "config": self._generate_telecom_plan_chart(),
                },
                {
                    "type": "line",
                    "title": "Data Usage Trends",
                    "description": "Displays data consumption patterns over time",
                    "config": self._generate_telecom_usage_chart(),
                },
            ],
            "poverty_indicators": [
                {
                    "type": "bar",
                    "title": "Poverty Rates by Region",
                    "description": "Compares poverty levels across different regions",
                    "config": self._generate_poverty_region_chart(),
                },
                {
                    "type": "scatter",
                    "title": "Education vs Poverty Correlation",
                    "description": "Shows relationship between education levels and poverty rates",
                    "config": self._generate_poverty_education_chart(),
                },
                {
                    "type": "bar",
                    "title": "Healthcare Access by Area Type",
                    "description": "Compares healthcare access across urban/rural areas",
                    "config": self._generate_poverty_healthcare_chart(),
                },
            ],
        }

        return examples.get(dataset_type, [])

    def _generate_bank_age_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for bank customer age distribution"""
        return {
            "title": {
                "text": "Customer Age Distribution by Account Type",
                "left": "center",
            },
            "tooltip": {"trigger": "axis"},
            "legend": {"top": "30px"},
            "xAxis": {
                "type": "category",
                "data": ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"],
            },
            "yAxis": {"type": "value", "name": "Number of Customers"},
            "series": [
                {"name": "Savings", "type": "bar", "data": [45, 78, 120, 95, 67, 34]},
                {"name": "Checking", "type": "bar", "data": [38, 89, 110, 88, 59, 28]},
                {"name": "Premium", "type": "bar", "data": [12, 34, 67, 89, 76, 45]},
                {"name": "Student", "type": "bar", "data": [67, 23, 8, 2, 1, 0]},
            ],
        }

    def _generate_bank_transaction_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for bank transaction trends"""
        return {
            "title": {"text": "Monthly Transaction Volume Trends", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {
                "type": "category",
                "data": [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ],
            },
            "yAxis": {"type": "value", "name": "Transaction Volume ($)"},
            "series": [
                {
                    "name": "Total Transactions",
                    "type": "line",
                    "data": [
                        125000,
                        118000,
                        132000,
                        145000,
                        158000,
                        167000,
                        172000,
                        169000,
                        181000,
                        195000,
                        210000,
                        225000,
                    ],
                    "smooth": True,
                    "itemStyle": {"color": "#1890ff"},
                }
            ],
        }

    def _generate_bank_account_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for bank account distribution"""
        return {
            "title": {"text": "Account Type Distribution", "left": "center"},
            "tooltip": {"trigger": "item"},
            "series": [
                {
                    "name": "Account Types",
                    "type": "pie",
                    "radius": "50%",
                    "data": [
                        {"value": 400, "name": "Savings"},
                        {"value": 350, "name": "Checking"},
                        {"value": 200, "name": "Premium"},
                        {"value": 50, "name": "Student"},
                    ],
                    "emphasis": {
                        "itemStyle": {
                            "shadowBlur": 10,
                            "shadowOffsetX": 0,
                            "shadowColor": "rgba(0, 0, 0, 0.5)",
                        }
                    },
                }
            ],
        }

    def _generate_ecommerce_category_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for e-commerce sales by category"""
        return {
            "title": {"text": "Sales by Category", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {
                "type": "category",
                "data": [
                    "Electronics",
                    "Clothing",
                    "Home & Garden",
                    "Books",
                    "Sports",
                    "Beauty",
                    "Toys",
                    "Automotive",
                ],
            },
            "yAxis": {"type": "value", "name": "Sales ($)"},
            "series": [
                {
                    "name": "Total Sales",
                    "type": "bar",
                    "data": [45000, 38000, 29000, 22000, 18000, 15000, 12000, 10000],
                    "itemStyle": {"color": "#52c41a"},
                }
            ],
        }

    def _generate_ecommerce_trends_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for e-commerce daily trends"""
        return {
            "title": {"text": "Daily Sales Trends (Last 30 Days)", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {
                "type": "category",
                "data": [
                    "Day 1",
                    "Day 5",
                    "Day 10",
                    "Day 15",
                    "Day 20",
                    "Day 25",
                    "Day 30",
                ],
            },
            "yAxis": {"type": "value", "name": "Daily Sales ($)"},
            "series": [
                {
                    "name": "Daily Sales",
                    "type": "line",
                    "data": [1200, 1350, 1180, 1420, 1680, 1890, 2100],
                    "smooth": True,
                    "itemStyle": {"color": "#722ed1"},
                }
            ],
        }

    def _generate_ecommerce_price_rating_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for e-commerce price vs rating"""
        return {
            "title": {"text": "Price vs Rating Analysis", "left": "center"},
            "tooltip": {"trigger": "item"},
            "xAxis": {"type": "value", "name": "Price ($)"},
            "yAxis": {"type": "value", "name": "Rating (1-5)"},
            "series": [
                {
                    "name": "Products",
                    "type": "scatter",
                    "data": [
                        [25, 4.2],
                        [45, 4.5],
                        [120, 4.8],
                        [89, 4.1],
                        [67, 4.6],
                        [156, 4.9],
                        [34, 3.8],
                        [78, 4.3],
                        [200, 4.7],
                        [95, 4.4],
                    ],
                    "itemStyle": {"color": "#fa8c16"},
                }
            ],
        }

    def _generate_telecom_satisfaction_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for telecom satisfaction scores"""
        return {
            "title": {"text": "Satisfaction Scores by Plan Type", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {
                "type": "category",
                "data": ["Basic", "Standard", "Premium", "Unlimited"],
            },
            "yAxis": {"type": "value", "name": "Satisfaction Score (1-10)", "max": 10},
            "series": [
                {
                    "name": "Satisfaction Score",
                    "type": "bar",
                    "data": [6.8, 7.2, 8.1, 8.9],
                    "itemStyle": {"color": "#13c2c2"},
                }
            ],
        }

    def _generate_telecom_plan_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for telecom plan distribution"""
        return {
            "title": {"text": "Plan Type Distribution", "left": "center"},
            "tooltip": {"trigger": "item"},
            "series": [
                {
                    "name": "Plans",
                    "type": "pie",
                    "radius": "50%",
                    "data": [
                        {"value": 240, "name": "Standard"},
                        {"value": 200, "name": "Basic"},
                        {"value": 160, "name": "Premium"},
                        {"value": 80, "name": "Unlimited"},
                    ],
                    "emphasis": {
                        "itemStyle": {
                            "shadowBlur": 10,
                            "shadowOffsetX": 0,
                            "shadowColor": "rgba(0, 0, 0, 0.5)",
                        }
                    },
                }
            ],
        }

    def _generate_telecom_usage_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for telecom data usage"""
        return {
            "title": {"text": "Average Data Usage by Plan", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {
                "type": "category",
                "data": ["Basic", "Standard", "Premium", "Unlimited"],
            },
            "yAxis": {"type": "value", "name": "Data Usage (GB)"},
            "series": [
                {
                    "name": "Data Usage",
                    "type": "line",
                    "data": [3.2, 12.8, 42.5, 78.3],
                    "smooth": True,
                    "itemStyle": {"color": "#eb2f96"},
                }
            ],
        }

    def _generate_poverty_region_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for poverty rates by region"""
        return {
            "title": {"text": "Poverty Rates by Region", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {
                "type": "category",
                "data": ["North", "South", "East", "West", "Central"],
            },
            "yAxis": {"type": "value", "name": "Poverty Rate (%)"},
            "series": [
                {
                    "name": "Poverty Rate",
                    "type": "bar",
                    "data": [8.5, 15.2, 12.8, 9.1, 13.6],
                    "itemStyle": {"color": "#f5222d"},
                }
            ],
        }

    def _generate_poverty_education_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for education vs poverty correlation"""
        return {
            "title": {"text": "Education vs Poverty Correlation", "left": "center"},
            "tooltip": {"trigger": "item"},
            "xAxis": {"type": "value", "name": "Education Level (%)"},
            "yAxis": {"type": "value", "name": "Poverty Rate (%)"},
            "series": [
                {
                    "name": "Regions",
                    "type": "scatter",
                    "data": [
                        [85, 8.5],
                        [72, 15.2],
                        [78, 12.8],
                        [82, 9.1],
                        [75, 13.6],
                        [68, 18.2],
                        [79, 11.9],
                        [81, 10.3],
                        [76, 14.1],
                        [83, 8.9],
                    ],
                    "itemStyle": {"color": "#fa541c"},
                }
            ],
        }

    def _generate_poverty_healthcare_chart(self) -> Dict[str, Any]:
        """Generate pre-built ECharts for healthcare access by area type"""
        return {
            "title": {"text": "Healthcare Access by Area Type", "left": "center"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {"type": "category", "data": ["Urban", "Suburban", "Rural"]},
            "yAxis": {"type": "value", "name": "Healthcare Access (%)"},
            "series": [
                {
                    "name": "Healthcare Access",
                    "type": "bar",
                    "data": [92.5, 88.3, 76.8],
                    "itemStyle": {"color": "#52c41a"},
                }
            ],
        }

    def export_to_csv(self, dataset_type: str) -> str:
        """Export sample dataset to CSV format"""
        data = self.get_sample_dataset(dataset_type)

        if dataset_type == "bank_customers":
            df = pd.DataFrame(data["data"]["customers"])
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            return csv_buffer.getvalue()

        elif dataset_type == "ecommerce_sales":
            df = pd.DataFrame(data["data"]["sales"])
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            return csv_buffer.getvalue()

        elif dataset_type == "telecom_customers":
            df = pd.DataFrame(data["data"]["customers"])
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            return csv_buffer.getvalue()

        elif dataset_type == "poverty_indicators":
            df = pd.DataFrame(data["data"]["regional_data"])
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            return csv_buffer.getvalue()

        return ""


# Global instance
sample_data_service = SampleDataService()
