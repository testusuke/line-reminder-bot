#!/bin/bash
rsync -acvz --delete ./src root@line.testusuke.net:app/
# restart
ssh root@line.testusuke.net "cd app/; echo 'done'"
