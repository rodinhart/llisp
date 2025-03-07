// JsonML to XML
const jsonmlToXml = (n) => {
  if (!Array.isArray(n)) {
    return String(n)
  }

  const [tag, props, ...children] = n

  return `<${tag}${Object.entries(props)
    .map(([key, val]) => ` ${key}="${val}"`)
    .join("")}>${children.map(jsonmlToXml).join("\n")}</${tag}>`
}

// Compile for local inclusion.
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

// Compile for global inclusion.
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

// The reader.
const read = (s) => {
  let i = 0

  const ws = () => {
    while (i < s.length && s.charCodeAt(i) <= 32) {
      i++
    }

    if (s[i] === ";") {
      i++
      while (i < s.length && s[i] !== "\n") {
        i++
      }

      ws()
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

    if (s[i] === "'") {
      i++

      return [Symbol.for("quote"), [exp(), null]]
    }

    if (s[i] === "~") {
      i++

      if (s[i] === "@") {
        i++

        return [Symbol.for("unquote-splice"), [exp(), null]]
      }

      return [Symbol.for("unquote"), [exp(), null]]
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

// Linked list to array
const listToArray = (x) => {
  const r = []
  while (x) {
    r.push(x[0])
    x = x[1]
  }

  return r
}

// [a, b, c, d] -> [[a, b], [c, d]]
const pairUp = (xs) =>
  xs.reduce((r, x, i) => {
    if (i % 2 === 1) {
      r.push([xs[i - 1], x])
    }

    return r
  }, [])

// Return set of free variables in given expression.
// The only way to create bound vars is using fn or let.
const listFreeVars = (expr, bound) =>
  ({
    Number: () => new Set(),
    Symbol: () => (bound.has(expr) ? new Set() : new Set([expr])),
    Array: () => {
      const [op, ...args] = listToArray(expr)

      const dispatch = {
        _: () =>
          listToArray(expr).reduce(
            (r, x) => r.union(listFreeVars(x, bound)),
            new Set()
          ),

        [Symbol.for("fn")]: () =>
          listFreeVars(
            args[1],
            bound.union(
              new Set(
                listToArray(args[0]).flatMap((arg) =>
                  Array.isArray(arg) ? arg : [arg]
                )
              )
            )
          ),

        // (let ((a . b) c) (cons b a))
        [Symbol.for("let")]: () => {
          const [vars, newBound] = pairUp(listToArray(args[0])).reduce(
            ([vars, bound], [name, expr]) => [
              new Set([...vars, ...listFreeVars(expr, bound)]),
              bound.union(new Set(Array.isArray(name) ? name : [name])),
            ],
            [[], bound]
          )

          return new Set([...vars, ...listFreeVars(args[1], newBound)])
        },

        [Symbol.for("quote")]: () => new Set(),
      }

      return (
        typeof op === "symbol" ? dispatch[op] ?? dispatch._ : dispatch._
      )()
    },

    Null: () => new Set(),
  }[expr?.constructor?.name ?? "Null"]())

// Compile to create variable bindings.
// Used by fn and let.
const createBindings = (names, args, sequential) =>
  cl`
;; create new bindings
local.get $env
${names.reduce(
  (r, name, i) => cl`
  ${r}
  ;; get value
  ${args[i]}

  ${
    !Array.isArray(name)
      ? cl`
  call $cons ;; add value
  i32.const ${symbolIndex(name)} ;; ${Symbol.keyFor(name)}
  call $cons ;; add key
  `
      : cl`
  call $decon
  global.set $tmp ;; stash cdr
  call $cons ;; add car
  i32.const ${symbolIndex(name[0])} ;; ${Symbol.keyFor(name[0])}
  call $cons ;; add key
  global.get $tmp
  call $cons ;; add cdr
  i32.const ${symbolIndex(name[1])} ;; ${Symbol.keyFor(name[1])}
  call $cons ;; add key
  `
  }
  ${
    sequential
      ? cl`
  local.set $env
  local.get $env
  `
      : cl``
  }
  `,
  cl``
)}
local.set $env
`

// Destroy bindings at the end of fn or let.
// Note this destroys the binding, but not the bound value.
const destroyBindings = (names) => cl`
;; destroy bindings
local.get $env
${names.reduce(
  (r) => cl`
  ${r}
  call $destroy
  call $destroy
  `,
  cl``
)}
local.set $env
`

const symbolIndices = new Map([
  [Symbol.for("+"), 1],
  [Symbol.for("cons"), 2],
  [Symbol.for("list"), 3],
  [Symbol.for("<"), 4],
  [Symbol.for("car"), 5],
  [Symbol.for("cdr"), 6],
  [Symbol.for("*"), 7],
])
const symbolIndex = (s) => {
  if (!symbolIndices.has(s)) {
    symbolIndices.set(s, symbolIndices.size + 1)
  }

  return symbolIndices.get(s)
}

const stringIndices = new Map()
const stringIndex = (s) => {
  if (!stringIndices.has(s)) {
    stringIndices.set(s, stringIndices.size + 1)
  }

  return stringIndices.get(s)
}

const invert = (m) => new Map([...m].map(([k, v]) => [v, k]))

// Main compiler.
let fnCnt = 2
const compile = (expr) =>
  ({
    Number: () => cl`i32.const ${expr}\n`,
    Array: () => {
      const [op, ...args] = listToArray(expr)

      const dispatch = {
        [Symbol.for("+")]: () => cl`
        ${compile(args[0])}
        ${compile(args[1])}
        i32.add
        `,

        [Symbol.for("cons")]: () => cl`
        ${compile(args[1])}
        ${compile(args[0])}
        call $cons
        `,

        [Symbol.for("list")]: () => cl`
        i32.const 0
        ${[...args].reverse().reduce(
          (r, arg) => cl`
          ${r}
          ${compile(arg)}
          call $cons
          `,
          cl``
        )}
        `,

        [Symbol.for("<")]: () => cl`
        ${compile(args[0])}
        ${compile(args[1])}
        i32.lt_s
        `,

        [Symbol.for("car")]: () => cl`
        ${compile(args[0])}
        call $car
        `,

        [Symbol.for("cdr")]: () => cl`
        ${compile(args[0])}
        call $cdr
        `,

        [Symbol.for("*")]: () => cl`
        ${compile(args[0])}
        ${compile(args[1])}
        i32.mul
        `,

        // (f x y)
        _: () => {
          const compiledArgs = [...args]
            .reverse()
            .reduce((r, arg) => cl`${r}${compile(arg)}call $cons\n`, cl``)

          return cl`
          i32.const 0 ;; build args list
          ${compiledArgs}
          ;; evaluate operator
          ${compile(op)}
          global.set $tmp
          global.get $tmp ;; get env
          call $cdr
          global.get $tmp ;; get function index
          call $car
          call_indirect (type $fntype)
          `
        },

        // (def x 10)
        [Symbol.for("def")]: () => {
          return cl`
          local.get $env
          ${compile(args[1])}
          call $cons
          i32.const ${symbolIndex(args[0])}
          call $cons
          local.set $env
          i32.const ${symbolIndex(args[0])}
          `
        },

        // (defn f (x y) x)
        [Symbol.for("defn")]: () => {
          const [name, params, body] = args

          return cl`
          ;; empty def
          ${compile(read(`(def ${Symbol.keyFor(name)} (cons 0 0))`))}
          local.get $env ;; get ref
          call $get
          global.set $tmp2

          ;; full def
          ${compile([
            Symbol.for("def"),
            [args[0], [[Symbol.for("fn"), [params, [body, null]]], null]],
          ])}
          
          ;; recurse def
          global.get $tmp2 ;; ref to cdr
          i32.const 4
          i32.add
          global.get $tmp2 ;; ref to car

          local.get $env
          call $destroy ;; destroy key
          call $decon ;; val
          local.set $env

          call $decon ;; ix and captured env
          global.set $tmp ;; store ix
          i32.store
          global.get $tmp ;; store captured env
          i32.store
          `
        },

        // (let ((a . b) x) a + b)
        [Symbol.for("let")]: () => {
          const pairs = listToArray(args[0])
          const targets = pairs.filter((_, i) => i % 2 === 0)
          const values = pairs.filter((_, i) => i % 2 === 1)
          const body = args[1]

          return cl`
          ${createBindings(
            targets,
            values.map((value) => compile(value)),
            true
          )}

          ${compile(body)}

          ${destroyBindings(
            targets.flatMap((target) =>
              Array.isArray(target) ? target : [target]
            )
          )}
          `
        },

        // (if p c a)
        [Symbol.for("if")]: () => {
          const [p, c, a] = args

          return cl`
          ${compile(p)}
          i32.eqz
          if (result i32)
            ${compile(a)}
          else
            ${compile(c)}
          end
          `
        },

        // (fn (x) (* x x))
        [Symbol.for("fn")]: () => {
          const fnIndex = fnCnt++
          const name = Math.random().toString(36).slice(2)
          const flatNames = listToArray(args[0]).flatMap((arg) =>
            Array.isArray(arg) ? arg : [arg]
          )

          const func = cg`
          (func $${name} (param $args i32) (param $env i32) (result i32)
            ${createBindings(
              listToArray(args[0]),
              listToArray(args[0]).map(
                () => cl`
              local.get $args
              call $decon
              local.set $args
              `
              )
            )}

            ;; function body
            ${compile(args[1])}

            ${destroyBindings(flatNames)}
          )
          (elem (i32.const ${fnIndex}) $${name})
          `

          const freeVars = [
            ...listFreeVars(
              expr,
              new Set([
                Symbol.for("if"),
                Symbol.for("+"),
                Symbol.for("cons"),
                Symbol.for("list"),
                Symbol.for("<"),
                Symbol.for("car"),
                Symbol.for("cdr"),
                Symbol.for("*"),
              ])
            ),
          ]

          return cl`
          ${func}
          ;; capture env
          i32.const 0
          ${freeVars.reduce(
            (r, v) => cl`
            ${r}
            ${compile(v)}
            call $cons
            i32.const ${symbolIndex(v)}
            call $cons
            `,
            cl``
          )}

          i32.const ${fnIndex} 
          call $cons
          `
        },

        [Symbol.for("quote")]: () => {
          const arg = args[0]
          const dispatch = {
            Number: () => compile(arg),

            Symbol: () => cl`
            i32.const ${symbolIndex(arg)} ;; ${Symbol.keyFor(arg)}
            `,

            Array: () =>
              arg[0] === Symbol.for("unquote")
                ? compile(arg[1][0])
                : cl`
            i32.const 0
            ${[...listToArray(arg)].reverse().reduce(
              (r, x) => cl`
              ${r}
              ${
                Array.isArray(x) && x[0] === Symbol.for("unquote-splice")
                  ? cl`
                drop
                ${compile(x[1][0])}
                `
                  : cl`
                ${compile([Symbol.for("quote"), [x, null]])}
                call $cons
                  `
              }
              `,
              cl``
            )}
            `,

            Null: () => compile(arg),

            String: () => compile(arg),
          }

          return dispatch[arg?.constructor?.name ?? "Null"]()
        },
      }

      return (
        typeof op === "symbol" ? dispatch[op] ?? dispatch._ : dispatch._
      )()
    },

    Symbol: () =>
      cl`
      i32.const ${symbolIndex(expr)} ;; ${Symbol.keyFor(expr)}
      local.get $env
      call $get
      `,

    Null: () => cl`
      i32.const 0
      `,

    String: () => cl`
      i32.const ${stringIndex(expr)} ;; ${expr}
      `,
  }[expr?.constructor?.name ?? "Null"](expr))

;(async () => {
  // Read source file.
  const text = await fetch("./main.clj").then((res) => res.text())
  const source = read(`(
    ${text}
    )`)

  // Compile lisp.
  const compiled = listToArray(source).reduce(
    (r, expr, i, arr) =>
      cl`${r}${compile(expr)}${i + 1 < arr.length ? "drop\n\n" : ""}`,
    cl``
  )

  // Resolve wat template.
  const native = await fetch("./native.wat").then((res) => res.text())
  const wat = native
    .replace(/;; cl<-/, compiled.local)
    .replace(/;; cg<-/, compiled.global)
  // console.log(wat)

  // Load resulting wasm module.
  const wabt = await WabtModule()
  const module = wabt.parseWat("compiled.wat", wat)
  const bytes = module.toBinary({})

  // Prepare heap.
  const heap = new WebAssembly.Memory({
    initial: 1,
  })
  const heapSize = 320
  const mem = new Uint32Array(heap.buffer)
  mem[0] = 4 // free pointer
  const len = 1 + 2 * heapSize
  for (let i = 2; i < len; i += 2) {
    mem[i - 1] = 99
    mem[i] = i + 1 < len ? 4 * (i + 1) : 0
  }

  // Instantiate wasm module.
  const { instance } = await WebAssembly.instantiate(bytes.buffer, {
    js: {
      heap,
      oem: () => {
        throw new Error("Llisp out of memory")
      },
      unknownSymbol: (index) => {
        throw new Error(
          `Unknown symbol ${Symbol.keyFor(
            [...symbolIndices].filter(([k, v]) => v === index)[0][0]
          )}`
        )
      },
      log: (s) => {
        console.log("log:", s)

        return s
      },
    },
  })
  const { destroy, main } = instance.exports

  // Call main function.
  let result = main()
  console.log("result:", result)

  // Print result as list.
  if (false) {
    const lst = []
    while (result !== 0 && lst.length < 100) {
      lst.push(mem[result / 4])
      result = destroy(result)
    }

    console.log("lst:", `(${lst.join(" ")})`)
  } else if (true) {
    let ptr = result
    const _ = () => {
      const deconString = () => {
        const r = invert(stringIndices).get(mem[ptr / 4])
        ptr = destroy(ptr)

        return r
      }

      const deconInt = () => {
        const r = mem[ptr / 4]
        ptr = destroy(ptr)

        return r
      }

      const deconProps = () => {
        const tmp = deconInt()
        const prev = ptr
        ptr = tmp
        const props = {}
        while (ptr) {
          const key = deconString()
          props[key] = ["x", "y"].includes(key) ? deconInt() : deconString()
        }

        ptr = prev

        return props
      }

      if (ptr === 0) {
        return null
      }

      const tag = deconString()
      switch (tag) {
        case "text":
          return [tag, deconProps(), deconString()]

        case "g": {
          const props = deconProps()
          const children = []
          while (ptr) {
            const tmp = deconInt()
            const prev = ptr
            ptr = tmp
            children.push(_())
            ptr = prev
          }

          return ["g", props, ...children]
        }

        default:
          throw new Error(`Unknown tag '${tag}'`)
      }
    }

    const svg = jsonmlToXml([
      "svg",
      { xmlns: "http://www.w3.org/2000/svg", width: 500, height: 300 },
      _(),
    ])
    console.log(svg)
    document.body.innerHTML = svg
  }

  // Count free memory.
  // console.log(mem)
  let cnt = 0
  let cur = mem[0] / 4
  while (cur) {
    cnt++
    cur = mem[cur + 1] / 4
  }

  console.log("used:", heapSize - cnt, "free:", cnt)
})()
