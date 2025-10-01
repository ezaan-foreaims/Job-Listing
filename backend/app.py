from flask import Flask, jsonify
from config import Config
from db import init_db
from routes.job_routes import job_bp  # make sure this exists

from flask import Flask
from flask_cors import CORS
from config import Config
from db import init_db
from routes.job_routes import job_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize DB
    init_db(app)

    # Enable CORS for all routes
    CORS(app)  # <- This will allow requests from any origin

    # Register blueprints
    app.register_blueprint(job_bp)

    return app


if __name__ == '__main__':
    app = create_app()
    print("✅ App ready, running...")
    app.run(debug=True, host='0.0.0.0', port=5000)
