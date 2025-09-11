"""
YAML Schema Management Service
Handles YAML schema generation, validation, and user verification workflow
"""

import logging
import yaml
import json
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class YAMLSchemaService:
    """Service for managing YAML schemas with user verification workflow"""

    def __init__(self):
        self.schema_dir = Path("./schemas")
        self.schema_dir.mkdir(exist_ok=True)

        # Schema templates for different data source types
        self.schema_templates = {
            "database": self._get_database_schema_template(),
            "file": self._get_file_schema_template(),
            "api": self._get_api_schema_template(),
            "warehouse": self._get_warehouse_schema_template(),
        }

    async def generate_yaml_schema(
        self,
        data_source_id: str,
        data_source_type: str,
        raw_schema: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate YAML schema from raw schema data"""
        try:
            logger.info(
                f"📋 Generating YAML schema for {data_source_type} data source: {data_source_id}"
            )

            # Get base template
            self.schema_templates.get(
                data_source_type, self.schema_templates["database"]
            )

            # Generate schema based on data source type
            if data_source_type == "database":
                yaml_schema = await self._generate_database_yaml_schema(
                    data_source_id, raw_schema, user_preferences
                )
            elif data_source_type == "file":
                yaml_schema = await self._generate_file_yaml_schema(
                    data_source_id, raw_schema, user_preferences
                )
            elif data_source_type == "api":
                yaml_schema = await self._generate_api_yaml_schema(
                    data_source_id, raw_schema, user_preferences
                )
            elif data_source_type == "warehouse":
                yaml_schema = await self._generate_warehouse_yaml_schema(
                    data_source_id, raw_schema, user_preferences
                )
            else:
                yaml_schema = await self._generate_generic_yaml_schema(
                    data_source_id, raw_schema, user_preferences
                )

            # Add metadata
            yaml_schema["metadata"] = {
                "generated_at": datetime.now().isoformat(),
                "data_source_id": data_source_id,
                "data_source_type": data_source_type,
                "version": "1.0.0",
                "status": "draft",
                "user_verified": False,
                "last_modified": datetime.now().isoformat(),
            }

            # Save YAML schema
            schema_file = await self._save_yaml_schema(yaml_schema, data_source_id)

            logger.info(f"✅ YAML schema generated successfully: {schema_file}")

            return {
                "success": True,
                "schema": yaml_schema,
                "schema_file": str(schema_file),
                "verification_required": True,
                "message": "YAML schema generated successfully. Please review and verify the schema.",
            }

        except Exception as e:
            logger.error(f"❌ YAML schema generation failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def validate_yaml_schema(
        self, schema_content: Union[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate YAML schema structure and content"""
        try:
            logger.info("🔍 Validating YAML schema")

            # Parse YAML if string
            if isinstance(schema_content, str):
                try:
                    schema = yaml.safe_load(schema_content)
                except yaml.YAMLError as e:
                    return {"success": False, "error": f"Invalid YAML format: {str(e)}"}
            else:
                schema = schema_content

            # Validate required fields
            required_fields = ["data_source", "tables", "metadata"]
            missing_fields = [field for field in required_fields if field not in schema]

            if missing_fields:
                return {
                    "success": False,
                    "error": f"Missing required fields: {missing_fields}",
                }

            # Validate data source configuration
            data_source = schema.get("data_source", {})
            if not data_source.get("name") or not data_source.get("type"):
                return {
                    "success": False,
                    "error": "Data source must have name and type",
                }

            # Validate tables
            tables = schema.get("tables", [])
            if not tables:
                return {
                    "success": False,
                    "error": "Schema must contain at least one table",
                }

            # Validate each table
            table_errors = []
            for i, table in enumerate(tables):
                table_errors.extend(self._validate_table_structure(table, i))

            if table_errors:
                return {
                    "success": False,
                    "error": "Table validation errors",
                    "details": table_errors,
                }

            # Validate relationships if present
            relationships = schema.get("relationships", [])
            relationship_errors = []
            for i, rel in enumerate(relationships):
                relationship_errors.extend(
                    self._validate_relationship_structure(rel, i)
                )

            if relationship_errors:
                return {
                    "success": False,
                    "error": "Relationship validation errors",
                    "details": relationship_errors,
                }

            logger.info("✅ YAML schema validation successful")

            return {
                "success": True,
                "message": "YAML schema is valid",
                "statistics": {
                    "tables_count": len(tables),
                    "relationships_count": len(relationships),
                    "total_columns": sum(
                        len(table.get("columns", [])) for table in tables
                    ),
                },
            }

        except Exception as e:
            logger.error(f"❌ YAML schema validation failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_schema_for_verification(self, data_source_id: str) -> Dict[str, Any]:
        """Get YAML schema for user verification"""
        try:
            logger.info(f"🔍 Getting schema for verification: {data_source_id}")

            schema_file = self.schema_dir / f"{data_source_id}_schema.yaml"

            if not schema_file.exists():
                return {
                    "success": False,
                    "error": f"Schema file not found for data source: {data_source_id}",
                }

            # Load YAML schema
            with open(schema_file, "r") as f:
                schema = yaml.safe_load(f)

            # Prepare verification data
            verification_data = {
                "data_source_id": data_source_id,
                "schema": schema,
                "verification_checklist": self._generate_verification_checklist(schema),
                "suggestions": await self._generate_schema_suggestions(schema),
                "preview": await self._generate_schema_preview(schema),
            }

            logger.info(f"✅ Schema verification data prepared for: {data_source_id}")

            return {"success": True, "verification_data": verification_data}

        except Exception as e:
            logger.error(f"❌ Failed to get schema for verification: {str(e)}")
            return {"success": False, "error": str(e)}

    async def update_schema_from_verification(
        self, data_source_id: str, user_feedback: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update schema based on user verification feedback"""
        try:
            logger.info(f"📝 Updating schema from user verification: {data_source_id}")

            schema_file = self.schema_dir / f"{data_source_id}_schema.yaml"

            if not schema_file.exists():
                return {
                    "success": False,
                    "error": f"Schema file not found for data source: {data_source_id}",
                }

            # Load current schema
            with open(schema_file, "r") as f:
                current_schema = yaml.safe_load(f)

            # Apply user feedback
            updated_schema = await self._apply_user_feedback(
                current_schema, user_feedback
            )

            # Update metadata
            updated_schema["metadata"].update(
                {
                    "user_verified": True,
                    "verification_date": datetime.now().isoformat(),
                    "last_modified": datetime.now().isoformat(),
                    "user_feedback": user_feedback,
                }
            )

            # Save updated schema
            await self._save_yaml_schema(updated_schema, data_source_id)

            # Generate Cube.js schema from verified YAML
            cube_schema = await self._generate_cube_schema_from_yaml(updated_schema)

            logger.info(f"✅ Schema updated from user verification: {data_source_id}")

            return {
                "success": True,
                "updated_schema": updated_schema,
                "cube_schema": cube_schema,
                "message": "Schema updated successfully based on user verification",
            }

        except Exception as e:
            logger.error(f"❌ Failed to update schema from verification: {str(e)}")
            return {"success": False, "error": str(e)}

    async def export_schema(
        self, data_source_id: str, format: str = "yaml"
    ) -> Dict[str, Any]:
        """Export schema in various formats"""
        try:
            logger.info(f"📤 Exporting schema in {format} format: {data_source_id}")

            schema_file = self.schema_dir / f"{data_source_id}_schema.yaml"

            if not schema_file.exists():
                return {
                    "success": False,
                    "error": f"Schema file not found for data source: {data_source_id}",
                }

            # Load schema
            with open(schema_file, "r") as f:
                schema = yaml.safe_load(f)

            # Export in requested format
            if format.lower() == "yaml":
                export_content = yaml.dump(
                    schema, default_flow_style=False, sort_keys=False
                )
                content_type = "text/yaml"
                file_extension = "yaml"
            elif format.lower() == "json":
                export_content = json.dumps(schema, indent=2)
                content_type = "application/json"
                file_extension = "json"
            elif format.lower() == "cube":
                cube_schema = await self._generate_cube_schema_from_yaml(schema)
                export_content = self._format_cube_schema(cube_schema)
                content_type = "text/javascript"
                file_extension = "js"
            else:
                return {
                    "success": False,
                    "error": f"Unsupported export format: {format}",
                }

            # Save export file
            export_file = self.schema_dir / f"{data_source_id}_export.{file_extension}"
            with open(export_file, "w") as f:
                f.write(export_content)

            logger.info(f"✅ Schema exported successfully: {export_file}")

            return {
                "success": True,
                "export_file": str(export_file),
                "content_type": content_type,
                "format": format,
                "content": export_content,
            }

        except Exception as e:
            logger.error(f"❌ Schema export failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # Private helper methods
    async def _generate_database_yaml_schema(
        self,
        data_source_id: str,
        raw_schema: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate YAML schema for database data source"""
        tables = raw_schema.get("tables", [])

        yaml_schema = {
            "data_source": {
                "id": data_source_id,
                "name": raw_schema.get("name", f"Database_{data_source_id}"),
                "type": "database",
                "connection": {
                    "host": raw_schema.get("host", "localhost"),
                    "port": raw_schema.get("port", 5432),
                    "database": raw_schema.get("database", "unknown"),
                    "schema": raw_schema.get("schema", "public"),
                },
            },
            "tables": [],
            "relationships": [],
            "settings": {
                "auto_refresh": True,
                "cache_ttl": 3600,
                "pre_aggregation": True,
                "time_dimensions": True,
            },
        }

        # Process tables
        for table in tables:
            yaml_table = {
                "name": table.get("name", "unknown_table"),
                "schema": table.get("schema", "public"),
                "description": table.get("description", ""),
                "columns": [],
                "indexes": table.get("indexes", []),
                "constraints": table.get("constraints", []),
                "row_count": table.get("row_count", 0),
                "settings": {
                    "enabled": True,
                    "refresh_interval": 3600,
                    "pre_aggregation": True,
                },
            }

            # Process columns
            for column in table.get("columns", []):
                yaml_column = {
                    "name": column.get("name", "unknown_column"),
                    "type": column.get("type", "string"),
                    "nullable": column.get("nullable", True),
                    "primary_key": column.get("primary_key", False),
                    "foreign_key": column.get("foreign_key"),
                    "default_value": column.get("default"),
                    "description": column.get("description", ""),
                    "cube_settings": {
                        "measure": self._is_measure_column(column),
                        "dimension": self._is_dimension_column(column),
                        "time_dimension": self._is_time_dimension_column(column),
                    },
                }
                yaml_table["columns"].append(yaml_column)

            yaml_schema["tables"].append(yaml_table)

        # Generate relationships
        yaml_schema["relationships"] = await self._generate_relationships(tables)

        return yaml_schema

    async def _generate_file_yaml_schema(
        self,
        data_source_id: str,
        raw_schema: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate YAML schema for file data source"""
        columns = raw_schema.get("columns", [])

        yaml_schema = {
            "data_source": {
                "id": data_source_id,
                "name": raw_schema.get("name", f"File_{data_source_id}"),
                "type": "file",
                "file_info": {
                    "format": raw_schema.get("format", "csv"),
                    "size": raw_schema.get("size", 0),
                    "row_count": raw_schema.get("row_count", 0),
                    "encoding": raw_schema.get("encoding", "utf-8"),
                    "delimiter": raw_schema.get("delimiter", ","),
                },
            },
            "tables": [
                {
                    "name": "main_table",
                    "schema": "public",
                    "description": "Main data table from file",
                    "columns": [],
                    "settings": {
                        "enabled": True,
                        "refresh_interval": 0,  # Files don't auto-refresh
                        "pre_aggregation": True,
                    },
                }
            ],
            "relationships": [],
            "settings": {
                "auto_refresh": False,
                "cache_ttl": 7200,
                "pre_aggregation": True,
                "time_dimensions": True,
            },
        }

        # Process columns
        for column in columns:
            yaml_column = {
                "name": column.get("name", "unknown_column"),
                "type": column.get("type", "string"),
                "nullable": column.get("nullable", True),
                "description": column.get("description", ""),
                "statistics": column.get("statistics", {}),
                "cube_settings": {
                    "measure": self._is_measure_column(column),
                    "dimension": self._is_dimension_column(column),
                    "time_dimension": self._is_time_dimension_column(column),
                },
            }
            yaml_schema["tables"][0]["columns"].append(yaml_column)

        return yaml_schema

    async def _generate_api_yaml_schema(
        self,
        data_source_id: str,
        raw_schema: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate YAML schema for API data source"""
        # Similar to file schema but with API-specific settings
        yaml_schema = await self._generate_file_yaml_schema(
            data_source_id, raw_schema, user_preferences
        )

        # Update data source type and add API-specific settings
        yaml_schema["data_source"]["type"] = "api"
        yaml_schema["data_source"]["api_info"] = {
            "endpoint": raw_schema.get("endpoint", ""),
            "method": raw_schema.get("method", "GET"),
            "auth_type": raw_schema.get("auth_type", "none"),
            "rate_limit": raw_schema.get("rate_limit", 1000),
        }

        yaml_schema["settings"]["auto_refresh"] = True
        yaml_schema["settings"]["cache_ttl"] = 1800  # Shorter cache for API data

        return yaml_schema

    async def _generate_warehouse_yaml_schema(
        self,
        data_source_id: str,
        raw_schema: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate YAML schema for warehouse data source"""
        # Similar to database schema but with warehouse-specific settings
        yaml_schema = await self._generate_database_yaml_schema(
            data_source_id, raw_schema, user_preferences
        )

        # Update data source type and add warehouse-specific settings
        yaml_schema["data_source"]["type"] = "warehouse"
        yaml_schema["data_source"]["warehouse_info"] = {
            "provider": raw_schema.get("provider", "unknown"),
            "warehouse": raw_schema.get("warehouse", ""),
            "account": raw_schema.get("account", ""),
            "region": raw_schema.get("region", ""),
        }

        yaml_schema["settings"]["pre_aggregation"] = True
        yaml_schema["settings"]["cache_ttl"] = 7200  # Longer cache for warehouse data

        return yaml_schema

    async def _generate_generic_yaml_schema(
        self,
        data_source_id: str,
        raw_schema: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Generate generic YAML schema"""
        return {
            "data_source": {
                "id": data_source_id,
                "name": raw_schema.get("name", f"Data_Source_{data_source_id}"),
                "type": raw_schema.get("type", "unknown"),
            },
            "tables": [],
            "relationships": [],
            "settings": {
                "auto_refresh": False,
                "cache_ttl": 3600,
                "pre_aggregation": False,
                "time_dimensions": False,
            },
        }

    def _is_measure_column(self, column: Dict[str, Any]) -> bool:
        """Determine if column should be a measure"""
        column_type = column.get("type", "").lower()
        return column_type in [
            "int",
            "integer",
            "bigint",
            "smallint",
            "decimal",
            "numeric",
            "float",
            "double",
            "real",
        ]

    def _is_dimension_column(self, column: Dict[str, Any]) -> bool:
        """Determine if column should be a dimension"""
        column_type = column.get("type", "").lower()
        return column_type in ["string", "varchar", "text", "char", "boolean", "enum"]

    def _is_time_dimension_column(self, column: Dict[str, Any]) -> bool:
        """Determine if column should be a time dimension"""
        column_type = column.get("type", "").lower()
        column_name = column.get("name", "").lower()

        time_types = ["date", "datetime", "timestamp", "time"]
        time_keywords = ["date", "time", "created", "updated", "modified", "timestamp"]

        return column_type in time_types or any(
            keyword in column_name for keyword in time_keywords
        )

    async def _generate_relationships(
        self, tables: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate relationships between tables"""
        relationships = []

        for table in tables:
            table_name = table.get("name")
            columns = table.get("columns", [])

            for column in columns:
                if column.get("foreign_key"):
                    relationships.append(
                        {
                            "name": f"{table_name}_{column['name']}_fk",
                            "type": "foreign_key",
                            "from_table": table_name,
                            "from_column": column["name"],
                            "to_table": column["foreign_key"].split(".")[0],
                            "to_column": column["foreign_key"].split(".")[1]
                            if "." in column["foreign_key"]
                            else "id",
                            "description": f"Foreign key relationship from {table_name}.{column['name']}",
                        }
                    )

        return relationships

    async def _save_yaml_schema(
        self, schema: Dict[str, Any], data_source_id: str
    ) -> Path:
        """Save YAML schema to file"""
        schema_file = self.schema_dir / f"{data_source_id}_schema.yaml"

        with open(schema_file, "w") as f:
            yaml.dump(schema, f, default_flow_style=False, sort_keys=False, indent=2)

        return schema_file

    def _validate_table_structure(self, table: Dict[str, Any], index: int) -> List[str]:
        """Validate table structure"""
        errors = []

        if not table.get("name"):
            errors.append(f"Table {index}: Missing name")

        if not table.get("columns"):
            errors.append(f"Table {index}: Missing columns")
        else:
            for i, column in enumerate(table["columns"]):
                if not column.get("name"):
                    errors.append(f"Table {index}, Column {i}: Missing name")
                if not column.get("type"):
                    errors.append(f"Table {index}, Column {i}: Missing type")

        return errors

    def _validate_relationship_structure(
        self, relationship: Dict[str, Any], index: int
    ) -> List[str]:
        """Validate relationship structure"""
        errors = []

        required_fields = [
            "name",
            "type",
            "from_table",
            "from_column",
            "to_table",
            "to_column",
        ]
        for field in required_fields:
            if not relationship.get(field):
                errors.append(f"Relationship {index}: Missing {field}")

        return errors

    def _generate_verification_checklist(
        self, schema: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate verification checklist for user"""
        checklist = []

        # Data source verification
        checklist.append(
            {
                "category": "Data Source",
                "items": [
                    {"item": "Data source name is correct", "required": True},
                    {"item": "Data source type is accurate", "required": True},
                    {"item": "Connection details are correct", "required": True},
                ],
            }
        )

        # Tables verification
        tables = schema.get("tables", [])
        for table in tables:
            checklist.append(
                {
                    "category": f"Table: {table.get('name', 'Unknown')}",
                    "items": [
                        {"item": "Table name is correct", "required": True},
                        {"item": "Column names are accurate", "required": True},
                        {"item": "Data types are correct", "required": True},
                        {"item": "Primary keys are identified", "required": False},
                        {"item": "Foreign keys are identified", "required": False},
                    ],
                }
            )

        # Relationships verification
        relationships = schema.get("relationships", [])
        if relationships:
            checklist.append(
                {
                    "category": "Relationships",
                    "items": [
                        {
                            "item": "Foreign key relationships are correct",
                            "required": True,
                        },
                        {
                            "item": "Relationship names are meaningful",
                            "required": False,
                        },
                    ],
                }
            )

        return checklist

    async def _generate_schema_suggestions(
        self, schema: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for schema improvement"""
        suggestions = []

        tables = schema.get("tables", [])

        for table in tables:
            table_name = table.get("name", "")
            columns = table.get("columns", [])

            # Check for missing primary keys
            has_primary_key = any(col.get("primary_key", False) for col in columns)
            if not has_primary_key:
                suggestions.append(
                    {
                        "type": "warning",
                        "table": table_name,
                        "message": "No primary key identified. Consider adding a primary key column.",
                        "suggestion": "Add an id column with primary_key: true",
                    }
                )

            # Check for potential time dimensions
            time_columns = [
                col for col in columns if self._is_time_dimension_column(col)
            ]
            if not time_columns:
                suggestions.append(
                    {
                        "type": "info",
                        "table": table_name,
                        "message": "No time dimension columns found. Consider adding date/time columns for time-based analysis.",
                        "suggestion": "Add columns like created_at, updated_at, or date fields",
                    }
                )

            # Check for potential measures
            measure_columns = [col for col in columns if self._is_measure_column(col)]
            if not measure_columns:
                suggestions.append(
                    {
                        "type": "info",
                        "table": table_name,
                        "message": "No numeric columns found for measures. Consider adding numeric columns for aggregations.",
                        "suggestion": "Add columns like amount, quantity, count, or other numeric fields",
                    }
                )

        return suggestions

    async def _generate_schema_preview(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Generate schema preview for user review"""
        tables = schema.get("tables", [])

        preview = {
            "data_source": schema.get("data_source", {}),
            "summary": {
                "total_tables": len(tables),
                "total_columns": sum(len(table.get("columns", [])) for table in tables),
                "total_relationships": len(schema.get("relationships", [])),
                "estimated_measures": sum(
                    len(
                        [
                            col
                            for col in table.get("columns", [])
                            if self._is_measure_column(col)
                        ]
                    )
                    for table in tables
                ),
                "estimated_dimensions": sum(
                    len(
                        [
                            col
                            for col in table.get("columns", [])
                            if self._is_dimension_column(col)
                        ]
                    )
                    for table in tables
                ),
                "estimated_time_dimensions": sum(
                    len(
                        [
                            col
                            for col in table.get("columns", [])
                            if self._is_time_dimension_column(col)
                        ]
                    )
                    for table in tables
                ),
            },
            "tables_preview": [],
        }

        # Generate table previews
        for table in tables[:5]:  # Limit to first 5 tables for preview
            table_preview = {
                "name": table.get("name", ""),
                "columns_count": len(table.get("columns", [])),
                "row_count": table.get("row_count", 0),
                "sample_columns": [
                    {
                        "name": col.get("name", ""),
                        "type": col.get("type", ""),
                        "is_measure": self._is_measure_column(col),
                        "is_dimension": self._is_dimension_column(col),
                        "is_time_dimension": self._is_time_dimension_column(col),
                    }
                    for col in table.get("columns", [])[:5]  # First 5 columns
                ],
            }
            preview["tables_preview"].append(table_preview)

        return preview

    async def _apply_user_feedback(
        self, schema: Dict[str, Any], user_feedback: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply user feedback to schema"""
        updated_schema = schema.copy()

        # Apply table-level changes
        if "table_changes" in user_feedback:
            for change in user_feedback["table_changes"]:
                table_name = change.get("table_name")
                if table_name:
                    # Find and update table
                    for table in updated_schema.get("tables", []):
                        if table.get("name") == table_name:
                            if "new_name" in change:
                                table["name"] = change["new_name"]
                            if "description" in change:
                                table["description"] = change["description"]
                            break

        # Apply column-level changes
        if "column_changes" in user_feedback:
            for change in user_feedback["column_changes"]:
                table_name = change.get("table_name")
                column_name = change.get("column_name")

                if table_name and column_name:
                    # Find and update column
                    for table in updated_schema.get("tables", []):
                        if table.get("name") == table_name:
                            for column in table.get("columns", []):
                                if column.get("name") == column_name:
                                    if "new_name" in change:
                                        column["name"] = change["new_name"]
                                    if "description" in change:
                                        column["description"] = change["description"]
                                    if "cube_settings" in change:
                                        column["cube_settings"] = change[
                                            "cube_settings"
                                        ]
                                    break

        # Apply relationship changes
        if "relationship_changes" in user_feedback:
            updated_schema["relationships"] = user_feedback["relationship_changes"]

        return updated_schema

    async def _generate_cube_schema_from_yaml(
        self, yaml_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate Cube.js schema from verified YAML schema"""
        cube_schema = {
            "cubes": [],
            "generated_from": "yaml_schema",
            "generated_at": datetime.now().isoformat(),
        }

        tables = yaml_schema.get("tables", [])

        for table in tables:
            cube = {
                "name": table.get("name", "unknown_table"),
                "sql": f"SELECT * FROM {table.get('schema', 'public')}.{table.get('name', 'unknown_table')}",
                "measures": [],
                "dimensions": [],
                "preAggregations": {},
            }

            # Process columns
            for column in table.get("columns", []):
                column_name = column.get("name", "")
                cube_settings = column.get("cube_settings", {})

                if cube_settings.get("measure"):
                    cube["measures"].append(
                        {
                            "name": column_name,
                            "sql": column_name,
                            "type": "sum",
                            "title": column_name.replace("_", " ").title(),
                        }
                    )
                elif cube_settings.get("dimension"):
                    cube["dimensions"].append(
                        {
                            "name": column_name,
                            "sql": column_name,
                            "type": "string",
                            "title": column_name.replace("_", " ").title(),
                        }
                    )
                elif cube_settings.get("time_dimension"):
                    cube["dimensions"].append(
                        {
                            "name": column_name,
                            "sql": column_name,
                            "type": "time",
                            "title": column_name.replace("_", " ").title(),
                        }
                    )

            # Add pre-aggregation if enabled
            if table.get("settings", {}).get("pre_aggregation", True):
                cube["preAggregations"] = {
                    "main": {
                        "type": "rollup",
                        "measures": [m["name"] for m in cube["measures"]],
                        "dimensions": [d["name"] for d in cube["dimensions"]],
                        "granularity": "day",
                    }
                }

            cube_schema["cubes"].append(cube)

        return cube_schema

    def _format_cube_schema(self, cube_schema: Dict[str, Any]) -> str:
        """Format Cube.js schema as JavaScript"""
        js_lines = []

        for cube in cube_schema.get("cubes", []):
            js_lines.append(f"cube('{cube['name']}', {{")
            js_lines.append(f"  sql: `{cube['sql']}`,")

            if cube.get("measures"):
                js_lines.append("  measures: {")
                for measure in cube["measures"]:
                    js_lines.append(f"    {measure['name']}: {{")
                    js_lines.append(f"      type: '{measure['type']}',")
                    js_lines.append(f"      sql: `${{{measure['sql']}}}`,")
                    js_lines.append(f"      title: '{measure['title']}'")
                    js_lines.append("    },")
                js_lines.append("  },")

            if cube.get("dimensions"):
                js_lines.append("  dimensions: {")
                for dimension in cube["dimensions"]:
                    js_lines.append(f"    {dimension['name']}: {{")
                    js_lines.append(f"      type: '{dimension['type']}',")
                    js_lines.append(f"      sql: `${{{dimension['sql']}}}`,")
                    js_lines.append(f"      title: '{dimension['title']}'")
                    js_lines.append("    },")
                js_lines.append("  },")

            if cube.get("preAggregations"):
                js_lines.append("  preAggregations: {")
                for agg_name, agg_config in cube["preAggregations"].items():
                    js_lines.append(f"    {agg_name}: {{")
                    js_lines.append(f"      type: '{agg_config['type']}',")
                    js_lines.append(
                        f"      measures: {json.dumps(agg_config['measures'])},"
                    )
                    js_lines.append(
                        f"      dimensions: {json.dumps(agg_config['dimensions'])},"
                    )
                    js_lines.append(f"      granularity: '{agg_config['granularity']}'")
                    js_lines.append("    },")
                js_lines.append("  }")

            js_lines.append("});")
            js_lines.append("")

        return "\n".join(js_lines)

    def _get_database_schema_template(self) -> Dict[str, Any]:
        """Get database schema template"""
        return {
            "data_source": {"type": "database", "connection": {}},
            "tables": [],
            "relationships": [],
            "settings": {
                "auto_refresh": True,
                "cache_ttl": 3600,
                "pre_aggregation": True,
                "time_dimensions": True,
            },
        }

    def _get_file_schema_template(self) -> Dict[str, Any]:
        """Get file schema template"""
        return {
            "data_source": {"type": "file", "file_info": {}},
            "tables": [],
            "relationships": [],
            "settings": {
                "auto_refresh": False,
                "cache_ttl": 7200,
                "pre_aggregation": True,
                "time_dimensions": True,
            },
        }

    def _get_api_schema_template(self) -> Dict[str, Any]:
        """Get API schema template"""
        return {
            "data_source": {"type": "api", "api_info": {}},
            "tables": [],
            "relationships": [],
            "settings": {
                "auto_refresh": True,
                "cache_ttl": 1800,
                "pre_aggregation": True,
                "time_dimensions": True,
            },
        }

    def _get_warehouse_schema_template(self) -> Dict[str, Any]:
        """Get warehouse schema template"""
        return {
            "data_source": {"type": "warehouse", "warehouse_info": {}},
            "tables": [],
            "relationships": [],
            "settings": {
                "auto_refresh": True,
                "cache_ttl": 7200,
                "pre_aggregation": True,
                "time_dimensions": True,
            },
        }
