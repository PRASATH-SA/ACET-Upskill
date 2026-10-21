@echo off
if "%~1"=="test" (
    call "%~dp0test_all.bat"
    exit /b %ERRORLEVEL%
)
if "%~1"=="stop" (
    call "%~dp0stop_all.bat"
    exit /b %ERRORLEVEL%
)
call "%~dp0run_all.bat"
