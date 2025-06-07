from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_restx import Api, Namespace, Resource
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
    flask_env = os.getenv("FLASK_ENV")

    # Configure app
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URI_DEV" if flask_env == "development" else "DATABASE_URI_PROD"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=6)
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "connect_args": {
            "connect_timeout": 10,
            "keepalives_idle": 600,
            "keepalives_interval": 30,
            "keepalives_count": 3,
        },
    }

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={
            r"/*": {
                "origins": (
                    "http://localhost:3000"
                    if flask_env == "development"
                    else "https://demo.thunder-project.xyz"
                )
            }
        },
    )
    jwt.init_app(app)

    # Initialize Flask-RestX API
    api = Api(
        app,
        doc="/docs",
        title="Warehouse Management API",
        description="API for managing warehouse operations",
        validate=True,  # Enable request validation
    )

    # Register namespaces
    from .routes import invoice_ns
    from .machines.machine import machine_ns
    from .mechanisms.mechanism import mechanism_ns
    from .suppliers.supplier import supplier_ns
    from .warehouses.warehouse import item_location_ns, warehouse_ns
    from .auth import auth_ns
    from .reports.report import reports_ns

    main_ns = Namespace("", description="Main API endpoints")

    @main_ns.route("/info")
    class MainEndpoint(Resource):
        def get(self):
            """Get API information"""
            return {
                "message": "Warehouse Management API",
                "version": "1.0",
                "documentation": "/docs/",
                "environment": (
                    "development" if flask_env == "development" else "production"
                ),
                "endpoints": {
                    "auth": "/auth/",
                    "warehouses": "/warehouses/",
                    "invoices": "/invoices/",
                    "machines": "/machines/",
                    "mechanisms": "/mechanisms/",
                    "suppliers": "/suppliers/",
                    "reports": "/reports/",
                },
            }

    api.add_namespace(warehouse_ns)
    api.add_namespace(invoice_ns)
    api.add_namespace(auth_ns)
    api.add_namespace(machine_ns)
    api.add_namespace(mechanism_ns)
    api.add_namespace(item_location_ns)  # Register the missing namespace
    api.add_namespace(supplier_ns)  # Register the missing namespace
    api.add_namespace(reports_ns)  # Register the missing namespace
    api.add_namespace(main_ns)

    return app
