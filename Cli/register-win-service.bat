set params=--secret=<SECRET> --dir=c:\Projects\_temp\b --watch

sc.exe stop convertapi-automator
timeout 1
sc.exe delete convertapi-automator
sc.exe create convertapi-automator start=auto binPath="%~dp0\Cli.exe %params%"
sc.exe start convertapi-automator
pause