#!/bin/bash
rm -r /home/blog/source/_posts
git clone https://github.com/ChaoquanTao/Blog.git /home/blog/source/_posts
hexo clean
hexo generate
cp -r /home/blog/public/* /var/www/html
systemctl restart apache2
