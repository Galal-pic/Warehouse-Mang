from .models import (
    Employee, Machine, Mechanism, Warehouse, ItemLocations, Invoice, InvoiceItem
)

from datetime import datetime
import pandas as pd
import io
import os

# PARSES BOOLEAN VALUES
def parse_bool(value):
    if value.lower() in ['true', '1', 't', 'y', 'yes']:
        return True
    elif value.lower() in ['false', '0', 'f', 'n', 'no']:
        return False
    else:
        return True 

# SERIALIZES DATABASE VALUES
def serialize_value(value):
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")  
    return value

def validate_inventory_data(data):
    required_fields = ['name', 'quantity', 'price']
    return all(field in data for field in required_fields)

def validate_invoice_data(data):
    required_fields = ['type', 'Employee_Name', 'items']
    if not all(field in data for field in required_fields):
        return False
    for item in data['items']:
        if 'name' not in item:
            return False
    return True

# Function to extract data from specifc model into a excel sheet
def get_excel_sheet(model):
    data = model.query.all()
    columns = [col.name for col in model.__table__.columns]
    supplier_data = [{
        col: serialize_value(getattr(supplier, col)) for col in columns
    } for supplier in data]
    
    df = pd.DataFrame(supplier_data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # Write the DataFrame to Excel without the index
        df.to_excel(writer, sheet_name=f'{model.__tablename__}', index=False)
        
        # Get the worksheet and format it
        workbook = writer.book
        worksheet = writer.sheets[f'{model.__tablename__}']
        
        # Add a header format
        header_format = workbook.add_format({
            'bold': True,
            'text_wrap': True,
            'valign': 'top',
            'bg_color': '#D3D3D3',
            'border': 1
        })
        
        # Write the column headers with the defined format
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
        
        # Adjust column widths
        for i, col in enumerate(df.columns):
            # Handle potential None values by converting to empty string
            max_len = max([
                len(str(s)) for s in df[col].dropna()
            ] + [len(col)]) + 2  # Add a little extra space
            worksheet.set_column(i, i, max_len)
            
    # Reset the buffer pointer to the beginning
    output.seek(0)
    
    # Generate a filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{model.__tablename__}_{timestamp}.xlsx"
    return output, filename

