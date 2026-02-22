/*import './Table.css';*/

/**
 * Table Component
 * 
 * Responsive table with sorting and selection
 * 
 * @param {Array} columns - Column definitions
 * @param {Array} data - Table data
 * @param {boolean} striped - Striped rows
 * @param {boolean} hoverable - Row hover effect
 * @param {function} onRowClick - Row click handler
 */
const Table = ({
  columns = [],
  data = [],
  striped = true,
  hoverable = true,
  onRowClick = null,
  emptyMessage = 'No data available',
  className = ''
}) => {
  const tableClassNames = [
    'table',
    striped && 'table-striped',
    hoverable && 'table-hoverable',
    onRowClick && 'table-clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="table-container">
      <table className={tableClassNames}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                style={{ width: column.width }}
                className={column.align ? `text-${column.align}` : ''}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key || colIndex}
                    className={column.align ? `text-${column.align}` : ''}
                  >
                    {column.render
                      ? column.render(row[column.key], row, rowIndex)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;