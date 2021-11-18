#!/bin/bash

mkdir -p bin
export GZIP=-9

echo "---- build linux-x64 -----"

dotnet publish --configuration Release --runtime linux-x64 --self-contained --output=bin -p:PublishReadyToRun=false -p:PublishSingleFile=true -p:PublishTrimmed=true -p:DebugBuild=false -p:DebugSymbols=false -p:DebugType=None Cli
cd bin
mv Cli convertapi-automator
tar --create --gzip --preserve-permissions --remove-files --file=convertapi-automator_linux.tar.gz convertapi-automator
cd ..

echo "---- build osx-x64 -----"

dotnet publish --configuration Release --runtime osx-x64 --self-contained --output=bin -p:PublishReadyToRun=false -p:PublishSingleFile=true -p:PublishTrimmed=true -p:DebugBuild=false -p:DebugSymbols=false -p:DebugType=None Cli
cd bin
mv Cli convertapi-automator
tar --create --gzip --preserve-permissions --remove-files --file=convertapi-automator_osx.tar.gz convertapi-automator
cd ..

echo "---- build win-x64 -----" 

dotnet publish --configuration Release --runtime win-x64 --self-contained --output=bin -p:PublishReadyToRun=false -p:PublishSingleFile=true -p:PublishTrimmed=true -p:DebugBuild=false -p:DebugSymbols=false -p:DebugType=None Cli
cd bin
mv Cli.exe convertapi-automator.exe
powershell Compress-Archive  -LiteralPath convertapi-automator.exe, ../Cli/register-win-service.bat, ../Cli/uninstall-win-service.bat -DestinationPath convertapi-automator_win.zip -Force
rm convertapi-automator.exe
cd ..
