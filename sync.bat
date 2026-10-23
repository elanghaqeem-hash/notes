@echo off
setlocal
echo ============================================
echo   Syncing Notes with GitHub Repository
echo ============================================

git pull --rebase origin main
git add -A

git diff-index --quiet HEAD --
if %ERRORLEVEL% NEQ 0 (
    set "MSG=%*"
    if "%MSG%"=="" (
        set "MSG=sync: update notes %date% %time%"
    )
    git commit -m "%MSG%"
    git push origin main
    echo [OK] Berhasil disimpan secara lokal dan di-push ke GitHub!
) else (
    echo [INFO] Tidak ada perubahan baru yang perlu di-commit.
    git push origin main
    echo [OK] Repositori lokal dan GitHub sudah sinkron.
)

echo ============================================
endlocal
