.PHONY: help install dev backend frontend build clean

BACKEND_DIR = backend
FRONTEND_DIR = frontend
PYTHON = python3
NPM = npm

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "📦 Installing backend dependencies..."
	cd $(BACKEND_DIR) && $(PYTHON) -m pip install -r requirements.txt
	@echo "📦 Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && $(NPM) install

backend: ## Start backend server (port 8000)
	@echo "🚀 Starting backend on http://localhost:8000"
	cd $(BACKEND_DIR) && $(PYTHON) -m uvicorn app.main:app --reload --port 8000

frontend: ## Start frontend dev server (port 3000)
	@echo "🚀 Starting frontend on http://localhost:3000"
	cd $(FRONTEND_DIR) && $(NPM) run dev

dev: ## Start both backend and frontend concurrently
	@echo "🏏 Starting CricBuddy..."
	@make -j2 backend frontend

build: ## Build frontend for production
	@echo "🔨 Building frontend..."
	cd $(FRONTEND_DIR) && $(NPM) run build

clean: ## Remove build artifacts and node_modules
	@echo "🧹 Cleaning up..."
	rm -rf $(FRONTEND_DIR)/node_modules
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(BACKEND_DIR)/__pycache__
	rm -rf $(BACKEND_DIR)/app/__pycache__
