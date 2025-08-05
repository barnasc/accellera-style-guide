docker run ^
-v %CD%\books:/home/adf/books ^
-v %CD%\metadata:/home/adf/_data/works ^
-v %CD%\output:/home/adf/_output ^
-i -t adf:v0.7 /bin/bash
