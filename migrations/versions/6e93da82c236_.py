"""empty message

Revision ID: 6e93da82c236
Revises: 
Create Date: 2025-01-28 13:30:51.051236

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6e93da82c236'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('employee',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=80), nullable=False),
    sa.Column('password_hash', sa.String(length=120), nullable=False),
    sa.Column('phone_number', sa.String(length=20), nullable=True),
    sa.Column('job_name', sa.String(length=100), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('employee', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_employee_username'), ['username'], unique=True)

    op.create_table('machine',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('machine', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_machine_name'), ['name'], unique=True)

    op.create_table('mechanism',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('mechanism', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_mechanism_name'), ['name'], unique=True)

    op.create_table('supplier',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('supplier', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_supplier_name'), ['name'], unique=True)

    op.create_table('warehouse',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('item_name', sa.String(length=120), nullable=False),
    sa.Column('item_bar', sa.String(length=100), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('item_bar')
    )
    with op.batch_alter_table('warehouse', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_warehouse_item_name'), ['item_name'], unique=True)

    op.create_table('invoice',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('client_name', sa.String(length=50), nullable=True),
    sa.Column('warehouse_manager', sa.String(length=255), nullable=True),
    sa.Column('total_amount', sa.Float(), nullable=True),
    sa.Column('paid', sa.Float(), nullable=True),
    sa.Column('residual', sa.Float(), nullable=True),
    sa.Column('comment', sa.String(length=255), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('employee_name', sa.String(length=50), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('machine_id', sa.Integer(), nullable=True),
    sa.Column('mechanism_id', sa.Integer(), nullable=True),
    sa.Column('supplier_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['employee_id'], ['employee.id'], ),
    sa.ForeignKeyConstraint(['machine_id'], ['machine.id'], ),
    sa.ForeignKeyConstraint(['mechanism_id'], ['mechanism.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['supplier.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('invoice', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_invoice_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_invoice_type'), ['type'], unique=False)

    op.create_table('item_locations',
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('location', sa.String(length=255), nullable=False),
    sa.Column('price_unit', sa.Float(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['warehouse.id'], ),
    sa.PrimaryKeyConstraint('item_id', 'location')
    )
    with op.batch_alter_table('item_locations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_item_locations_location'), ['location'], unique=False)

    op.create_table('invoice_item',
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('location', sa.String(length=255), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('total_price', sa.Float(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoice.id'], ),
    sa.ForeignKeyConstraint(['item_id'], ['warehouse.id'], ),
    sa.PrimaryKeyConstraint('invoice_id', 'item_id', 'location')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('invoice_item')
    with op.batch_alter_table('item_locations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_item_locations_location'))

    op.drop_table('item_locations')
    with op.batch_alter_table('invoice', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_invoice_type'))
        batch_op.drop_index(batch_op.f('ix_invoice_created_at'))

    op.drop_table('invoice')
    with op.batch_alter_table('warehouse', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_warehouse_item_name'))

    op.drop_table('warehouse')
    with op.batch_alter_table('supplier', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_supplier_name'))

    op.drop_table('supplier')
    with op.batch_alter_table('mechanism', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_mechanism_name'))

    op.drop_table('mechanism')
    with op.batch_alter_table('machine', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_machine_name'))

    op.drop_table('machine')
    with op.batch_alter_table('employee', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_employee_username'))

    op.drop_table('employee')
    # ### end Alembic commands ###