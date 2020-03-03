set params=--secret=<SECRET> --dir=C:\convertapi-automator\share1\ --watch

sc.exe stop convertapi-automator
timeout 1
sc.exe delete convertapi-automator
timeout 1
sc.exe create convertapi-automator start=auto binPath="%~dp0\convertapi-automator.exe %params%"
sc.exe start convertapi-automator
pause