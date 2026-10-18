# ==============================================================================
# IdeaGen - Development & Orchestration Makefile
# ==============================================================================
# Single entrypoint file to control docker, database, backend (FastAPI),
# frontend (Vite/React), test suites, and project maintenance.
# ==============================================================================

.PHONY: help dev start stop restart docker-up docker-down docker-logs \
        backend-dev backend-test frontend-dev frontend-build \
        db-migrate db-status test clean

# Shell configuration
PYTHON_VENV := backend/.venv/Scripts/python
PYTEST_BIN  := backend/.venv/Scripts/pytest
ALEMBIC_BIN := backend/.venv/Scripts/alembic

# Default target
.DEFAULT_GOAL := help

# ==============================================================================
# 1. HELP MENU
# ==============================================================================
help:
	@echo ""
	@echo "========================================================================"
	@echo "                   IDEAGEN DEVELOPMENT COMMANDS                         "
	@echo "========================================================================"
	@echo "  make dev           - Start full dev stack (Docker DB + Backend + Frontend)"
	@echo "  make start         - Alias for 'make dev'"
	@echo "  make stop          - Stop all containers and background services"
	@echo ""
	@echo "  make docker-up     - Start PostgreSQL database container (docker-compose)"
	@echo "  make docker-down   - Stop PostgreSQL database container"
	@echo "  make docker-logs   - View PostgreSQL database container logs"
	@echo ""
	@echo "  make backend-dev   - Run FastAPI backend API server (--reload port 8000)"
	@echo "  make backend-test  - Run backend pytest unit & integration test suite"
	@echo "  make db-migrate    - Apply pending Alembic database migrations"
	@echo ""
	@echo "  make frontend-dev  - Run Vite frontend dev server (port 5173)"
	@echo "  make frontend-build- Build production frontend bundle"
	@echo ""
	@echo "  make test          - Run full test suite"
	@echo "  make clean         - Remove cache files, build artifacts, and temp files"
	@echo "========================================================================"
	@echo ""

# ==============================================================================
# 2. FULL DEV STACK ORCHESTRATION
# ==============================================================================

## Start full stack: Docker Postgres -> Backend API -> Frontend Vite
dev: docker-up
	@echo "Starting IdeaGen full development stack..."
	@echo "Backend: http://localhost:8000 (Docs: http://localhost:8000/docs)"
	@echo "Frontend: http://localhost:5173"
	@echo ""
	@echo "Launching backend and frontend servers..."
	@cmd /c "start \"IdeaGen Backend\" powershell -NoExit -Command \"cd backend; .venv/Scripts/python.exe -m uvicorn ideagen.api.main:app --reload --port 8000\"" || true
	@cmd /c "start \"IdeaGen Frontend\" powershell -NoExit -Command \"cd frontend; npm run dev\"" || true

start: dev

stop: docker-down
	@echo "IdeaGen services stopped."

restart: stop dev

# ==============================================================================
# 3. DOCKER & DATABASE
# ==============================================================================

## Start PostgreSQL container
docker-up:
	@echo "Starting PostgreSQL database container..."
	docker-compose up -d postgres

## Stop PostgreSQL container
docker-down:
	@echo "Stopping PostgreSQL database container..."
	docker-compose down

## Tail Docker logs
docker-logs:
	docker-compose logs -f postgres

## Run database migrations
db-migrate: docker-up
	@echo "Applying Alembic database migrations..."
	cd backend && .venv/Scripts/alembic.exe upgrade head

# ==============================================================================
# 4. BACKEND (FastAPI / Python)
# ==============================================================================

## Run backend API server in foreground
backend-dev: docker-up
	@echo "Starting FastAPI backend server at http://localhost:8000..."
	cd backend && .venv/Scripts/python.exe -m uvicorn ideagen.api.main:app --reload --port 8000

## Run backend pytest tests
backend-test:
	@echo "Running backend test suite with pytest..."
	cd backend && .venv/Scripts/pytest.exe tests/ingestion tests/evaluation -v

# ==============================================================================
# 5. FRONTEND (React / Vite)
# ==============================================================================

## Run frontend Vite dev server
frontend-dev:
	@echo "Starting Vite frontend server at http://localhost:5173..."
	cd frontend && npm run dev

## Build frontend production bundle
frontend-build:
	@echo "Building frontend production assets..."
	cd frontend && npm run build

# ==============================================================================
# 6. TESTING & MAINTENANCE
# ==============================================================================

## Run all test suites
test: backend-test

## Clean temporary build & cache artifacts
clean:
	@echo "Cleaning cache files and temporary build artifacts..."
	@rm -rf backend/.pytest_cache frontend/dist frontend/node_modules/.vite 2>/dev/null || true
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleanup completed."
