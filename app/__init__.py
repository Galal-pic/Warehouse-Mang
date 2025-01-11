from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_restx import Api
from dotenv import load_dotenv
from datetime import timedelta
import os

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Configure app
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=6)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/*": {"origins": "http://localhost:3000"}})
    jwt.init_app(app)

    # Initialize Flask-RestX API
    api = Api(
        app,
        doc='/docs',
        title='Warehouse Management API',
        description='API for managing warehouse operations',
        validate=True  # Enable request validation
    )

    # Register namespaces
    from .routes import warehouse_ns, invoice_ns, machine_ns, mechanism_ns, item_location_ns
    from .auth import auth_ns
    api.add_namespace(warehouse_ns)
    api.add_namespace(invoice_ns)
    api.add_namespace(auth_ns)
    api.add_namespace(machine_ns)
    api.add_namespace(mechanism_ns)
    api.add_namespace(item_location_ns)  # Register the missing namespace

    return app