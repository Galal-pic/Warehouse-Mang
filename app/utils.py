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


def operation_result(status_code=200, status="success", message=None, invoice=None):
    return {
            "status": status,
            "message": message,
            "invoice": invoice,
            "status_code": status_code
        }