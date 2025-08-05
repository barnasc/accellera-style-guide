docker run ^
-v %CD%\books:/home/adf/books ^
-v %CD%\metadata:/home/adf/_data/works ^
-v %CD%\output:/home/adf/_output ^
adf:v0.7 /bin/bash -c "npm run eb -- output --format screen-pdf --book '%*'"
