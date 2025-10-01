from datetime import datetime
from db import db

class Job(db.Model):
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    company = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    posting_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    job_type = db.Column(db.String(50), nullable=True)
    tags = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f'<Job {self.id}: {self.title} at {self.company}>'

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'company': self.company,
            'location': self.location,
            'posting_date': self.posting_date.isoformat() if self.posting_date else None,
            'job_type': self.job_type,
            'tags': [t.strip() for t in self.tags.split(',')] if self.tags else []
        }
