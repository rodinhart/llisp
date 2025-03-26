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

const pretty = (x) => {
  const dispatch = {
    Null: () => `()`,

    Array: () => {
      const r = []
      while (x) {
        r.push(pretty(x[0]))
        x = x[1]
      }

      return `(${r.join(" ")})`
    },

    String: () => JSON.stringify(x),

    Symbol: () => Symbol.keyFor(x),

    Number: () => String(x),
  }

  return dispatch[x?.constructor?.name ?? "Null"]()
}

const format = (s) => {
  let indent = 0
  const result = []
  for (let line of s.replace(/\r/g, "").split(/\n+/)) {
    line = line.trim()
    if (!line) {
      continue
    }

    if (line.startsWith(";;")) {
      result.push("")
    }

    result.push(
      "  ".repeat(
        indent - (line === ")" || line === "else" || line === "end" ? 1 : 0)
      ) + line
    )
    indent =
      indent +
      (line.match(/\(/g)?.length ?? 0) -
      (line.match(/\)/g)?.length ?? 0) +
      line.startsWith("if") -
      line.endsWith("end")
  }

  return result.join("\n")
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

        [Symbol.for("if")]: () =>
          args.reduce((r, x) => r.union(listFreeVars(x, bound)), new Set()),

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

        [Symbol.for("quote")]: () => {
          const arg = args[0]
          const dispatch = {
            Array: () =>
              arg[0] === Symbol.for("unquote")
                ? listFreeVars(arg[1][0], bound)
                : listToArray(arg).reduce(
                    (r, expr) =>
                      new Set([
                        ...r,
                        ...(Array.isArray(expr) &&
                        expr[0] === Symbol.for("unquote-splice")
                          ? listFreeVars(expr[1][0], bound)
                          : listFreeVars(
                              [Symbol.for("quote"), [expr, null]],
                              bound
                            )),
                      ]),
                    new Set()
                  ),

            String: () => new Set(),

            Null: () => new Set(),

            Symbol: () => new Set(),

            Number: () => new Set(),
          }

          const t = arg?.constructor?.name ?? "Null"
          if (!dispatch[t]) {
            throw new Error(`Unknown quote dispatch on '${t}'`)
          }

          return dispatch[t]()
        },
      }

      return (
        typeof op === "symbol" ? dispatch[op] ?? dispatch._ : dispatch._
      )()
    },

    Null: () => new Set(),

    String: () => new Set(),
  }[expr?.constructor?.name ?? "Null"]())

// Compile to create variable bindings.
// Used by fn and let.
const createBindings = (names, args) =>
  cl`
    ;; create new bindings
${names.reduce(
  (r, name, i) => cl`
  ${r}
    ${args[i]}
    global.set $tmp
    local.get $env
    global.get $tmp
  ${
    !Array.isArray(name)
      ? cl`
    ;; bind value to symbol
    call $cons ;; add value
    i32.const ${symbolIndex(name)} ;; '${Symbol.keyFor(name)}'
    call $symbol
    call $cons ;; add key
  `
      : cl`
    ;; decon and bind to two symbols
    call $decon
    global.set $tmp ;; stash cdr
    call $cons ;; add car
    i32.const ${symbolIndex(name[0])} ;; '${Symbol.keyFor(name[0])}'
    call $cons ;; add key
    global.get $tmp
    call $cons ;; add cdr
    i32.const ${symbolIndex(name[1])} ;; '${Symbol.keyFor(name[1])}'
    call $cons ;; add key
  `
  }

    local.set $env
  `,
  cl``
)}
`

const coreSymbols = new Set([Symbol.for("cons")])

