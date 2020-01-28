#!/bin/bash

mkdir -p bin/zip

dotnet publish --configuration Release --runtime linux-x64 --self-contained --output bin/zip /p:PublishReadyToRun=false /p:PublishSingleFile=true /p:PublishTrimmed=true /p:DebugBuild=false
cd bin/zip
zip -9 -m -j convertapi-automator_linux.zip convertapi-automator
cd ../..

dotnet publish --configuration Release --runtime win-x64 --self-contained --output bin/zip /p:PublishReadyToRun=false /p:PublishSingleFile=true /p:PublishTrimmed=true /p:DebugBuild=false
cd bin/zip
zip -9 -m -j convertapi-automator_win.zip convertapi-automator.exe
cd ../..

dotnet publish --configuration Release --runtime osx-x64 --self-contained --output bin/zip /p:PublishReadyToRun=false /p:PublishSingleFile=true /p:PublishTrimmed=true /p:DebugBuild=false
cd bin/zip
zip -9 -m -j convertapi-automator_osx.zip convertapi-automator
cd ../..
