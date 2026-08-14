#!/bin/bash

usage() {
    echo "Usage: $0 [--dev] [--local-llm] [--force-rebuild] [--build-only] [-h|--help]"
    echo
    echo "Launch queuesmart services."
    echo
    echo "Options:"
    echo "  (no args)        Launch production images"
    echo "  --dev            Launch dev images with live editing"
    echo "  --local-llm      Include the local Qwen3.5 llama.cpp server"
    echo "  --force-rebuild  Rebuild images even if the target already matches"
    echo "  --build-only     Build images without launching the stack"
    echo "  -h, --help       Show this help message and exit"
}

dev=false
local_llm=false
force_rebuild=false
build_only=false

while [[ $# -gt 0 ]]; do
    case "$1" in
    -h|--help)
        usage
        exit 0
        ;;
    --dev)
        dev=true
        shift
        ;;
    --local-llm)
        local_llm=true
        shift
        ;;
    --force-rebuild)
        force_rebuild=true
        shift
        ;;
    --build-only)
        build_only=true
        shift
        ;;
    *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
done

compose_files=(-f docker-compose.yml)
target="production"

if [[ "$dev" == true ]]; then
    compose_files+=(-f docker-compose.dev.yml)
    target="dev"
fi

if [[ "$local_llm" == true ]]; then
    compose_files+=(-f docker-compose.llm.yml)
fi

try_build() {
    local target=$1
    if [[ "$force_rebuild" == true || "$frontend_type" != "$target" ]]; then
        echo "Rebuilding frontend image..."
        sleep 1
        docker compose "${compose_files[@]}" build frontend --no-cache
    fi
    if [[ "$force_rebuild" == true || "$backend_type" != "$target" ]]; then
        echo "Rebuilding backend image..."
        sleep 1
        docker compose "${compose_files[@]}" build backend --no-cache
    fi
}

launch() {
    echo "Launching..."
    sleep 1
    if [[ "$force_rebuild" == true ]]; then
        docker compose "${compose_files[@]}" up --force-recreate -V
    else
        docker compose "${compose_files[@]}" up
    fi
}

frontend_type="$(docker inspect --format '{{ index .Config.Labels "build.target" }}' queuesmart-frontend:latest 2>/dev/null)"
backend_type="$(docker inspect --format '{{ index .Config.Labels "build.target" }}' queuesmart-backend:latest 2>/dev/null)"

try_build "$target"

if [[ "$build_only" == true ]]; then
    echo "Build complete. Skipping launch (--build-only)."
    exit 0
fi

launch