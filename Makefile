.PHONY: up down restart status logs migrate reset-db help

LOG_FILE=app.log
PID_FILE=app.pid

# Default target
up:
	@echo "🚀 Starting Supabase Local Database..."
	@npx supabase start
	@echo "✅ Supabase started."
	@echo ""
	@echo "📋 Supabase Connection Info:"
	@echo ""
	@echo "--------------------------------------------------------"
	@echo "🔌 Dashboard Link: \033[1;32mhttp://localhost:3000\033[0m"
	@echo "👤 Login: \033[1;34mtushar21211@iiitd.ac.in\033[0m / \033[1;34masdf1234\033[0m"
	@echo "--------------------------------------------------------"
	@echo "💻 Starting Frontend in background..."
	@nohup npm run dev > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE)
	@echo "✅ Frontend running (PID `cat $(PID_FILE)`)."
	@echo "📄 Logs are being saved to $(LOG_FILE)."
	@echo "👉 Run 'make logs' to watch the logs."

down:
	@echo "🛑 Stopping Supabase..."
	@npx supabase stop
	@if [ -f $(PID_FILE) ]; then \
		echo "🛑 Stopping Frontend (PID `cat $(PID_FILE)`)..."; \
		kill `cat $(PID_FILE)` || true; \
		rm $(PID_FILE); \
	else \
		echo "⚠️ No $(PID_FILE) found. Frontend might not be running."; \
	fi
	@echo "✅ Stopped."

restart: down up

status:
	@npx supabase status
	@if [ -f $(PID_FILE) ]; then \
		echo "✅ Frontend is running (PID `cat $(PID_FILE)`)."; \
	else \
		echo "⚪️ Frontend is not running (no PID file)."; \
	fi

logs:
	@echo "M: Tailing $(LOG_FILE)... (Ctrl+C to exit)"
	@tail -f $(LOG_FILE)

migrate:
	@echo "🔄 Running Supabase migrations..."
	@npx supabase db reset
	@echo "✅ Migrations applied."

reset-db:
	@echo "⚠️  Resetting database (THIS WILL DELETE ALL DATA)..."
	@npx supabase db reset
	@echo "✅ Database reset complete."

clean:
	@echo "🧹 Cleaning up..."
	@rm -rf .next
	@rm -rf node_modules
	@rm -f $(LOG_FILE) $(PID_FILE)
	@echo "Done."

help:
	@echo "ElectriGo Makefile Commands:"
	@echo "  make up       - Start Supabase and Frontend (detached)"
	@echo "  make down     - Stop Supabase and Frontend"
	@echo "  make restart  - Restart everything"
	@echo "  make status   - Show status"
	@echo "  make logs     - Tail logs"
	@echo "  make migrate  - Run database migrations"
	@echo "  make reset-db - Reset database (⚠️ DELETES ALL DATA)"
