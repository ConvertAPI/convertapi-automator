#!/bin/bash

mkdir -p bin
export GZIP=-9

dotnet publish --configuration Release --runtime linux-x64 --self-contained --output=bin /p:PublishReadyToRun=false /p:PublishSingleFile=true /p:PublishTrimmed=true /p:DebugBuild=false /p:DebugSymbols=false /p:DebugType=None Cli
cd bin
mv Cli convertapi-automator
tar --create --gzip --preserve-permissions --remove-files --file=convertapi-automator_linux.tar.gz convertapi-automator
cd ..

dotnet publish --configuration Release --runtime osx-x64 --self-contained --output=bin /p:PublishReadyToRun=false /p:PublishSingleFile=true /p:PublishTrimmed=true /p:DebugBuild=false /p:DebugSymbols=false /p:DebugType=None Cli
cd bin
mv Cli convertapi-automator
tar --create --gzip --preserve-permissions --remove-files --file=convertapi-automator_osx.tar.gz convertapi-automator
cd ..

dotnet publish --configuration Release --runtime win-x64 --self-contained --output=bin /p:PublishReadyToRun=false /p:PublishSingleFile=true /p:PublishTrimmed=true /p:DebugBuild=false /p:DebugSymbols=false /p:DebugType=None Cli
cd bin
mv Cli.exe convertapi-automator.exe
zip -9 -j convertapi-automator_win.zip convertapi-automator.exe ../Cli/register-win-service.bat
rm convertapi-automator.exe
cd ..