#!/bin/bash

docker build -t baltsoftcorp/convertapi-automator:${1} -t baltsoftcorp/convertapi-automator .
docker push baltsoftcorp/convertapi-automator:${1}
docker push baltsoftcorp/convertapi-automator
