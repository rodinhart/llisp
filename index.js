const cl = (strings, ...exprs) => {
  const r = {
    local: "",
    global: "",
  }

  for (let i = 0; i < strings.length; i++) {
    r.local += strings[i]
    if (i < exprs.length) {
      const expr = exprs[i]
      if (typeof expr?.local === "string" && typeof expr?.global === "string") {
        r.local += expr.local
        r.global += expr.global
      } else {
        r.local += exprs[i]
      }
    }
  }

  return r
}

const cg = (strings, ...exprs) => {
  const r = {
    local: "",
    global: "",
  }

  for (let i = 0; i < strings.length; i++) {
    r.global += strings[i]
    if (i < exprs.length) {
      const expr = exprs[i]
      if (typeof expr?.local === "string" && typeof expr?.global === "string") {
        r.global += expr.local
        r.global = expr.global + r.global
      } else {
        r.global += exprs[i]
      }
    }
  }

  return r
}

const read = (s) => {
  let i = 0

  const ws = () => {
    while (i < s.length && s.charCodeAt(i) <= 32) {
      i++
    }
  }

  const exp = () => {
    ws()

    if (i >= s.length) {
      throw new Error(`Expected expression but found EOF`)
    }

    if (s[i] === "(") {
      i++
      const r = [null, null]
      let c = r
      ws()
      while (i < s.length && s[i] !== ")" && s[i] !== ".") {
        c[1] = [exp(), null]
        c = c[1]
        ws()
      }

      if (s[i] === ".") {
        i++
        ws()
        c[1] = exp()
      }

      if (s[i++] !== ")") {
        throw new Error(`Expected closing ) but found ${s[i - 1] ?? "EOF"}`)
      }

      return r[1]
    }

    if (s[i] === '"') {
      i++
      let r = ""
      while (i < s.length && s[i] !== '"') {
        r += s[i++]
      }

      if (s[i++] !== '"') {
        throw new Error(`Expected closing " but found ${s[i - 1] ?? "EOF"}`)
      }

      return r
    }

    {
      let r = ""
      while (
        i < s.length &&
        s.charCodeAt(i) > 32 &&
        s[i] !== "(" &&
        s[i] !== ")" &&
        s[i] !== "."
      ) {
        r += s[i++]
      }

      return String(Number(r)) === r ? Number(r) : Symbol.for(r)
    }
  }

  return exp()
}

const toArray = (x) => {
  const r = []
  while (x) {
    r.push(x[0])
    x = x[1]
  }

  return r
}

const symbols = new Map()
const compile = (expr) =>
  ({
    Number: () => cl`i32.const ${expr}\n`,
    Array: () => {
      const [op, ...args] = toArray(expr)

      const dispatch = {
        // (f x y)
        _: () => {
          const compiledArgs = args
            .reverse()
            .reduce((r, arg) => cl`${r}${compile(arg)}call $cons\n`, cl``)

          return cl`i32.const 0\n${compiledArgs}local.get $env\n${compile(
            op
          )}call_indirect (type $fntype)\n`
        },

        // (fn (x) (* x x))
        [Symbol.for("fn")]: () => {
          const func = cg`(func $tmp (param $args i32) (param $env i32) (result i32)
            i32.const 1000
          )
          (elem (i32.const 17) $tmp)`

          return cl`${func}i32.const 17\n`

          return cl`${cg`(func $tmp ${toArray(args[0])
            .map((arg) => `(param $${Symbol.keyFor(arg)} i32) `)
            .join("")}(result i32)
        ${compile(args[1])}
        )`}i32.const 11\n`
        },
      }

      return (
        typeof op === "symbol" ? dispatch[op] ?? dispatch._ : dispatch._
      )()
    },

    Symbol: () =>
      cl`i32.const ${Symbol.keyFor(expr).charCodeAt(
        0
      )}\nlocal.get $env\ncall $get\n`,
  }[expr?.constructor?.name](expr))

;(async () => {
  const text = await fetch("./main.clj").then((res) => res.text())
  const source = read(`(${text})`)

  const compiled = toArray(source).reduce(
    (r, expr, i, arr) =>
      cl`${r}${compile(expr)}${i + 1 < arr.length ? "drop\n\n" : ""}`,
    cl``
  )

  const native = await fetch("./native.wat").then((res) => res.text())
  const wat = native
    .replace(/;; cl<-/, compiled.local)
    .replace(/;; cg<-/, compiled.global)
  console.log(wat)

  const wabt = await WabtModule()
  const module = wabt.parseWat("compiled.wat", wat)
  const bytes = module.toBinary({})

  const heap = new WebAssembly.Memory({
    initial: 1,
  })
  const mem = new Uint32Array(heap.buffer)
  const len = 1 + 2 * 5
  for (let i = 2; i < len; i += 2) {
    mem[i - 1] = 99
    mem[i] = i + 1 < len ? 4 * (i + 1) : 0
  }
  const { instance } = await WebAssembly.instantiate(bytes.buffer, {
    js: {
      heap,
      oem: () => {
        throw new Error("Llisp out of memory")
      },
    },
  })
  const { main } = instance.exports

  console.log(main())
  console.log(mem)
  let cnt = 0
  let cur = mem[0] / 4
  while (cur) {
    cnt++
    cur = mem[cur + 1] / 4
  }

  console.log("free: ", cnt)
})()
