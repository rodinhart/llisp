## todo

- $free to take type into account
- & definitely violates if not value
  - need types!
- conservation of ref
  - conform: cons
  - violate: $get, (look for more)
- ability to destroy closures

  - current destroy of closure assumes no free vars
  - note: captures vars only captures ref in env, value is actually shared!

  ## axioms

- need boolean type
- always consume
  - what about fn env?
- when resolving symbol
  - if possible, copy value and leave symbol
  - otherwise remove symbol
- clean up unused symbols when closing scope
- only one owner means can mutate
- def should probably return nil, otherwise result is memory leak

## rust

- **owner** (default) by consuming
- **borrow** done by returning borrowed value using multiple returns
- **shared** arc?

## memory usage

| type   |  usage (units)   | notes                        |
| ------ | :--------------: | ---------------------------- |
| cons   |        1         |                              |
| number |        1         |                              |
| fn     | 1 + free var def |                              |
| def    |        3         | symbol + cons + cons         |
| _base_ |        4N        | N = number of core functions |

## Motivations

### Recursion

```clj
(defn sum (n)
  (if (= n 0)
    0
    (+ 1 (sum (+ n -1)))))
```

Functions should just be referenced (not copied) to allow for recursion. Closures however should be consumed for `(map (fn ...) lst)` not to leak memory.

Even if `n` is destroyed automatically at the end of the function body, a stack of function bindings is created, this using space.
