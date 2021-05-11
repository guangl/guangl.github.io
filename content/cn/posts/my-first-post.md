---
title: "Hello World"
date: 2021-05-09
categories: ['Talk']
draft: false
---

```jsx
function main() {
  const [ msg ] = useState("Hello World")

  return (
    <div>
      { msg }
    </div>
  )
}

main()
```