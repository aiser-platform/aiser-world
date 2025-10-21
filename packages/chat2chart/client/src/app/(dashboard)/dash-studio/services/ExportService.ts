'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// XLSX will be loaded dynamically at runtime if available
declare const XLSX: any;

export interface ExportOptions {
  format: 'png' | 'pdf' | 'csv' | 'excel';
  filename?: string;
  quality?: number;
  includeTitle?: boolean;
  includeTimestamp?: boolean;
  pageSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export interface WidgetData {
  id: string;
  title: string;
  type: string;
  data: any;
  config: any;
}

export class ExportService {
  /**
   * Export dashboard as PNG image
   */
  static async exportAsPNG(
    element: HTMLElement,
    options: ExportOptions = { format: 'png' }
  ): Promise<Blob> {
    const {
      quality = 1,
      includeTitle = true,
      includeTimestamp = true
    } = options;

    try {
      const canvas = await html2canvas(element, {
        scale: quality,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            throw new Error('Failed to create PNG blob');
          }
        }, 'image/png', quality);
      });
    } catch (error) {
      console.error('PNG export failed:', error);
      throw new Error('Failed to export dashboard as PNG');
    }
  }

  /**
   * Export dashboard as PDF
   */
  static async exportAsPDF(
    element: HTMLElement,
    options: ExportOptions = { format: 'pdf' }
  ): Promise<Blob> {
    const {
      pageSize = 'A4',
      orientation = 'landscape',
      includeTitle = true,
      includeTimestamp = true,
      filename = 'dashboard'
    } = options;

    try {
      // First capture as PNG
      const pngBlob = await this.exportAsPNG(element, { ...options, quality: 2 });
      
      // Create PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageSize
      });

      // Get page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Convert blob to base64
      const base64 = await this.blobToBase64(pngBlob);
      
      // Calculate image dimensions to fit page
      const imgWidth = pageWidth - 20; // 10mm margin on each side
      const imgHeight = (imgWidth * element.scrollHeight) / element.scrollWidth;
      
      // Add title if requested
      if (includeTitle) {
        pdf.setFontSize(16);
        pdf.text('Dashboard Export', 10, 15);
        
        if (includeTimestamp) {
          pdf.setFontSize(10);
          pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 20);
        }
        
        // Add image below title
        pdf.addImage(base64, 'PNG', 10, 25, imgWidth, imgHeight);
      } else {
        pdf.addImage(base64, 'PNG', 10, 10, imgWidth, imgHeight);
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export dashboard as PDF');
    }
  }

  /**
   * Export widget data as CSV
   */
  static async exportAsCSV(
    widgets: WidgetData[],
    options: ExportOptions = { format: 'csv' }
  ): Promise<Blob> {
    const { filename = 'dashboard-data' } = options;

    try {
      let csvContent = '';
      
      widgets.forEach((widget, index) => {
        if (index > 0) csvContent += '\n\n';
        
        // Add widget header
        csvContent += `# ${widget.title} (${widget.type})\n`;
        
        // Extract data based on widget type
        const data = this.extractWidgetData(widget);
        
        if (data && data.length > 0) {
          // Add headers
          const headers = Object.keys(data[0]);
          csvContent += headers.join(',') + '\n';
          
          // Add data rows
          data.forEach(row => {
            const values = headers.map(header => {
              const value = row[header];
              // Escape CSV values
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            });
            csvContent += values.join(',') + '\n';
          });
        } else {
          csvContent += 'No data available\n';
        }
      });

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('CSV export failed:', error);
      throw new Error('Failed to export dashboard data as CSV');
    }
  }

  /**
   * Export widget data as Excel
   */
  static async exportAsExcel(
    widgets: WidgetData[],
    options: ExportOptions = { format: 'excel' }
  ): Promise<Blob> {
    const { filename = 'dashboard-data' } = options;

    try {
      if (!XLSX) {
        throw new Error('XLSX library not available. Please install xlsx package.');
      }

      const workbook = XLSX.utils.book_new();
      
      widgets.forEach((widget) => {
        const data = this.extractWidgetData(widget);
        
        if (data && data.length > 0) {
          // Create worksheet
          const worksheet = XLSX.utils.json_to_sheet(data);
          
          // Set column widths
          const colWidths = Object.keys(data[0]).map(key => ({
            wch: Math.max(key.length, 15)
          }));
          worksheet['!cols'] = colWidths;
          
          // Add worksheet to workbook
          const sheetName = widget.title.substring(0, 31); // Excel sheet name limit
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      });

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });
      
      return new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Failed to export dashboard data as Excel');
    }
  }

  /**
   * Download file to user's device
   */
  static downloadFile(blob: Blob, filename: string, mimeType: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Extract data from widget based on type
   */
  private static extractWidgetData(widget: WidgetData): any[] {
    const { type, data, config } = widget;
    
    switch (type) {
      case 'bar':
      case 'line':
      case 'area':
        // Extract series data
        if (data?.series && Array.isArray(data.series)) {
          return data.series.map((series: any, index: number) => ({
            series: series.name || `Series ${index + 1}`,
            category: data.categories?.[index] || `Category ${index + 1}`,
            value: series.data?.[index] || 0
          }));
        }
        break;
        
      case 'pie':
        // Extract pie chart data
        if (data?.series?.[0]?.data) {
          return data.series[0].data.map((item: any) => ({
            name: item.name,
            value: item.value,
            percentage: ((item.value / data.total) * 100).toFixed(2) + '%'
          }));
        }
        break;
        
      case 'table':
        // Extract table data
        if (data?.rows && Array.isArray(data.rows)) {
          return data.rows.map((row: any, index: number) => ({
            row: index + 1,
            ...row
          }));
        }
        break;
        
      case 'kpi':
        // Extract KPI data
        return [{
          metric: widget.title,
          value: data?.value || 0,
          target: data?.target || 0,
          change: data?.change || 0,
          changePercent: data?.changePercent || 0
        }];
        
      default:
        // Generic data extraction
        if (data && typeof data === 'object') {
          return [data];
        }
    }
    
    return [];
  }

  /**
   * Convert blob to base64
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(baseName: string, format: string, includeTimestamp = true): string {
    const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}` : '';
    return `${baseName}${timestamp}.${format}`;
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
