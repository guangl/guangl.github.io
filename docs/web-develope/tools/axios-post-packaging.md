[axios](https://github.com/axios/axios) 一个基于 Promise http 客户端。

一般来说使用 axios 需要二次封装，这篇博客就是从这个角度来考虑的。

## 安装 axios
```bash
yarn add axios
```

## 使用 axios
```js
axios({
  method: 'GET',
  url: 'your url',
})
```

上面的代码表示，使用 get 请求来请求 "your url" 这个链接，同样 axios 也支持 `PUT, POST, DELETE` 等请求方法。

## 响应结构
[文档在这里](https://axios-http.com/zh/docs/res_schema)

结构目录为：
```js
{
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
  request: {},
}
```
axios 返回的是一个 promise，也就意味着可以使用 `.then()` 以及 `async/await` 这些方法、关键字。

## 封装 axios
首先要创建一个 axios 实例

```js
const request = axios.create({
  baseURL: 'http://example.com/api',
  timeout: 5000,
})
```

以上的代码用来创建一个最简单的实例，所拥有的功能为：每个请求都会以 'http://example.com/api' 为开头，每个请求的超时时长为 5 秒。

### 请求拦截器
拦截器的文档在[这里](https://axios-http.com/zh/docs/instance)。

添加请求拦截器：
```js
axios.interceptors.request.use(
  (config) => {
    // you want to do things
  },
  (error) => {
    // 请求错误处理
  }
)
```

在此可以做很多事情，比如：拦截重复请求、给请求统一加上 headers 、判断现在是否登陆、加上全局 loading。

如果需要移除请求拦截器，则需：
```js
axios.interceptors.request.eject(myInterceptor)
```

### 响应拦截器

添加响应拦截器：
```js
axios.interceptors.response.use(
  (response) => {
    // you want to do things
  },
  (error) => {
    // 响应错误处理
  }
)
```

在此也可以做很多事情，比如：全局处理错误、消除全局的 loading。

如果需要移除响应拦截器，则需：
```js
axios.interceptors.response.eject(myInterceptor)
```

下面会给出一个例子，含有的内容有：拦截重复请求、加上 headers、加上全局 loading、全局处理错误。

## 封装 axios 的例子

以下是一个封装 axios 的例子

### 默认配置创建 axios 实例

1. 创建请求实例
2. 进行默认配置

```js
const service = axios.create({
  url: 'http://example.com/api',
  timeout: 5000,
});
```

### 添加请求拦截器以及响应拦截器

```js
service.interceptor.request.use(
  (config) => {

  },
  (error) => {

  }
);

service.interceptor.response.use(
  (config) => {

  },
  (error) => {

  }
)
```

### 给每个请求都加上 headers

比如登陆请求需要携带 token，而且每个请求都需要带 token 认证，这个时候就可以在“请求拦截器“里面加上了。

```js
service.interceptor.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    config.headers.Authorization = token

    return config
  }
)
```

### 加上全局的 loading

在这个例子里，UI 组件库使用的是 [element plus](https://element-plus.org/#/zh-CN/)，当然你也可以使用其他的组件库，这个不做限制，如果这个组件库有全局的 loading 的使用方法就更好了。

1. 在请求的时候开始 loading
2. 在请求结束的时候结束 loading

```js
const showLoading = null

service.interceptor.request.use(
  (config) => {
    // 全局使用 loading
    showLoading = ElLoading.service({ fullscreen: true })

    const token = localStorage.getItem('token')
    config.headers.Authorization = token

    return config
  }
)

service.interceptor.response.use(
  (config) => {
    // 关闭全局的 loading
    if (showLoading) showLoading.close()

    return config.data
  }
)
```

### 全局处理错误

使用响应拦截器来处理接口返回错误。

```js
service.interceptor.response.use(
  (config) => {
    if (showLoading) showLoading.close()

    const { data: { code, message } } = config

    switch (true) {
      case /1/.test(code):
      case /200/.test(code):
        ElMessage({
          type: 'success',
          message,
          showClose: true,
        })
        break

      default:
        break
    }

    return config.data
  },
  (error) => {
    // 请求失败也需要清除全局 loading
    if (showLoading) showLoading.close()

    const { code } = error.response

    switch(true) {
      case /401/.test(code):
        ElMessage({
          type: 'error',
          message: '未认证，请登录！',
          showClose: true,
        })

        router.push('/401')
        // or
        router.push('login')
        break

      default:
        break
    }
  }
)
```

### 拦截重复请求

有的时候请求了多次，这个时候需要取消之前的请求，然后只对最后一次请求作出响应。

```js
// 存放 pending 的请求
const taskList = new Map()

service.interceptor.request.use(
	(config) => {
    // 全局使用 loading
    showLoading = ElLoading.service({ fullscreen: true })

    const token = localStorage.getItem('token')
    config.headers.Authorization = token

    // 如果 pending 中有过请求，则取消那次请求；如果没有过请求，将取消方法存进来。
    if (taskList.has(config.url)) {
     	const cancel = taskList.get(config.url)
      cancel(config.url)
      taskList.delete(config.url)
    } else {
      new axios.CancelToken((cancel) => {
        taskList.set(config.url, cancel)
      })
    }

    return config
  }
)
```





这个例子基本到这里就结束了，但是还有一些问题，比如：如果一个页面请求了很多次，就会导致很多弹窗，这样就会影响美观。我的解决方案是，每一种弹窗，同一时间内只会出现一次。但是也少了一些关键信息，算是有舍有得。

具体的解决方案就是见仁见智了。



## axios 的原理

axios 的本质其实对 xhr 的一些封装，axios 使其变得更加的好用了。

1. [XMLHttpRequest](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest)
2. [http](https://nodejs.org/api/http.html)

详情请见：https://github.com/axios/axios/blob/master/lib/axios.js
