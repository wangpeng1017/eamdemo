#!/bin/bash

echo "查找项目路径..."
ssh root@8.130.182.148 "ls -la /root/ | grep lims"
ssh root@8.130.182.148 "ls -la /home/ | grep -i lims"
ssh root@8.130.182.148 "find /root -maxdepth 3 -name 'package.json' -path '*lims*' 2>/dev/null"