const symbolIndices = new Map([...coreSymbols].map((sym, i) => [sym, i + 1]))
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
let fnCnt = 1
const compile = (expr, nonLinear) =>
  ({
    Number: () => cl`
    i32.const ${expr}
    call $number
    `,
    Array: () => {
      const [op, ...args] = listToArray(expr)

      const dispatch = {
        [Symbol.for("cons")]: () => cl`
        ${compile(args[1])}
        ${compile(args[0])}
        call $cons
        `,

        // (f x y)
        _: () => {
          const compiledArgs = [...args]
            .reverse()
            .reduce((r, arg) => cl`${r}${compile(arg)}call $cons\n`, cl``)

          return cl`
          ;; build args list
          i32.const 0
          ${compiledArgs}
          ;; evaluate operator
          ${compile(op)}
          global.set $tmp
          global.get $tmp ;; get env from closure
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
          i32.const ${symbolIndex(args[0])} ;; '${Symbol.keyFor(args[0])}'
          call $symbol
          call $cons
          local.set $env
          i32.const 0
          `
        },

        // (defn f (x y) x)
        [Symbol.for("defn")]: () => {
          const [name, params, body] = args

          return cl`
          ;; dummy def
          ${compile(read(`(def ${Symbol.keyFor(name)} (fn () ()))`))}
          drop ;; forget result

          ;; get ref to dummy function
          local.get $env
          call $cdr
          call $car
          global.set $tmp

          ;; get ref to dummy env
          global.get $tmp ;; ref to env
          i32.const 8
          i32.add
          ;; get ref to dummy ix
          global.get $tmp
          i32.const 4
          i32.add


          ;; full def
          ${compile([
            Symbol.for("def"),
            [args[0], [[Symbol.for("fn"), [params, [body, null]]], null]],
          ])}
          drop
          
          ;; remove and destroy symbol
          local.get $env
          call $decon
          local.set $env
          call $destroy
          drop

          ;; remove val
          local.get $env
          call $decon
          local.set $env
          call $decon ;; ix and captured env
          global.set $tmp ;; park captured env
          i32.store ;; store ix
          global.get $tmp ;; store captured env
          i32.store

          i32.const 0 ;; return nil
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
            values.map((value) => compile(value))
          )}

          ${compile(body)}
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

          const func = cg`
          ;; ${pretty(expr)}
          (func $${name} (param $args i32) (param $env i32) (result i32)
            (local $prevEnv i32)

            local.get $env
            local.set $prevEnv

            ${createBindings(
              listToArray(args[0]),
              listToArray(args[0]).map(
                () => cl`
              ;; assert argument
              local.get $args
              i32.eqz
              if
                i32.const 2
                call $err
              end

              ;; get arg
              local.get $args
              call $decon
              local.set $args
              `
              )
            )}

            ;; function body
            ${compile(args[1])}

            ;; destroy unused bindings
            (loop $loop
              local.get $env
              local.get $prevEnv
              i32.ne
              if
                local.get $env
                call $decon
                call $decon
                local.set $env
                call $destroy
                drop
                call $destroy
                drop

                br $loop
              end
            )
          )
          (elem (i32.const ${fnIndex}) $${name})
          `

          const freeVars = [...listFreeVars(expr, coreSymbols)]

          return cl`
          ${func}
          ;; capture env
          i32.const 0
          ${freeVars.reduce(
            (r, v) => cl`
            ${r}
            ${compile(v, true)}
            call $cons
            i32.const ${symbolIndex(v)} ;; '${Symbol.keyFor(v)}'
            call $symbol
            call $cons
            `,
            cl``
          )}

          ;; function index
          i32.const ${fnIndex}
          call $function
          `
        },

        [Symbol.for("quote")]: () => {
          const arg = args[0]
          const dispatch = {
            Number: () => compile(arg),

            Symbol: () => cl`
            i32.const ${symbolIndex(arg)} ;; ${Symbol.keyFor(arg)}
            call $symbol
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

    Symbol: () => cl`
    ;; resolve '${Symbol.keyFor(expr)}'
    i32.const ${symbolIndex(expr)}
    local.get $env
    call $get
    `,

    Null: () => cl`
      i32.const 0
      `,

    String: () => cl`
      i32.const ${stringIndex(expr)} ;; ${expr}
      call $string
      `,
  }[expr?.constructor?.name ?? "Null"](expr))

;(async () => {
  // Read source file.
  const text = await fetch("./main.clj").then((res) => res.text())
  const source = read(`(
    ${text}
    )`)

  // expose core functions
  const coreFns = ["+", "=", "list"]
  const core = cl`
  i32.const 0
  ${coreFns.reduce((r, op) => {
    const ix = fnCnt++

    return cl`
    ${r}
    ${cg`
    (elem (i32.const ${ix}) $${op})
    `}
    i32.const 0
    i32.const ${ix}
    call $function
    call $cons
    i32.const ${symbolIndex(Symbol.for(op))} ;; '${op}'
    call $symbol
    call $cons
    `
  }, cl``)}
  local.set $env
  `

  // Compile lisp.
  const compiled = listToArray(source).reduce(
    (r, expr, i, arr) =>
      cl`${r}${compile(expr)}${i + 1 < arr.length ? "drop\n\n" : ""}`,
    core
  )

  // Resolve wat template.
  const native = (await fetch("./native.wat").then((res) => res.text()))
    .replace(/\$CONS/g, "1")
    .replace(/\$NUMBER/g, "2")
    .replace(/\$SYMBOL/g, "3")
    .replace(/\$STRING/g, "4")
    .replace(/\$FUNCTION/g, "5")
  const wat = native
    .replace(/;; cl<-/, compiled.local)
    .replace(/;; cg<-/, compiled.global)
  // console.log(format(wat))

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
  const len = 1 + 4 * heapSize
  for (let i = 2; i < len; i += 4) {
    // mem[i - 1] = 99
    mem[i + 1] = i + 3 < len ? 4 * (i + 3) : 0
  }

  const count = (ptr) => {
    let cnt = 0
    let cur = ptr
    while (cur && cnt < 10000) {
      cnt++
      cur = mem[cur / 4 + 2]
    }

    return cnt
  }

  // Instantiate wasm module.
  const frees = []
  let timer
  const W = 1500
  const { instance } = await WebAssembly.instantiate(bytes.buffer, {
    js: {
      heap,

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

      monitor: () => {
        frees.push(count(mem[0]))
        if (timer === undefined) {
          timer = setTimeout(() => {
            let points = frees
            while (points.length > W) {
              points = points.reduce((r, x, i) => {
                if (i % 2 === 1) {
                  r.push((points[i - 1] + x) / 2)
                }

                return r
              }, [])
            }

            document.getElementById("monitor").innerHTML = jsonmlToXml([
              "svg",
              { xmlns: "http://www.w3.org/2000/svg", width: W, height: 100 },
              [
                "rect",
                {
                  x: 0,
                  y: 0,
                  width: W,
                  height: 100,
                  fill: "#dddddd",
                },
              ],
              ...points.slice(-W).map((cnt, x) => [
                "line",
                {
                  x1: x,
                  x2: x,
                  y1: 100,
                  y2: 100 * (1 - cnt / heapSize),
                  stroke: "green",
                },
              ]),
            ])

            console.log(
              "max used: ",
              heapSize -
                frees.reduce((r, x) => (r === null || x < r ? x : r), null)
            )

            timer = undefined
          }, 100)
        }
      },

      err: (errno) => {
        switch (errno) {
          case 0:
            throw new Error(`Llisp out of memory`)

          case 1:
            throw new Error(`Cannot decon nil`)

          case 2:
            throw new Error(`Expected more args`)

          case 4:
            throw new Error(`Unused bindings in function body`)
        }
      },

      prn: (ptr) => {
        console.log("prn: ", prn(ptr, true))
      },
    },
  })
  const { destroy, main } = instance.exports

  const prn = (ptr) => {
    if (ptr === 0) {
      return "()"
    }

    switch (mem[ptr / 4]) {
      // list
      case 1: {
        const r = []
        while (ptr !== 0 && r.length < 100) {
          r.push(prn(mem[ptr / 4 + 1]))
          const t = mem[ptr / 4 + 2]
          destroy(ptr)
          ptr = t
        }

        return `(${r.join(" ")})`
      }

      // number
      case 2: {
        const n = mem[ptr / 4 + 1]
        destroy(ptr)

        return String(n)
      }

      // symbol
      case 3: {
        const s = mem[ptr / 4 + 1]
        destroy(ptr)

        return Symbol.keyFor(invert(symbolIndices).get(s))
      }

      // string
      case 4: {
        const s = mem[ptr / 4 + 1]
        destroy(ptr)

        return JSON.stringify(invert(stringIndices).get(s))
      }

      // function
      case 5: {
        let env = mem[ptr / 4 + 2]
        destroy(ptr)
        while (env) {
          destroy(mem[env / 4 + 1]) // destroy symbol
          let t = mem[env / 4 + 2]
          destroy(env)
          env = t
          t = mem[env / 4 + 2]
          destroy(env)
          env = t
        }

        return `[fn]`
      }
    }

    throw new Error(`Unknown type ${mem[ptr / 4]}`)
  }

  // Call main function.
  let result = main()
  console.log("result:", prn(result))

  // console.log(mem)
  const cnt = count(mem[0])
  console.log("used:", heapSize - cnt, "free:", cnt)
})()
