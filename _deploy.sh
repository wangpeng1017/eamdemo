#!/usr/bin/expect -f

set timeout 300
set password "xx198910170014Z"

# 连接到服务器
spawn ssh -o StrictHostKeyChecking=no root@8.130.182.148
expect {
    "password:" {
        send "$password\r"
    }
    timeout {
        # 可能不需要密码
    }
}

# 等待登录成功
expect "*#*"
send "cd /root/lims-next\r"

expect "*#*"
send "rm -rf .next\r"

expect "*#*"
send "nohup npm run build > /tmp/build.log 2>&1 &\r"

expect "*#*"
send "echo \\$! > /tmp/build.pid\r"

expect "*#*"
send "echo 'Build started in background!'\r"

expect "*#*"
send "sleep 60\r"

expect "*#*"
send "tail -50 /tmp/build.log\r"

expect "*#*"
send "pm2 restart lims-next\r"

expect "*#*"
send "pm2 status lims-next\r"

expect "*#*"
send "exit\r"

expect eof
