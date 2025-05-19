import React from "react";

const PrintableTable = React.forwardRef(
  ({ data, columns, columnVisibilityModel }, ref) => {
    const visibleColumns = columns.filter(
      (column) => columnVisibilityModel[column.field] !== false
    );

    return (
      <div ref={ref} style={{ display: "none" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.field}
                  style={{ border: "1px solid black", padding: "8px" }}
                >
                  {column.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {visibleColumns.map((column) => (
                  <td
                    key={column.field}
                    style={{ border: "1px solid black", padding: "8px" }}
                  >
                    {row[column.field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

export default PrintableTable;
