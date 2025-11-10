#!/bin/bash

# Script de nettoyage des serveurs de développement
# Usage: ./scripts/cleanup-ports.sh

echo "🧹 Nettoyage des serveurs de développement..."

# Tuer tous les processus Node/npm/React
echo "Arrêt des processus react-scripts..."
pkill -f "react-scripts" 2>/dev/null

echo "Arrêt des processus npm..."
pkill -f "npm.*start\|npm.*dev" 2>/dev/null

echo "Arrêt des processus vite..."
pkill -f "vite" 2>/dev/null

echo "Arrêt des processus next..."
pkill -f "next.*dev" 2>/dev/null

# Attendre un peu pour que les processus se terminent
sleep 2

# Vérifier les ports spécifiques et les libérer si nécessaire
PORTS=(3000 3001 3002 3003 5173 8080)

for port in "${PORTS[@]}"; do
    PID=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo "🔫 Libération du port $port (PID: $PID)..."
        kill -9 $PID 2>/dev/null
    fi
done

echo "✅ Nettoyage terminé ! Tous les ports sont libres."
echo ""
echo "📊 État actuel des ports de développement :"
for port in "${PORTS[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ Port $port : OCCUPÉ"
    else
        echo "✅ Port $port : LIBRE"
    fi
done
