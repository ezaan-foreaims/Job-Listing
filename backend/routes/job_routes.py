from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError, OperationalError
from db import db
from model.job import Job 
from datetime import date, datetime

# Create a Blueprint for job routes
job_bp = Blueprint('jobs', __name__, url_prefix='/jobs')

# --- Helper Functions for Validation and Data Processing ---

def validate_job_data(data, is_update=False):
    """Validates incoming job data and returns a list of error messages."""
    errors = []
    required_fields = ['title', 'company', 'location']
    
    # Check for required fields (only for creation or if the field is present in update)
    for field in required_fields:
        if field not in data or not data[field]:
            if not is_update or field in data: # Check if field is present but empty
                 errors.append(f"Field '{field}' is required and cannot be empty.")

    # Validate posting_date if present
    if 'posting_date' in data and data['posting_date']:
        try:
            # Attempt to parse the date string (expecting 'YYYY-MM-DD')
            datetime.strptime(data['posting_date'], '%Y-%m-%d').date()
        except ValueError:
            errors.append("Invalid date format for 'posting_date'. Use 'YYYY-MM-DD'.")
    
    return errors

def parse_tags_for_db(tags_input):
    """Converts a list of tags or a comma-separated string into a DB-friendly string."""
    if isinstance(tags_input, list):
        return ', '.join(tag.strip() for tag in tags_input)
    elif isinstance(tags_input, str):
        # Handle cases where client might send a raw string
        return ', '.join(tag.strip() for tag in tags_input.split(','))
    return None

def apply_filters(query, args):
    """Applies filtering from query parameters to the SQLAlchemy query."""
    if 'job_type' in args:
        query = query.filter(Job.job_type == args['job_type'])
    
    if 'location' in args:
        # Use ILIKE for case-insensitive partial matching on location
        query = query.filter(Job.location.ilike(f"%{args['location']}%"))

    if 'tag' in args:
        tag = args['tag']
        # Use LIKE for partial matching on the tags string (case-insensitive for most DBs)
        # Finds jobs where the tags string contains the requested tag
        query = query.filter(Job.tags.ilike(f"%{tag}%"))
    
    return query

def apply_sorting(query, args):
    """Applies sorting from query parameters to the SQLAlchemy query."""
    sort_by = args.get('sort', 'posting_date_desc') # Default to newest first

    if sort_by == 'title_asc':
        query = query.order_by(Job.title.asc())
    elif sort_by == 'title_desc':
        query = query.order_by(Job.title.desc())
    elif sort_by == 'posting_date_asc':
        query = query.order_by(Job.posting_date.asc())
    # Default and explicit newest-first sorting
    elif sort_by == 'posting_date_desc': 
        query = query.order_by(Job.posting_date.desc())
    # Other sorting options can be added here
        
    # Ensure a consistent final sort (e.g., by ID) for stability
    return query.order_by(Job.id.asc()) 

# --- CRUD Endpoints ---

@job_bp.route('/', methods=['POST'])
def create_job():
    """Endpoint to create a new job listing (CREATE)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    # 1. Validation
    errors = validate_job_data(data)
    if errors:
        return jsonify({"error": "Validation failed", "messages": errors}), 400

    try:
        # Process tags and date
        tags_db_format = parse_tags_for_db(data.get('tags'))
        
        # Determine posting_date
        posting_date = data.get('posting_date')
        if posting_date:
            posting_date = datetime.strptime(posting_date, '%Y-%m-%d').date()
        else:
            posting_date = date.today() # Default to today

        # 2. Create Model and Save
        new_job = Job(
            title=data['title'],
            company=data['company'],
            location=data['location'],
            posting_date=posting_date,
            job_type=data.get('job_type'),
            tags=tags_db_format
        )
        db.session.add(new_job)
        db.session.commit()

        # 3. Success Response
        return jsonify(new_job.to_dict()), 201
    
    # 4. Error Handling
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Database integrity error. Check unique constraints."}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An unexpected error occurred during creation.", "details": str(e)}), 500


@job_bp.route('/', methods=['GET'])
def list_jobs():
    """Endpoint to retrieve a list of job listings with filtering/sorting (READ list)."""
    args = request.args
    
    # 1. Initial Query
    query = Job.query
    
    # 2. Filtering
    query = apply_filters(query, args)
    
    # 3. Sorting
    query = apply_sorting(query, args)

    # 4. Execute Query
    try:
        jobs = query.all()
        # 5. Success Response
        return jsonify([job.to_dict() for job in jobs]), 200
    except OperationalError as e:
        # Handle database operation errors (e.g., bad filter/sort column)
        return jsonify({"error": "Database query error.", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred during retrieval.", "details": str(e)}), 500


@job_bp.route('/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Endpoint to retrieve a single job listing by ID (READ single)."""
    # 1. Retrieve Job
    job = Job.query.get(job_id)

    # 2. Not Found Handling
    if not job:
        return jsonify({"error": f"Job with ID {job_id} not found."}), 404

    # 3. Success Response
    return jsonify(job.to_dict()), 200


@job_bp.route('/<int:job_id>', methods=['PUT', 'PATCH'])
def update_job(job_id):
    """Endpoint to update an existing job listing (UPDATE)."""
    data = request.get_json()
    print(data)
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    # 1. Retrieve Job (Not Found Handling)
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": f"Job with ID {job_id} not found."}), 404

    # 2. Validation (Use is_update=True)
    errors = validate_job_data(data, is_update=True)
    if errors:
        return jsonify({"error": "Validation failed", "messages": errors}), 400

    try:
        # 3. Update fields dynamically
        for key, value in data.items():
            if key in ['title', 'company', 'location', 'job_type']:
                setattr(job, key, value)
            elif key == 'tags':
                job.tags = parse_tags_for_db(value)
            elif key == 'posting_date' and value:
                 # Ensure date is parsed correctly on update
                 job.posting_date = datetime.strptime(value, '%Y-%m-%d').date()
        
        db.session.commit()

        # 4. Success Response
        return jsonify(job.to_dict()), 200

    # 5. Error Handling
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Database integrity error during update."}), 400
    except ValueError:
        db.session.rollback()
        return jsonify({"error": "Invalid date format for 'posting_date'. Use 'YYYY-MM-DD'."}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An unexpected error occurred during update.", "details": str(e)}), 500


@job_bp.route('/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    """Endpoint to delete an existing job listing (DELETE)."""
    # 1. Retrieve Job (Not Found Handling)
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": f"Job with ID {job_id} not found."}), 404

    try:
        # 2. Delete and Commit
        db.session.delete(job)
        db.session.commit()

        # 3. Success Response (204 No Content is RESTful for successful deletion)
        return '', 204
    
    # 4. Error Handling
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An unexpected error occurred during deletion.", "details": str(e)}), 500

@job_bp.route('/delete_by_name', methods=['DELETE'])
def delete_job_by_name():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    title = data.get("title")
    company = data.get("company")  # optional

    if not title:
        return jsonify({"error": "Title must be provided to delete a job"}), 400

    # Use case-insensitive search for safety
    query = Job.query.filter(Job.title.ilike(title))
    if company:
        query = query.filter(Job.company.ilike(company))

    job = query.first()
    if not job:
        return jsonify({"error": "Job not found"}), 404

    try:
        db.session.delete(job)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500