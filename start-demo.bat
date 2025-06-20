@echo off
echo ========================================
echo Aplikasi Akuntansi Proyek - Mode Presentasi
echo ========================================
echo.

echo [1/3] Memulai server backend...
start cmd /k "cd backend && npm run dev"

echo [2/3] Menunggu backend siap (10 detik)...
timeout /t 10 /nobreak > nul

echo [3/3] Memulai aplikasi frontend...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Aplikasi sedang berjalan:
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
echo Kredensial login:
echo - Admin: admin / admin123
echo - User: user / user123
echo ========================================
echo.
echo Silakan buka browser dan akses http://localhost:3000
echo Tekan tombol apa saja untuk menutup jendela ini...
pause > nul 