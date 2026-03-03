.PHONY: dev dev-relay dev-ui test test-relay test-ui replay replay-direct

dev: ## Start both relay + UI
	@make -j2 dev-relay dev-ui

dev-relay: ## Start Rust WebSocket relay
	cd relay && cargo run

dev-ui: ## Start Vite dev server
	cd ui && bun run dev

test: ## Run all tests
	@make -j2 test-relay test-ui

test-relay: ## Run Rust relay tests
	cd relay && cargo test

test-ui: ## Run frontend tests
	cd ui && bun test

replay: ## Run mock event replay (start relay + ui first)
	cd ui && bun run replay

replay-direct: ## Run mock replay without relay (start ui first)
	cd ui && bun run replay:direct
