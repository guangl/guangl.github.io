---
title: "axios 源码解读"
date: 2021-05-30T21:29:02+08:00
draft: false
---

书接上文，继续来解读 axios 的源码，这一次有了新的一些想知道的 feature，我需要在读 axios 的源码的时候来理解这些 feature。

## feature

* 如何从浏览器创建 XHR，以及如何从 Nodejs 创建 http 请求
* 如何支持 Promise
* 拦截器
* 转换请求和响应数据
* 取消请求
* 自动转换成 JSON 数据
* 客户端支持防御 XSRF



## 项目目录

一个一个来说

* axios.js: 项目根文件
* defaults.js: axios 默认文件
* utils.js: 一些工具函数
* /adapters/http.js: nodejs 创建 http 请求
* /adapters/xhr.js: 浏览器创建 xhr 请求
* /cancel/Cancel.js: axios 自定义的 Cancel 对象
* /cancel/CancelToken.js: axios 自定义的 CancelToken 对象
* /cancel/isCancel.js: 判断对象是否为 Cancel 对象
* /core/Axios.js: axios 的核心文件
* /core/buildFullPath.js: 创建请求的 url
* /core/createError.js: 创建一个 Error
* /core/dispatchRequest.js: 发送请求
* /core/enhanceError.js: 新建 Error 对象
* /core/InterceptorManager.js:
* /core/mergeConfig.js: 合并 config
* /core/settle.js: 
* /core/transformData.js: 转换 request 或者 response 的数据
* /helpers: 类似于 utils, 一些通用函数



## axios.js

此文件导出了 axios，同时给 axios 定义了很多属性，比如：

* Axios: axios 的构造函数
* create: 创建一个 axios 的对象
* Cancel
* CancelToken
* isCancel
* all: 等同于 Promise.all
* spread
* isAxiosError

剩下没写的只是导出文件，文件的意义以及展示在上面了。

在这个文件还定义了一个函数，用来创建 axios 实例

```js
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  // 直接使用 axios 可以发送请求，以及 axios.request() 也可以发送请求 的原因
  var instance = bind(Axios.prototype.request, context);

  // 继承了 Axios 的属性
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}
```

这个函数就是这个文件创建 axios 实例的函数，可能中间三行比较重要。



## Axios 构造对象

axios 的构造对象在 `/core/Axios.js` 这个文件中，第一个函数就定义了 Axios 的构造函数

```js
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}
```

定义了请求拦截器以及响应拦截器。

接下来我觉得应该就是整个 axios 的核心函数了，就是 `Axios.prototype.request` 这个函数了。由于太长，所以就只粘贴一些代码。

一般发送请求的代码

```js
var chain = [dispatchRequest, undefined];

Array.prototype.unshift.apply(chain, requestInterceptorChain);
chain.concat(responseInterceptorChain);

promise = Promise.resolve(config);
while (chain.length) {
  promise = promise.then(chain.shift(), chain.shift());
}

return promise;
```

如果没有拦截器的话，会直接通过 `dispatchRequest` 来发送请求.



## dispatchRequest

发送请求的函数，会做这样几件事：

1. 获取 headers
2. 转换请求数据
3. 合并 headers
4. 删除 headers.method
5. 发送请求
   1. 成功: 转换响应数据
   2. 失败: 转换失败的数据
