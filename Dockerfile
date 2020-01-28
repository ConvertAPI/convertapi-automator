FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build
WORKDIR /src
COPY . .
RUN dotnet publish --configuration Release --runtime linux-x64 --self-contained --output /app /p:PublishReadyToRun=true /p:PublishSingleFile=false /p:PublishTrimmed=false /p:DebugBuild=false

FROM mcr.microsoft.com/dotnet/core/runtime-deps:3.1
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["./convertapi-automator"]