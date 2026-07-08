#!/bin/bash
set -e

echo "================================================="
echo " Starting CivicSight in Local Dual-Mode          "
echo "================================================="

# Start backend
echo "-> Starting Backend (FastAPI) on port 8000..."
cd api
if [ ! -d ".venv" ]; then
    echo "Creating virtualenv..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi
# Start uvicorn in the background
DATABASE_URL=sqlite:///./civicsight.db uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "-> Starting Frontend (Vite) on port 5173..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both services started successfully."
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000 (Swagger docs at /docs)"
echo ""
echo "Press Ctrl+C to stop all services."

# Catch Ctrl+C and kill both background processes
trap "echo -e '\nShutting down...'; kill $BACKEND_PID $FRONTEND_PID; exit" EXIT INT TERM
wait
