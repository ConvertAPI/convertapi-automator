@echo off

set secret=YOUR_SECRET
set watch_dir=c:\convertapi-automator\watch\

IF "%secret%"=="YOUR_SECRET" (
	ECHO Please edit this BAT file and replace '%secret%' with your ConvertAPI secret. You can get your secret here: https://www.convertapi.com/a
	PAUSE
	EXIT
)

IF NOT EXIST %watch_dir% (
	ECHO %watch_dir% directory does not exist. Please edit this BAT file and set watch_dir.
	PAUSE
	EXIT
)

call %~dp0\uninstall-win-service.bat

sc.exe create convertapi-automator start=auto binPath="%~dp0\convertapi-automator.exe --secret=%secret% --dir=%watch_dir% --watch"
sc.exe start convertapi-automator
pause