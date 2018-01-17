# FuckNKUCourses
南开新系统的选课脚本（代理模式）

```
LICENSE:
YOU ARE NOT ALLOWED TO DISTRIBUTE IT, MODIFY IT OR EVEN USE IT.  
JUST PROSTRATE YOURSELF BEFORE IT.

AUTHOR: Sun-Yi Ran (sunrisefox@qq.com)
CONTACT BEFORE DOING ANY BAD THINGS.
```
```
许可：
不允许分发这个脚本，修改它或者使用它。
你只要跪倒在它面前就可以了。

作者： Sun-Yi Ran (sunrisefox@qq.com)
在做任何糟糕的事情之前先联系。
```
### 并没有什么用的使用说明：

+ 首先，安装 [Node.js 9.4.0+](https://nodejs.org/en/)
+ 然后，下载这个脚本
+ 再然后，打开选课系统，登录，注销登录（如果已经登录，直接注销登录），然后不要关闭这个页面
+ 再然后，运行 `node proxy.js`
+ 再然后，设置浏览器代理为 localhost:3000 （不用担心，脚本本身可以作为代理使用）
+ 再然后，登录刚刚注销的选课系统页面
+ 再然后，正常选课就可以了。
+ 脚本会截获你的选课请求，每 5 秒自动重复一次你选课失败的课程直到选课成功，如果中途被退出登录，脚本可以帮你自动登录。
