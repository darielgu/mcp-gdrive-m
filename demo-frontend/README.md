To begin

source venv/bin/activate
uvicorn backend:app --host 0.0.0.0 --port 8000 --reload

cd frontend
npm run dev
