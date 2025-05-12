from .models import (
    Employee, Machine, Mechanism, Warehouse, ItemLocations, Invoice, InvoiceItem
)

# PARSES BOOLEAN VALUES
def parse_bool(value):
    if value.lower() in ['true', '1', 't', 'y', 'yes']:
        return True
    elif value.lower() in ['false', '0', 'f', 'n', 'no']:
        return False
    else:
        return True 

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
