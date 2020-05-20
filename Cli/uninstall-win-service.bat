@echo off

sc.exe stop convertapi-automator
timeout 1
sc.exe delete convertapi-automator
timeout 1