/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to Excel format (using HTML table method)
 */
export function exportToExcel(data: any[], filename: string) {
  if (data.length === 0) {
    return;
  }

  const headers = Object.keys(data[0]);
  
  // Create HTML table
  let html = '<table><thead><tr>';
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  data.forEach(row => {
    html += '<tr>';
    headers.forEach(header => {
      const value = row[header] ?? '';
      html += `<td>${value}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';

  // Create blob and download
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format data for export (flatten nested objects, format dates)
 */
export function formatForExport(data: any[]): any[] {
  return data.map(item => {
    const formatted: any = {};
    
    Object.keys(item).forEach(key => {
      const value = item[key];
      
      // Format dates
      if (value instanceof Date) {
        formatted[key] = value.toLocaleDateString('tr-TR');
      }
      // Handle null/undefined
      else if (value === null || value === undefined) {
        formatted[key] = '';
      }
      // Handle nested objects (flatten)
      else if (typeof value === 'object' && !Array.isArray(value)) {
        formatted[key] = JSON.stringify(value);
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        formatted[key] = value.join(', ');
      }
      else {
        formatted[key] = value;
      }
    });
    
    return formatted;
  });
}
