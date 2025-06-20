#!/bin/bash

echo "========================================"
echo "Aplikasi Akuntansi Proyek - Mode Presentasi"
echo "========================================"
echo ""

echo "[1/3] Memulai server backend..."
cd backend && npm run dev &
BACKEND_PID=$!

echo "[2/3] Menunggu backend siap (10 detik)..."
sleep 10

echo "[3/3] Memulai aplikasi frontend..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "Aplikasi sedang berjalan:"
echo "- Backend: http://localhost:5000"
echo "- Frontend: http://localhost:3000"
echo ""
echo "Kredensial login:"
echo "- Admin: admin / admin123"
echo "- User: user / user123"
echo "========================================"
echo ""
echo "Silakan buka browser dan akses http://localhost:3000"
echo "Tekan Ctrl+C untuk menghentikan aplikasi..."

# Tunggu hingga user menekan Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait 