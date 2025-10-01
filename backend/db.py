import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

db = SQLAlchemy()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///jobs.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")


def init_db(app):
    db.init_app(app)

    # Import models here, **after db is initialized**
    from model.job import Job

    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created (if not exist)")
        except Exception as e:
            print(f"❌ Database creation failed: {e}")
