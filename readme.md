# Academic Question Generator API

A FastAPI-based system for generating Bloom's Taxonomy-compliant academic examination questions using AI.

## Features

- ✅ **Canonical Prompt System** - Structured prompts for consistent question generation
- ✅ **Bloom's Taxonomy Compliance** - RBT 1-6 level enforcement
- ✅ **Single Question Generation** - One question at a time for quality control
- ✅ **Batch Planning** - Generate multiple questions with different specifications
- ✅ **MySQL Database** - Persistent storage with full audit trail
- ✅ **Groq LLM Integration** - Fast inference with Llama 3.3

## Tech Stack

- **Backend**: FastAPI (Python 3.10+)
- **Database**: MySQL
- **LLM**: Groq (Llama 3.3 70B Versatile)
- **ORM**: SQLAlchemy
- **Validation**: Pydantic

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Update `.env` file with your credentials:

```env
# Groq API
GROQ_API_KEY=your_groq_api_key_here
MODEL=llama-3.3-70b-versatile

# Database (update with your MySQL credentials)
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/question_bank

# API
API_HOST=0.0.0.0
API_PORT=8000
```

### 3. Set Up MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Run the initialization script
source init_db.sql
```

Or manually:
```bash
mysql -u root -p < init_db.sql
```

### 4. Run the Application

```bash
# Development mode with auto-reload
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access the API

- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Generate Single Question

```bash
POST /api/v1/questions/generate
```

**Request:**
```json
{
  "subject": "Data Structures",
  "topic": "Arrays",
  "bloom_level": "RBT2",
  "difficulty": "Medium",
  "marks": 15
}
```

**Response:**
```json
{
  "id": 1,
  "question_text": "Explain the time complexity of searching...",
  "metadata": {
    "subject": "Data Structures",
    "topic": "Arrays",
    "bloom_level": "RBT2",
    "difficulty": "Medium",
    "marks": 15
  },
  "created_at": "2026-02-04T12:00:00"
}
```

### Create Batch Plan

```bash
POST /api/v1/batch/plan
```

**Request:**
```json
{
  "plan_name": "Midterm Exam",
  "subject": "Data Structures",
  "questions": [
    {"topic": "Arrays", "bloom_level": "RBT1", "difficulty": "Easy", "marks": 15},
    {"topic": "Linked Lists", "bloom_level": "RBT2", "difficulty": "Medium", "marks": 15}
  ]
}
```

### Get Question by ID

```bash
GET /api/v1/questions/{question_id}
```

### List Questions

```bash
GET /api/v1/questions?subject=Data%20Structures&bloom_level=RBT2&limit=10
```

## Bloom's Taxonomy Levels

| Level | Name | Action Verbs |
|-------|------|--------------|
| RBT1 | Remember | define, list, state, identify |
| RBT2 | Understand | explain, describe, summarize |
| RBT3 | Apply | apply, solve, compute |
| RBT4 | Analyze | analyze, differentiate, compare |
| RBT5 | Evaluate | justify, evaluate, critique |
| RBT6 | Create | design, propose, construct |

## Project Structure

```
quiz-generator/
├── app/
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   ├── questions.py     # Question endpoints
│   │   └── batch.py         # Batch endpoints
│   ├── models/
│   │   ├── database.py      # SQLAlchemy models
│   │   └── schemas.py       # Pydantic schemas
│   ├── services/
│   │   ├── question_generator.py  # Core generation
│   │   ├── batch_service.py       # Batch processing
│   │   ├── prompt_builder.py      # Canonical prompts
│   │   ├── llm_client.py          # Groq integration
│   │   └── validator.py           # Quality checks
│   └── core/
│       ├── config.py        # Configuration
│       └── database.py      # DB connection
├── requirements.txt
├── .env
├── init_db.sql
└── README.md
```

## Example Usage

### Using cURL

```bash
# Generate a question
curl -X POST "http://localhost:8000/api/v1/questions/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Operating Systems",
    "topic": "Process Scheduling",
    "bloom_level": "RBT3",
    "difficulty": "Hard",
    "marks": 15
  }'
```

### Using Python

```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/questions/generate",
    json={
        "subject": "Database Systems",
        "topic": "Normalization",
        "bloom_level": "RBT4",
        "difficulty": "Medium",
        "marks": 10
    }
)

print(response.json())
```

## Notes

- Each question is generated independently for quality control
- Questions are validated for Bloom's level compliance
- All questions are stored in MySQL for audit and reuse
- The system uses canonical prompts to ensure consistency

## License

MIT
