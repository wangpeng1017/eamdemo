#!/usr/bin/expect -f

set timeout 60
set password "xx198910170014Z"

spawn ssh -o StrictHostKeyChecking=no root@8.130.182.148
expect {
    "password:" {
        send "$password\r"
    }
    timeout {}
}

expect "*#*"
send "cd /root/lims-next\r"

expect "*#*"
send "tail -100 /tmp/build.log\r"

expect "*#*"
send "if grep -q 'Build completed' /tmp/build.log; then echo 'BUILD_SUCCESS'; else echo 'BUILD_STILL_RUNNING'; fi\r"

expect "*#*"
send "pm2 logs lims-next --lines 30 --nostream\r"

expect "*#*"
send "exit\r"

expect eof
