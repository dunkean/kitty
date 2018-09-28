REM start d:\Progra~1\MongoDB\Server\3.6\bin\mongod.exe -dbpath d:\mongodb
SET PATH=%PATH%;C:\Users\U108-N257\AppData\Roaming\npm
start npm run win-start-api
start npm run win-theme:watch
start npm run win-store:watch
start npm run win-webpack:store:watch
mode con:cols=40 lines=30 && pm2 start store.json

