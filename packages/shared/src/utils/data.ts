import type { DataColumn } from '../types';

/**
 * Data processing utilities
 */

/**
 * Infer column types from data
 */
export function inferColumnTypes(data: Record<string, any>[]): DataColumn[] {
  if (!data.length) return [];

  const columns: DataColumn[] = [];
  const sampleSize = Math.min(100, data.length);
  const sample = data.slice(0, sampleSize);

  Object.keys(data[0]).forEach(columnName => {
    const values = sample.map(row => row[columnName]).filter(val => val != null);
    
    if (values.length === 0) {
      columns.push({
        name: columnName,
        type: 'string',
        nullable: true,
        unique: false,
      });
      return;
    }

    // Check for date
    if (values.every(val => !isNaN(Date.parse(val)))) {
      columns.push({
        name: columnName,
        type: 'date',
        nullable: values.length < sample.length,
        unique: new Set(values).size === values.length,
      });
      return;
    }

    // Check for number
    if (values.every(val => !isNaN(Number(val)))) {
      const numbers = values.map(Number);
      columns.push({
        name: columnName,
        type: 'number',
        nullable: values.length < sample.length,
        unique: new Set(values).size === values.length,
        statistics: {
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          avg: numbers.reduce((sum, val) => sum + val, 0) / numbers.length,
          count: values.length,
          nullCount: sample.length - values.length,
          uniqueCount: new Set(values).size,
        },
      });
      return;
    }

    // Check for boolean
    if (values.every(val => 
      typeof val === 'boolean' || 
      val === 'true' || val === 'false' ||
      val === 'yes' || val === 'no' ||
      val === '1' || val === '0'
    )) {
      columns.push({
        name: columnName,
        type: 'boolean',
        nullable: values.length < sample.length,
        unique: new Set(values).size === values.length,
      });
      return;
    }

    // Default to string
    columns.push({
      name: columnName,
      type: 'string',
      nullable: values.length < sample.length,
      unique: new Set(values).size === values.length,
      statistics: {
        count: values.length,
        nullCount: sample.length - values.length,
        uniqueCount: new Set(values).size,
      },
    });
  });

  return columns;
}

/**
 * Clean and normalize data
 */
export function cleanData(data: Record<string, any>[]): Record<string, any>[] {
  return data.map(row => {
    const cleanRow: Record<string, any> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      // Clean column names
      const cleanKey = key.trim().replace(/\s+/g, '_').toLowerCase();
      
      // Clean values
      if (value === null || value === undefined || value === '') {
        cleanRow[cleanKey] = null;
      } else if (typeof value === 'string') {
        cleanRow[cleanKey] = value.trim();
      } else {
        cleanRow[cleanKey] = value;
      }
    });
    
    return cleanRow;
  });
}

/**
 * Validate data quality
 */
export function validateDataQuality(data: Record<string, any>[], columns: DataColumn[]) {
  const issues: string[] = [];
  
  if (data.length === 0) {
    issues.push('Dataset is empty');
    return issues;
  }

  columns.forEach(column => {
    const values = data.map(row => row[column.name]);
    const nullCount = values.filter(val => val == null).length;
    const nullPercentage = (nullCount / data.length) * 100;

    if (nullPercentage > 50) {
      issues.push(`Column '${column.name}' has ${nullPercentage.toFixed(1)}% null values`);
    }

    if (column.type === 'number') {
      const invalidNumbers = values.filter(val => val != null && isNaN(Number(val)));
      if (invalidNumbers.length > 0) {
        issues.push(`Column '${column.name}' has ${invalidNumbers.length} invalid number values`);
      }
    }

    if (column.type === 'date') {
      const invalidDates = values.filter(val => val != null && isNaN(Date.parse(val)));
      if (invalidDates.length > 0) {
        issues.push(`Column '${column.name}' has ${invalidDates.length} invalid date values`);
      }
    }
  });

  return issues;
}