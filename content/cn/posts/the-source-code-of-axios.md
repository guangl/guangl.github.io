---
title: "大致阅读 axios 的源码"
date: 2021-05-15T00:24:25+08:00
categories: ["Front-End"]
draft: false
---

来解读一下 axios 的源代码。

首先说明，解读的源代码的版本为 0.21.1

看一个项目的代码，首先肯定在入口文件 `./index.js` 里。
打开 `index.js` 只有一行代码：
```js
module.exports = require('./lib/axios');
```

这行代码引入了 `./lib/axios` 这个文件，再去看看 `./lib/axios` 这个文件，里面才是真正的代码。

## lib/axios

先看导出，最后一行代码：
```js
module.exports.default = axios;
```

导出了 axios 这个对象，说明这个对象就是我们平时使用的 axios 了。

## 构建 axios 对象
可以在此文件中找到这一行代码。

```js
var axios = createInstance(defaults);
```

在看到这个函数的定义：
```js
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}
```

返回了 `instance` 这个变量，然而这个变量也是通过 `bind` 此函数来定义的。

通过函数名可以了解，`bind` 这个函数，是将 `Axios.prototype.request` 这个方法绑定到 `context` 上面了，所以本质上 `instance` 是 `Axios.prototype.request` 方法。

现在一切的焦点都在 `Axios` 上面。

## Axios
Axios 的代码如下：
```js
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}
```
其含义是，新建了两个属性，并将其赋值。
1. 第一个属性是 axios 的默认配置；
2. 第二个属性是 axios 的拦截器

## Axios.prototype.request
上述提过 `instance` 其实是 `Axios.prototype.request` 这个方法。

这个方法返回了一个 `promise` 变量，所以可以得出，这个 `promise` 的变量就是我们平时使用 axios 的返回值。

找到这个变量，发现在 3 处位置改变了它的值，今天先讨论最简单的一种情况：
```js
if (!synchronousRequestInterceptors) {
  var chain = [dispatchRequest, undefined];

  // chain 链接请求拦截器
  Array.prototype.unshift.apply(chain, requestInterceptorChain);
  // chain 链接响应拦截器
  chain.concat(responseInterceptorChain);

  // 创建一个 Promise 对象
  promise = Promise.resolve(config);
  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
}
```
当没有定义请求拦截器与响应拦截器的时候，就会首先执行 `dispatchRequest` 方法。

## dispatchRequest
该方法在 `./core/dispatchRequest` 文件中。

```js
var adapter = config.adapter || defaults.adapter;

// 执行 适配器函数
return adapter(config).then((response) => {}, (reason) => {});
```

通过 `defaults.adapter` 来执行请求

这个适配器是默认的配置，在 `./default.js` 这个文件里面。

## defaults.adapter
```js
var defaults = {
  adapter: getDefaultAdapter(),
}
```

```js
function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}
```

在这个函数里就会判断应该用什么方式来发送请求。

由于我们是 Front-end 所以本次先去看看 `./adapters/xhr.js` 这个文件。

## xhr
```js
var request = new XMLHttpRequest();
```

这行代码应该就是最核心，也是最简单的代码。

axios 是用  `XMLHttpRequest` 来发送请求的，他所有的 api 都是对 `XMLHttpRequest` 的 api 进行的封装。

所以本次大体上就是这个样子了，现在知道了 axios 就是对 XHR 的封装，下次就可以来看一下，axios 是如何封装 XHR 的。