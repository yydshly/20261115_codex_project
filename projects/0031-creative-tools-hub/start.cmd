@echo off
chcp 65001 >nul
echo 打开 http://127.0.0.1:53031/projects/0031-creative-tools-hub/web/index.html
echo 保持此窗口运行即可阅读网页和相关专题。
python -m http.server 53031 --bind 127.0.0.1 --directory "%~dp0..\.."
