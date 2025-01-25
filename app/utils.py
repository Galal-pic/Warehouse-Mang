from .models import (
    Employee, Machine, Mechanism, Warehouse, ItemLocations, Invoice, InvoiceItem
)


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
