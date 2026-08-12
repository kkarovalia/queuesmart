#!/bin/bash

frontend_type="$(docker inspect --format '{{ index .Config.Labels "build.target" }}' queuesmart-frontend:latest)"
backend_type="$(docker inspect --format '{{ index .Config.Labels "build.target" }}' queuesmart-backend:latest)"

try_build() {
    local target=$1
    if [[ "$frontend_type" != "$target" ]]; then
        echo "Rebuilding frontend image..."
        sleep 1
        if [[ "$target" == "dev" ]]; then
            docker compose -f docker-compose.yml -f docker-compose.dev.yml build frontend --no-cache
        else
            docker compose build frontend --no-cache
        fi
    fi
    if [[ "$backend_type" != "$target" ]]; then
        echo "Rebuilding backend image..."
        sleep 1
        if [[ "$target" == "dev" ]]; then
            docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend --no-cache
        else
            docker compose build backend --no-cache
        fi
    fi
}

launch() {
    local target=$1
    echo "Launching..."
    sleep 1
    if [[ "$target" == "dev" ]]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up
    else
        docker compose up
    fi
}

usage() {
    echo "Usage: $0 [--dev] [-h|--help]"
    echo
    echo "Launch queuesmart services."
    echo
    echo "Options:"
    echo "  (no args)   Launch production images"
    echo "  --dev       Launch dev images with live editing"
    echo "  -h, --help  Show this help message and exit"
}

case "$1" in
    -h|--help)
        usage
        exit 0
        ;;
    --dev)
        try_build dev
        launch dev
        ;;
    "")
        try_build production
        launch production
        ;;
    *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
esac
